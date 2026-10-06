import {
  checkLimit,
  limitBasisOf,
  type DischargeLimitTable,
  type LimitBasis,
} from '@/shared/config/discharge-limits';
import type { MeasurementPoint, SeriesCode } from '../model/types';

/**
 * 기준을 벗어난 표본 수와 **무엇으로 셌는가**.
 *
 * `number | null` 하나였을 때는 시연 임계값으로 센 건수가 법정 초과 건수와 같은 칸에 같은
 * 모양으로 앉았다 `[사용자 요청 2026-09-28: 설정 재설계 검토]`. 관내 감독 표의 「기준 초과」
 * 열이 실제로 그 상태였다.
 */
export interface OverLimitCount {
  /**
   * **기준이 없으면 `0`이 아니라 `null`이다.** 0은 "확인했더니 초과가 없었다"는 뜻이고,
   * `null`은 "판정할 기준표가 없다"는 뜻이다. 둘을 합치면 기준을 모르는 항목이 안전한
   * 항목으로 둔갑한다(E4 · `discharge-limits.ts`).
   */
  count: number | null;
  /** `count`가 `null`이면 `'none'` */
  basis: LimitBasis | 'none';
}

const UNJUDGED: OverLimitCount = { count: null, basis: 'none' };

/**
 * 기준을 벗어난 표본 수.
 *
 * 결측 표본은 세지 않는다 — 수신하지 못한 것이지 기준 안에 있었던 것이 아니다.
 *
 * `table`을 넘기면 사용자가 설정한 기준으로 센다. 안 넘기면 정적 표다 — 기본값이 있어
 * 기존 호출은 그대로 돈다.
 */
export function countOverLimit(
  points: readonly MeasurementPoint[],
  code: SeriesCode,
  table?: DischargeLimitTable,
): OverLimitCount {
  /* 근거는 표가 정한다 — 표본마다 물으면 «값이 전부 결측»과 «기준이 없다»가 섞인다 */
  const basis = limitBasisOf(code, table);
  if (basis === 'none') return UNJUDGED;

  let count = 0;
  for (const point of points) {
    if (checkLimit(code, point[code], table).over === true) count += 1;
  }
  return { count, basis };
}
