import type { ForecastSummary } from '../model/types';

/**
 * 차트에 그릴 값이 하나라도 있는가.
 *
 * `online` 플래그가 아니라 **값의 유무**로 판단한다. 일부 구간만 결측인 사업장은 그릴 것이
 * 있으므로 차트를 그리고, 하나도 없으면 눈금만 남은 빈 격자 대신 이유를 적는다(R19·E4).
 */
export function hasPlottableValues(summary: ForecastSummary): boolean {
  return summary.points.some((p) => p.actual !== null || p.forecast !== null);
}
