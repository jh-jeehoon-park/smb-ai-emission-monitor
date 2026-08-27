import {
  TB_PROXY_PATH,
  TB_REQUEST_TIMEOUT_MS,
  TB_RETRY_BACKOFF_MS,
} from './config';
import { TbError, isRetriable, type TbFailure } from './errors';

const FAILURE_BY_STATUS: Record<number, TbFailure> = {
  400: 'badRequest',
  401: 'unauthorized',
  403: 'unauthorized',
  404: 'notFound',
  503: 'unconfigured',
};

function failureOf(status: number): TbFailure {
  return FAILURE_BY_STATUS[status] ?? 'unreachable';
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 프록시를 한 번 호출한다.
 *
 * **상태 코드를 먼저 보고 본문은 있을 때만 읽는다** — 404와 일부 400은 본문이 없어
 * `res.json()`을 무조건 부르면 거기서 다시 던진다(명세 §3.2).
 */
async function callOnce<T>(path: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${TB_PROXY_PATH}/${path}`, {
      ...init,
      cache: 'no-store',
      signal: AbortSignal.timeout(TB_REQUEST_TIMEOUT_MS),
    });
  } catch (cause) {
    throw new TbError('unreachable', `계측 서버에 닿지 못했습니다: ${String(cause)}`);
  }

  if (!res.ok) {
    throw new TbError(failureOf(res.status), `계측 서버 응답 ${res.status}`);
  }

  return (await res.json()) as T;
}

/**
 * 재시도는 **도달 실패에만** 건다. 400·404는 다시 보내도 같은 답이고, 401은 프록시가
 * 이미 갱신·재로그인을 마친 뒤라 여기서 더 할 일이 없다(명세 §8).
 */
async function tbRequest<T>(path: string, init: RequestInit): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await callOnce<T>(path, init);
    } catch (error) {
      const failure = error instanceof TbError ? error.failure : 'unreachable';
      if (!isRetriable(failure) || attempt >= TB_RETRY_BACKOFF_MS.length) throw error;

      await wait(TB_RETRY_BACKOFF_MS[attempt]!);
    }
  }
}

export function tbGet<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const query = params ? `?${new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))}` : '';
  return tbRequest<T>(`${path}${query}`, { method: 'GET' });
}

export function tbPost<T>(path: string, body: unknown): Promise<T> {
  return tbRequest<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
