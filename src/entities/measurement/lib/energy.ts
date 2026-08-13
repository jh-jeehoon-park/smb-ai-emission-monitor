import type { MeasurementPoint } from '../model/types';

/**
 * 에너지 효율 지표 kWh/m³ (FR-18, 사업계획서 p.67).
 *
 * 전력은 순간 kW, 유량은 순간 m³/day라 두 평균만 있으면 창 길이와 무관하게
 * `평균전력 × 24h ÷ 평균유량` 으로 떨어진다.
 *
 * 결측은 빼고 계산한다. 0으로 채우면 전력이 낮게, 유량이 낮게 잡혀
 * 효율이 실제보다 좋아 보인다(E4).
 */
export function energyIntensity(points: MeasurementPoint[]): number | null {
  let powerSum = 0;
  let powerCount = 0;
  let flowSum = 0;
  let flowCount = 0;

  for (const point of points) {
    if (point.power !== null) {
      powerSum += point.power;
      powerCount += 1;
    }
    if (point.flow !== null) {
      flowSum += point.flow;
      flowCount += 1;
    }
  }

  if (powerCount === 0 || flowCount === 0) return null;

  const avgFlow = flowSum / flowCount;
  if (avgFlow <= 0) return null;

  return ((powerSum / powerCount) * 24) / avgFlow;
}
