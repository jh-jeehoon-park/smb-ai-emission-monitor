/**
 * 실패의 종류. **화면이 각각 다르게 보여야 한다**(명세 §8) — 전부 "오류"로 뭉치면
 * 장비 미등록 한 곳 때문에 나머지 아홉 곳까지 지운다.
 */
export type TbFailure =
  /** 주소·계정이 없다. 실측 모드로 띄운 것이 아니다 — 오류가 아니라 폴백 신호다 */
  | 'unconfigured'
  /** 재시도까지 실패. 마지막 값을 지우지 않고 `연결 끊김`을 덧붙인다 */
  | 'unreachable'
  /** 갱신·재로그인까지 실패 */
  | 'unauthorized'
  /** 그 사업장만 장비 미등록. 재시도하지 않는다 */
  | 'notFound'
  /** 우리 코드 버그다. 재시도하지 않는다 */
  | 'badRequest';

export class TbError extends Error {
  constructor(
    readonly failure: TbFailure,
    message: string,
  ) {
    super(message);
    this.name = 'TbError';
  }
}

/** 같은 요청을 다시 보내도 같은 답이 온다 — 폴링이면 주기마다 그 실패가 반복된다 */
export function isRetriable(failure: TbFailure): boolean {
  return failure === 'unreachable';
}
