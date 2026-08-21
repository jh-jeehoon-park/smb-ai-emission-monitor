import { STORAGE_SCHEMA_VERSION } from '../config/storage';

/**
 * localStorage에 담은 JSON을 읽고 쓴다.
 *
 * **읽기가 절대 던지지 않는다.** 시크릿 모드에서 접근이 막히고, 사용자가 콘솔에서 값을
 * 고칠 수 있고, 판이 다른 옛 값이 남아 있을 수 있다. 세 경우 모두 **기본값으로 떨어져야**
 * 화면이 뜬다 — 설정을 못 읽은 것이 화면을 못 그릴 이유는 아니다.
 *
 * 서버에서도 불릴 수 있다(프로바이더 첫 렌더). `window`가 없으면 `null`이다.
 */

interface Envelope {
  v: number;
  updatedIso: string;
}

/**
 * 판을 확인하고 내용을 검증한 뒤 돌려준다.
 *
 * `guard`는 **모양을 좁히는 것이 아니라 신뢰할 수 있게 만드는 것**이다. 저장값은 사용자가
 * 고칠 수 있으므로 타입 단언으로 넘기면 그 거짓이 화면 끝까지 흘러간다.
 */
export function readJson<T>(key: string, guard: (raw: unknown) => T | null): T | null {
  if (typeof window === 'undefined') return null;

  let text: string | null = null;
  try {
    text = window.localStorage.getItem(key);
  } catch {
    /* 시크릿 모드 등에서 막힌다. 이번 세션은 기본값으로 돈다 */
    return null;
  }
  if (!text) return null;

  try {
    const parsed = JSON.parse(text) as Partial<Envelope> & { data?: unknown };
    /* 판이 다르면 읽지 않는다 — 옛 모양을 새 뜻으로 해석하면 조용히 틀린다 */
    if (parsed?.v !== STORAGE_SCHEMA_VERSION) return null;
    return guard(parsed.data);
  } catch {
    /* 손상된 JSON. 버리고 기본값으로 간다 */
    return null;
  }
}

/** 판과 갱신 시각을 함께 담는다. 시각은 화면이 "언제 설정했는지"를 근거로 적는 데 쓴다 */
export function writeJson(key: string, data: unknown, nowIso: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      key,
      JSON.stringify({ v: STORAGE_SCHEMA_VERSION, updatedIso: nowIso, data }),
    );
  } catch {
    /* 막히면 이번 세션 메모리에만 남는다. 시연에는 그것으로 충분하다 */
  }
}

export function removeKey(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* 지우지 못해도 화면은 돌아야 한다 */
  }
}

/** 저장값에서 갱신 시각만 꺼낸다. 없거나 판이 다르면 `null` */
export function readUpdatedIso(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const text = window.localStorage.getItem(key);
    if (!text) return null;
    const parsed = JSON.parse(text) as Partial<Envelope>;
    if (parsed?.v !== STORAGE_SCHEMA_VERSION) return null;
    return typeof parsed.updatedIso === 'string' ? parsed.updatedIso : null;
  } catch {
    return null;
  }
}
