import type { MeasurementPoint } from '../model/types';

/** 두 계열의 합과 표본 수. 값과 그 값이 없는 이유가 **같은 셈**에서 나오게 하는 자리다 */
interface Totals {
  power: { sum: number; count: number };
  flow: { sum: number; count: number };
}

function totals(points: MeasurementPoint[]): Totals {
  const t: Totals = { power: { sum: 0, count: 0 }, flow: { sum: 0, count: 0 } };
  for (const point of points) {
    if (point.power !== null) {
      t.power.sum += point.power;
      t.power.count += 1;
    }
    if (point.flow !== null) {
      t.flow.sum += point.flow;
      t.flow.count += 1;
    }
  }
  return t;
}

/**
 * 에너지 효율 지표 kWh/m³ (FR-18, 사업계획서 p.67).
 *
 * 전력은 순간 kW, 유량은 순간 m³/day라 두 평균만 있으면 창 길이와 무관하게
 * `평균전력 × 24h ÷ 평균유량` 으로 떨어진다.
 *
 * 결측은 빼고 계산한다. 0으로 채우면 전력이 낮게, 유량이 낮게 잡혀
 * 효율이 실제보다 좋아 보인다(E4).
 *
 * **값이 없는 두 사정은 여기서 구분되지 않는다** — 왜 없는지는 `energyGap()`이 답한다.
 */
export function energyIntensity(points: MeasurementPoint[]): number | null {
  const t = totals(points);
  if (t.power.count === 0 || t.flow.count === 0) return null;

  const avgFlow = t.flow.sum / t.flow.count;
  if (avgFlow <= 0) return null;

  return ((t.power.sum / t.power.count) * 24) / avgFlow;
}

/**
 * **값이 없을 때 그 이유.** 값이 나오면 `null`이다.
 *
 * 한 `null`이 두 사정을 덮고 있었다 — 화면은 그것을 `계측값이 없어 산출 불가`로만 번역했다.
 * 그런데 **하루 종일 방류하지 않은 사업장은 계측값이 있다**(유량을 받았고 그 값이 0이다).
 * 받은 0을 못 받은 것으로 적는 것은 결측을 0으로 그리는 것과 같은 종류의 거짓말이다(**E4**).
 *
 * 유량을 방류 여부에 맞추면서 드러났다 `[사용자 요청 2026-08-28]` — 그전에는 방류하지 않는
 * 사업장에도 유량이 흘러 이 자리가 생기지 않았다.
 */
export type EnergyGap = 'noSamples' | 'noDischarge';

export function energyGap(points: MeasurementPoint[]): EnergyGap | null {
  const t = totals(points);
  if (t.power.count === 0 || t.flow.count === 0) return 'noSamples';
  if (t.flow.sum / t.flow.count <= 0) return 'noDischarge';
  return null;
}
