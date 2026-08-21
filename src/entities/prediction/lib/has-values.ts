import type { ForecastSummary } from '../model/types';

/**
 * 차트에 그릴 값이 하나라도 있는가.
 *
 * `online` 플래그가 아니라 **값의 유무**로 판단한다. 일부 구간만 결측인 사업장은 그릴 것이
 * 있으므로 차트를 그리고, 하나도 없으면 눈금만 남은 빈 격자 대신 이유를 적는다(R19·E4).
 */
export function hasPlottableValues(summary: ForecastSummary): boolean {
  return summary.points.some((p) => p.value !== null);
}

/**
 * 구간의 **최대값**.
 *
 * `[원문 발표 p.16 그림]`의 시계열 화면이 차트 아래에 `최대 예측값 62.4 NTU`를 함께 낸다 —
 * 곡선을 눈으로 훑어 꼭짓점을 찾지 않아도 되게 하는 값이다.
 *
 * **예측이 아니라 관측 구간의 최대다** `[INC-109]`. 예측 곡선을 내렸으므로(`[TBD-52]`) 이
 * 값도 앞날이 아니라 최근 6시간에서 나온다 — 화면이 그 차이를 적는다(E3).
 *
 * 값이 하나도 없으면 `null`이다. 0으로 채우면 "0이었다"가 된다(E4).
 */
export function peakValue(summary: ForecastSummary): number | null {
  const values = summary.points.map((p) => p.value).filter((v): v is number => v !== null);

  return values.length === 0 ? null : Math.max(...values);
}
