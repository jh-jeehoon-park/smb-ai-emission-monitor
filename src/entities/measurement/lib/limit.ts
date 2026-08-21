import {
  hasLimit,
  isOverLimit,
  type DischargeLimitTable,
} from '@/shared/config/discharge-limits';
import type { MeasurementPoint, SeriesCode } from '../model/types';

/**
 * 기준을 벗어난 표본 수.
 *
 * **기준이 없으면 `0`이 아니라 `null`이다.** 0은 "확인했더니 초과가 없었다"는 뜻이고,
 * `null`은 "판정할 기준표가 없다"는 뜻이다. 둘을 합치면 기준을 모르는 항목이 안전한 항목으로
 * 둔갑한다(E4 · `discharge-limits.ts`).
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
): number | null {
  if (!hasLimit(code, table)) return null;
  return points.filter((p) => isOverLimit(code, p[code], table) === true).length;
}
