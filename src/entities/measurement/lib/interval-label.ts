/**
 * 수집 주기를 사람이 읽는 말로 `[사용자 요청 2026-09-16]`.
 *
 * **초와 분을 가른다.** 화면은 그동안 `1분 주기`만 적었는데 사업장마다 주기가 다르고
 * 5초로 보내는 곳이 있다 — `0.08분`이라 적을 수는 없다.
 *
 * 60초로 나누어떨어지면 분으로, 아니면 초로 적는다. 60초 미만은 언제나 초다.
 */
export function intervalLabel(seconds: number): string {
  if (seconds < 60 || seconds % 60 !== 0) return `${seconds}초`;

  return `${seconds / 60}분`;
}
