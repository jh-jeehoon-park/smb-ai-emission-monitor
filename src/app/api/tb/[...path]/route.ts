import type { NextRequest } from 'next/server';

/** 계측은 매 요청 상류에서 받아 온다. 캐시되면 화면이 멈춘 값을 현재 값으로 읽는다 */
export const dynamic = 'force-dynamic';

/**
 * 자격증명이 **브라우저로 가지 않는 유일한 이유**가 이 파일이다.
 *
 * `NEXT_PUBLIC_`을 붙이지 않는다 — 붙이면 번들에 실려 명세 §3이 감수한다고 적은 그 위험을
 * 우리가 자초하게 된다. 값은 `.env.local`에 두고 `.env.example`이 이름만 알린다.
 */
const BASE = process.env.TB_BASE_URL;
const USERNAME = process.env.TB_USERNAME;
const PASSWORD = process.env.TB_PASSWORD;

/** 만료 5분 전에 미리 갱신한다. 401을 받고 갱신하면 그 요청 한 건은 이미 실패했다(명세 §3.1) */
const REFRESH_MARGIN_MS = 5 * 60_000;

/**
 * 지나가게 할 상류 경로.
 *
 * 이 통로는 요청에 테넌트 자격증명을 붙여 준다. 무엇이든 통과시키면 개발 서버에 닿는 누구나
 * ThingsBoard 테넌트 전체를 쓰게 된다 — 명세 §4.1이 세는 여덟 중 조회 다섯만 연다.
 */
const ALLOWED_PATHS = [
  /^tenant\/devices$/,
  /^entitiesQuery\/find$/,
  /^plugins\/telemetry\/DEVICE\/[0-9a-fA-F-]{36}\/values\/timeseries$/,
  /^plugins\/telemetry\/DEVICE\/[0-9a-fA-F-]{36}\/values\/attributes\/SERVER_SCOPE$/,
  /^plugins\/telemetry\/DEVICE\/[0-9a-fA-F-]{36}\/keys\/timeseries$/,
];

interface Session {
  token: string;
  refreshToken: string;
  expiresAtMs: number;
}

let session: Session | null = null;
/** 동시 요청이 저마다 로그인하지 않게 한 번만 진행시킨다 */
let pending: Promise<Session> | null = null;

/** 서명은 검증하지 않는다 — 브라우저도 서버도 할 일이 아니고, 우리가 쓸 것은 만료 시각뿐이다 */
function expiryOf(token: string): number {
  const payload = token.split('.')[1];
  if (!payload) return 0;

  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { exp?: number };
    return typeof exp === 'number' ? exp * 1000 : 0;
  } catch {
    return 0;
  }
}

async function authenticate(path: string, body: unknown): Promise<Session> {
  const res = await fetch(`${BASE}/api/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`auth/${path} ${res.status}`);

  const { token, refreshToken } = (await res.json()) as { token: string; refreshToken: string };
  return { token, refreshToken, expiresAtMs: expiryOf(token) };
}

const logIn = () => authenticate('login', { username: USERNAME, password: PASSWORD });

/**
 * `refreshToken`까지 죽었으면 재로그인한다. 명세 §3.1이 정한 순서이고, 401 본문으로는
 * 만료와 잘못된 자격증명을 가를 수 없어(둘 다 `errorCode: 10`) 응답이 아니라 순서로 판단한다.
 */
async function renew(current: Session): Promise<Session> {
  try {
    return await authenticate('token', { refreshToken: current.refreshToken });
  } catch {
    return logIn();
  }
}

function freshEnough(current: Session | null): current is Session {
  return current !== null && Date.now() < current.expiresAtMs - REFRESH_MARGIN_MS;
}

async function ensureSession(force = false): Promise<Session> {
  if (!force && freshEnough(session)) return session;
  if (pending) return pending;

  const current = session;
  pending = (current ? renew(current) : logIn())
    .then((next) => {
      session = next;
      return next;
    })
    .finally(() => {
      pending = null;
    });

  return pending;
}

function fail(status: number, failure: string, message: string) {
  return Response.json({ failure, message }, { status });
}

/**
 * 상류로 넘기고 응답을 그대로 돌려준다. **본문을 해석하지 않는다** — 뜻을 붙이는 일은
 * 매퍼가 하고, 여기는 자격증명과 주소만 책임진다(명세 §7.3).
 */
async function forward(request: NextRequest, upstreamPath: string): Promise<Response> {
  if (!BASE || !USERNAME || !PASSWORD) {
    return fail(503, 'unconfigured', '계측 서버 접속 정보가 없습니다 (.env.local)');
  }
  if (!ALLOWED_PATHS.some((allowed) => allowed.test(upstreamPath))) {
    return fail(403, 'badRequest', `허용하지 않는 경로입니다: ${upstreamPath}`);
  }

  const body = request.method === 'POST' ? await request.text() : undefined;
  const url = `${BASE}/api/${upstreamPath}${request.nextUrl.search}`;

  const send = async (token: string) =>
    fetch(url, {
      method: request.method,
      headers: {
        'X-Authorization': `Bearer ${token}`,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body,
      cache: 'no-store',
    });

  try {
    let upstream = await send((await ensureSession()).token);

    /* 선제 갱신을 했는데도 401이면 토큰이 서버 쪽에서 무효가 된 것이다. 한 번만 다시 받는다 */
    if (upstream.status === 401) {
      upstream = await send((await ensureSession(true)).token);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json' },
    });
  } catch (cause) {
    return fail(502, 'unreachable', `계측 서버에 닿지 못했습니다: ${String(cause)}`);
  }
}

type Context = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, ctx: Context) {
  return forward(request, (await ctx.params).path.join('/'));
}

export async function POST(request: NextRequest, ctx: Context) {
  return forward(request, (await ctx.params).path.join('/'));
}
