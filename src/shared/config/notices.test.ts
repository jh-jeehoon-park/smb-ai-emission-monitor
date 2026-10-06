import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  NOTICE_ERROR,
  NOTICE_FORBIDDEN,
  NOTICE_NOT_FOUND,
  TELEMETRY_FALLBACK_NOTICES,
  forbiddenDescription,
  unreceivedNotice,
} from './notices';

const SCREEN_NOTICES = [NOTICE_NOT_FOUND, NOTICE_ERROR];

/**
 * 안내 문구가 **계측의 어휘를 빌리지 않는지** 지킨다.
 *
 * `수신 없음`·`통신 두절`·`산출 불가`·`결측`은 전부 «계측을 받아 봤는데 없었다»는 뜻이다
 * (**E4**). 없는 주소·막힌 화면·무너진 렌더는 계측과 아무 상관이 없어, 그 말을 빌리면
 * 일어나지 않은 장애를 주장하게 된다. `telemetry-labels.test.ts`가 반대 방향에서 같은
 * 경계를 지킨다 — 그쪽은 계측 문구가 «확인된 부재»의 말을 함부로 쓰지 못하게 한다.
 */
const MEASUREMENT_WORDS = /수신 없음|통신 두절|산출 불가|결측|표본이 없습니다|미연결/;

describe('안내 문구 — 계측 어휘를 빌리지 않는다', () => {
  it('화면 안내가 계측 부재의 말을 쓰지 않는다', () => {
    for (const notice of SCREEN_NOTICES) {
      expect(notice.title, notice.code).not.toMatch(MEASUREMENT_WORDS);
      expect(notice.description, notice.code).not.toMatch(MEASUREMENT_WORDS);
    }
    expect(NOTICE_FORBIDDEN.title).not.toMatch(MEASUREMENT_WORDS);
    expect(NOTICE_FORBIDDEN.template).not.toMatch(MEASUREMENT_WORDS);
  });

  /** 화면에 근거 표기를 인쇄하지 않는다 — 2026-09-10에 전 화면에서 걷어낸 규약이다 */
  it('근거 태그를 화면에 인쇄하지 않는다', () => {
    const all = [
      ...SCREEN_NOTICES.flatMap((n) => [n.title, n.description]),
      NOTICE_FORBIDDEN.title,
      NOTICE_FORBIDDEN.template,
      ...Object.values(TELEMETRY_FALLBACK_NOTICES).map((n) => n.message),
      unreceivedNotice(3),
    ];
    for (const text of all) {
      expect(text).not.toMatch(/\[(TBD|INC|원문|PROVISIONAL|설계|사용자|회의)/);
    }
  });
});

describe('계측 폴백 문구', () => {
  /**
   * **`errors.ts`가 내건 약속을 값으로 잠근다** — *"실패의 종류. 화면이 각각 다르게 보여야
   * 한다"*. 한때 화면은 `unconfigured` 하나만 따로 대우하고 나머지 넷을 한 문구로 뭉쳤다.
   */
  it('네 실패가 서로 다른 말을 한다', () => {
    const messages = Object.values(TELEMETRY_FALLBACK_NOTICES).map((n) => n.message);
    expect(messages).toHaveLength(4);
    expect(new Set(messages).size).toBe(4);
  });

  /**
   * **`unconfigured`는 표에 없어야 한다.** 접속 정보를 두지 않은 것은 오류가 아니라 폴백
   * 신호이고, 여기 들어오는 순간 띠가 상시로 떠 **진짜 두절이 그 안에 묻힌다** — 사내망
   * 주소로 돌아온 지금 배포본은 늘 이 상태다.
   */
  it('접속 정보 없음은 띠를 띄우지 않는다', () => {
    expect(Object.keys(TELEMETRY_FALLBACK_NOTICES)).not.toContain('unconfigured');
  });

  /**
   * 다시 눌러도 같은 답이 오는 실패에는 버튼을 두지 않는다 — **거짓 희망을 파는 것**이고
   * 그것도 E4가 막는 거짓말의 한 종류다. `notFound`는 장비 등록부 캐시가 세션 동안 비지
   * 않아서, `badRequest`는 우리 코드 버그라서 그렇다.
   */
  it('다시 눌러도 같은 답이 오는 둘에는 버튼이 없다', () => {
    expect(TELEMETRY_FALLBACK_NOTICES.notFound.retry).toBe(false);
    expect(TELEMETRY_FALLBACK_NOTICES.badRequest.retry).toBe(false);
    expect(TELEMETRY_FALLBACK_NOTICES.unreachable.retry).toBe(true);
    expect(TELEMETRY_FALLBACK_NOTICES.unauthorized.retry).toBe(true);
  });

  it('내장 데이터를 그린다는 사실을 문구가 말한다', () => {
    for (const [failure, notice] of Object.entries(TELEMETRY_FALLBACK_NOTICES)) {
      expect(notice.message, failure).toContain('내장 데이터');
    }
  });
});

describe('403 사유 문장', () => {
  it('화면 이름과 허용 역할을 그대로 끼운다', () => {
    const text = forbiddenDescription('현황판', ['사업장']);
    expect(text).toContain('현황판');
    expect(text).toContain('사업장');
    expect(text).not.toContain('{');
  });

  it('허용 역할이 둘이면 둘 다 적는다', () => {
    expect(forbiddenDescription('설정', ['시스템 관리자', '사업장'])).toContain(
      '시스템 관리자 · 사업장',
    );
  });
});

/**
 * **`global-error.tsx`만 토큰을 못 쓴다** — 문서를 통째로 대신해 `globals.css`가 오지 않는다.
 * 그래서 팔레트를 손으로 베껴 두었는데, 베낀 값은 원본이 바뀌어도 따라오지 않는다.
 * 여기서 대조해 **두 곳이 갈리는 순간 빨개지게** 한다.
 */
describe('global-error의 팔레트가 globals.css와 같다', () => {
  const root = join(import.meta.dirname, '../../..');
  const css = readFileSync(join(root, 'src/app/globals.css'), 'utf8');
  const ge = readFileSync(join(root, 'src/app/global-error.tsx'), 'utf8');

  /** `globals.css`에서 그 토큰의 n번째 선언을 읽는다(1번째 = 라이트, 2번째 = 다크) */
  const declared = (token: string, nth: number) =>
    [...css.matchAll(new RegExp(`--${token}:\\s*(#[0-9a-f]{3,8})`, 'g'))][nth]?.[1];

  const TOKENS = ['bg', 'surface', 'fg', 'fg-muted', 'border', 'accent'] as const;

  it.each(TOKENS)('라이트 --%s', (token) => {
    const value = declared(token, 0);
    expect(value, `${token}이 globals.css에 없다`).toBeTruthy();
    expect(ge, `--${token}의 라이트 값이 globals.css와 다르다`).toContain(`--${token}:${value}`);
  });

  it.each(TOKENS)('다크 --%s', (token) => {
    const value = declared(token, 1);
    expect(value, `${token}의 다크 값이 globals.css에 없다`).toBeTruthy();
    /* 다크는 media 질의와 `[data-theme]` 두 곳에 같은 값이 적혀 있어야 한다 */
    const hits = ge.split(`--${token}:${value}`).length - 1;
    expect(hits, `--${token}의 다크 값이 두 곳에 있어야 한다`).toBe(2);
  });
});
