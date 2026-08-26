import type { DischargeLimitTable } from '@/shared/config/discharge-limits';
import type { MeasurementItemCode } from '@/shared/config/measurement';
import type { ForecastSummary } from '../model/types';

/** 기준선이 놓이는 자리. 비율을 100 기준으로 내므로 이 값이 곧 `기준`이다 */
export const LIMIT_BASE_PERCENT = 100;

/**
 * 값을 **기준 대비 %**로 바꾼다.
 *
 * **왜 농도가 아니라 비율인가** — TN·TP는 소프트 센싱 추정이라 농도를 적지 않는다
 * `[회의 2026-08-20]`. 그리고 TOC 25.5 · TN 16 · TP 1.5로 17배 차이라 농도로는 한 축에
 * 겹칠 수 없다. 기준으로 나누면 셋 다 100 언저리로 모여 **어느 항목이 기준에 가장 가까운가**
 * 를 한눈에 볼 수 있다 — 이 화면이 묻는 것이 그것이다.
 *
 * **기준이 없거나 값이 없으면 `null`이다.** 0으로 두면 "기준의 0%"라는 사실 주장이 되고,
 * 1로 두면 기준선 위에 붙어 정상으로 읽힌다(E4).
 *
 * 상한 기준(`max`)만 쓴다 — pH처럼 양방향인 항목은 이 화면의 대상이 아니다.
 */
export function toLimitPercent(
  value: number | null,
  code: MeasurementItemCode,
  table: DischargeLimitTable,
): number | null {
  if (value === null) return null;
  const limit = table[code];
  if (!limit || limit.unavailableReason !== null || limit.max === null || limit.max === 0) {
    return null;
  }
  return (value / limit.max) * LIMIT_BASE_PERCENT;
}

/** 겹침 차트가 먹는 한 줄. 시각 하나에 계열이 여럿 붙는다 */
export interface OverlayRow {
  t: string;
  [code: string]: string | number | null;
}

/**
 * 여러 요약을 **한 시간축**에 겹친다.
 *
 * **시각으로 맞춘다.** 배열 순서에 기대면 한 계열만 표본이 하나 밀려도 전부 어긋나는데,
 * 그것이 화면에서는 보이지 않는다.
 *
 * `percentOf`가 있으면 기준 대비 %로, 없으면 원값 그대로 싣는다 — 수질은 앞, 수량은 뒤다.
 */
export function buildOverlayRows(
  summaries: ForecastSummary[],
  percentOf?: DischargeLimitTable,
): OverlayRow[] {
  const byTime = new Map<string, OverlayRow>();

  for (const summary of summaries) {
    for (const point of summary.points) {
      const row = byTime.get(point.t) ?? { t: point.t };
      row[summary.code] = percentOf
        ? toLimitPercent(point.value, summary.code as MeasurementItemCode, percentOf)
        : point.value;
      byTime.set(point.t, row);
    }
  }

  return [...byTime.values()].sort((a, b) => a.t.localeCompare(b.t));
}
