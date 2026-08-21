import { sliceRecentHours, summarizeSeries } from './series-stats';
import type { MeasurementPoint, SeriesCode } from '../model/types';

export interface WindowChange {
  /** 최근 구간 평균 */
  recent: number | null;
  /** 그 앞 구간 평균 — 비교 대상 */
  baseline: number | null;
  /** `recent / baseline`. 어느 한쪽이 없거나 기준이 0이면 `null` */
  ratio: number | null;
}

/**
 * 최근 구간이 그 앞 구간보다 오르고 있는가 내리고 있는가.
 *
 * **두 구간을 겹치지 않게 나눈다.** 최근 값이 자기 기준선 안에 있으면 변화가 자기 기준을
 * 함께 밀어 올려 방향이 흐려진다.
 *
 * **결측은 빼고 계산한다**(`summarizeSeries`가 그렇게 한다). 0으로 채우면 평균이 내려가
 * 없던 하락 방향이 만들어진다(E4). 어느 구간이든 값이 하나도 없으면 `null`이다 — 방향을
 * 낼 근거가 없다는 뜻이고, 소비처는 제안을 만들지 않는다.
 */
export function windowChange(
  points: MeasurementPoint[],
  code: SeriesCode,
  recentHours: number,
  baselineHours: number,
): WindowChange {
  const window = sliceRecentHours(points, recentHours + baselineHours);
  const split = Math.round((window.length * baselineHours) / (recentHours + baselineHours));

  const baseline = summarizeSeries(window.slice(0, split), code).avg;
  const recent = summarizeSeries(window.slice(split), code).avg;
  const ratio = recent === null || baseline === null || baseline === 0 ? null : recent / baseline;

  return { recent, baseline, ratio };
}
