import { describe, expect, it } from 'vitest';
import { TIMELINE_POINT_COUNT, minutesToSamples, timelineIsoAt } from '@/shared/lib/timeline';
import { getAlarmsForView } from '@/entities/alarm';
import { getAnomalySeries } from '@/entities/anomaly';
import { RIBBON_SCORE_BUCKET_MINUTES } from '../config/constants';
import { buildDayView } from './day-view';
import { buildRibbon } from './ribbon-rows';

const viewFor = (siteId: string) =>
  buildDayView(buildRibbon(siteId, getAnomalySeries(siteId), getAlarmsForView(siteId)));

/**
 * **범주형 축은 목록에 없는 x를 조용히 버린다** — 실제로 최고점 표식이 그렇게 사라졌다.
 * 원본 표본의 시각(`14:20:37`)을 `ReferenceDot`에 넘겼는데 축이 아는 것은 버킷 시각뿐이라
 * 점이 그려지지 않았고, **오류도 경고도 없었다.** 값으로 못박는다.
 */
describe('일간 이상 점수 — 도형이 축 위에 놓인다', () => {
  it.each(['S-01', 'S-02', 'S-08', 'S-09'])('%s의 최고점 x가 축의 값 중 하나다', (siteId) => {
    const view = viewFor(siteId);
    expect(view.peak).not.toBeNull();

    const axis = new Set(view.points.map((p) => p.t));
    expect(axis.has(view.peak!.x)).toBe(true);
  });

  it('두절 구간의 양 끝도 축의 값이다', () => {
    const view = viewFor('S-02');
    expect(view.outages.length).toBeGreaterThan(0);

    const axis = new Set(view.points.map((p) => p.t));
    for (const run of view.outages) {
      expect(axis.has(run.fromIso)).toBe(true);
      expect(axis.has(run.toIso)).toBe(true);
    }
  });
});

/**
 * **최고점은 솎지 않은 원본에서 찾는다.** 솎은 계열에서 고르면 버킷 대표값이 답이 되어
 * 시각이 최대 한 버킷만큼 밀린다 — 판독줄이 적는 시각이 곧 산출 시각이다(**E3**).
 */
describe('일간 이상 점수 — 최고점', () => {
  it('원본 계열의 최댓값과 그 시각이다', () => {
    const data = buildRibbon('S-02', getAnomalySeries('S-02'), getAlarmsForView('S-02'));
    const view = buildDayView(data);

    const known = data.scores.filter((s): s is number => s !== null);
    expect(view.peak!.score).toBe(Math.max(...known));
    expect(view.peak!.iso).toBe(timelineIsoAt(data.scores.indexOf(view.peak!.score)));
  });

  /** 그 시각이 **버킷 한가운데로 스냅된 x**와 한 버킷 안에 있어야 점이 봉우리에 앉는다 */
  it('표식의 x가 실제 시각에서 한 버킷을 넘지 않는다', () => {
    const stride = minutesToSamples(RIBBON_SCORE_BUCKET_MINUTES);
    const view = viewFor('S-02');
    const gapMinutes =
      Math.abs(Date.parse(view.peak!.x) - Date.parse(view.peak!.iso)) / 60_000;

    expect(gapMinutes).toBeLessThanOrEqual(stride);
  });

  /** 하루 내내 결측이면 «산출 없음»이다 — 0으로 적으면 없는 사실을 주장한다(**E4**) */
  it('통신 두절 사업장은 최고점이 없다', () => {
    expect(viewFor('S-04').peak).toBeNull();
  });
});

describe('일간 이상 점수 — 축', () => {
  it('창 전체를 버킷으로 덮는다', () => {
    const stride = minutesToSamples(RIBBON_SCORE_BUCKET_MINUTES);
    expect(viewFor('S-02').points).toHaveLength(TIMELINE_POINT_COUNT / stride);
  });

  /** 자정을 못 찍으면 `02:00`이 어제인지 오늘인지 알 수 없다(**E5**) */
  it('창 안의 자정을 찾아낸다', () => {
    const view = viewFor('S-02');
    expect(view.dayBreakIso).not.toBeNull();

    const at = view.points.findIndex((p) => p.t === view.dayBreakIso);
    expect(view.points[at]!.t.slice(0, 10)).not.toBe(view.points[at - 1]!.t.slice(0, 10));
  });
});
