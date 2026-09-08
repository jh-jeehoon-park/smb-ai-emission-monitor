import { describe, expect, it } from 'vitest';
import { PROVISIONAL_ANOMALY_BANDS, PROVISIONAL_ANOMALY_RUN_MIN_MINUTES } from '@/shared/config/provisional';
import { minutesToSamples, timelineIsoAt } from '@/shared/lib/timeline';
import { buildAnomalyScores } from '@/shared/lib/anomaly-score';
import { SITE_SCENARIOS } from '@/shared/config/demo-scenario';
import {
  ANOMALY_RUN_MIN_SCORE,
  canJudgeAnomalyRuns,
  findAnomalyRuns,
} from './lib/anomaly-runs';
import { getAnomalySummary, getAnomalySummaryAt } from './api/fixtures';

/**
 * **이상 구간** `[사용자 요청 2026-09-08]`.
 *
 * 이상 탐지 화면이 답해야 하는 것은 «지금 91점»이 아니라 «언제부터, 얼마나»다. 점수 하나로는
 * 답이 안 나와 계열에서 구간을 뽑는다 — 결측 규약(**E4**)은 `findIdleDischargeRuns`의 것을
 * 그대로 승계한다.
 */
describe('findAnomalyRuns', () => {
  it('경계값을 포함한다 — `>=`다', () => {
    const runs = findAnomalyRuns([ANOMALY_RUN_MIN_SCORE, ANOMALY_RUN_MIN_SCORE]);
    expect(runs).toHaveLength(1);
    expect(runs[0]!.samples).toBe(2);
  });

  it('경계 미만은 구간이 아니다', () => {
    expect(findAnomalyRuns([ANOMALY_RUN_MIN_SCORE - 1, ANOMALY_RUN_MIN_SCORE - 1])).toEqual([]);
  });

  /**
   * **결측에서 닫는다.** 모르는 시간을 이어 붙이면 없는 이상을 만든다 — 한 구간 60분이 아니라
   * 두 구간이다.
   */
  it('결측에서 구간이 끊긴다 — 이어 붙이지 않는다', () => {
    const runs = findAnomalyRuns([60, 60, null, 60, 60]);
    expect(runs.map((r) => [r.from, r.to])).toEqual([
      [0, 1],
      [3, 4],
    ]);
  });

  it('최소 지속 미만은 세지 않는다', () => {
    expect(findAnomalyRuns([60, 40, 60, 40], ANOMALY_RUN_MIN_SCORE, 2)).toEqual([]);
    expect(findAnomalyRuns([60, 60, 40], ANOMALY_RUN_MIN_SCORE, 2)).toHaveLength(1);
  });

  it('최고 점수와 그 시각을 함께 낸다', () => {
    const run = findAnomalyRuns([55, 91, 70])[0]!;
    expect(run.peak).toBe(91);
    expect(run.peakIndex).toBe(1);
    expect(run.level).toBe('critical');
  });

  /** «지금도 그런가»의 답이다 — 화면이 `to`를 보고 `–지금`이라 적는다 */
  it('끝까지 이어진 구간이 마지막 표본에서 닫힌다', () => {
    const run = findAnomalyRuns([40, 60, 60])[0]!;
    expect(run.to).toBe(2);
    expect(run.toIso).toBe(timelineIsoAt(2));
  });

  it('빈 계열은 구간이 없다', () => {
    expect(findAnomalyRuns([])).toEqual([]);
  });

  /** 전 구간 결측은 **0건이 아니라 모름**이다(**E4**) */
  it('전 구간 결측이면 판정할 수 없다', () => {
    expect(canJudgeAnomalyRuns([null, null])).toBe(false);
    expect(canJudgeAnomalyRuns([null, 10])).toBe(true);
  });

  /** 경계는 등급 표에서 파생한다 — 두 곳에 적으면 한쪽만 바뀐다 */
  it('최소 점수가 주의 경계다', () => {
    const caution = PROVISIONAL_ANOMALY_BANDS.find((b) => b.level === 'caution')!;
    expect(ANOMALY_RUN_MIN_SCORE).toBe(caution.min);
  });
});

/**
 * **시연 데이터가 화면을 뒷받침하는가.** 구간이 한 건도 없으면 이 화면은 빈 상자가 되고,
 * 전 사업장에 수십 건이면 목록이 읽히지 않는다.
 */
describe('시연 사업장의 구간 분포', () => {
  const minSamples = minutesToSamples(PROVISIONAL_ANOMALY_RUN_MIN_MINUTES);
  const counts = SITE_SCENARIOS.map((scenario) => ({
    id: scenario.id,
    runs: findAnomalyRuns(buildAnomalyScores(scenario.id), ANOMALY_RUN_MIN_SCORE, minSamples).length,
    judgeable: canJudgeAnomalyRuns(buildAnomalyScores(scenario.id)),
  }));

  it('구간이 있는 사업장이 있다 — 없으면 화면이 빈 상자다', () => {
    expect(counts.filter((c) => c.runs > 0).length).toBeGreaterThan(0);
  });

  /** 빈 상태도 시연에 나와야 그 문구가 검증된다 */
  it('구간이 없는 사업장도 있다', () => {
    expect(counts.filter((c) => c.judgeable && c.runs === 0).length).toBeGreaterThan(0);
  });

  /** 판정 불가(전 구간 결측)도 나와야 «0건이 아니라 모름» 문구가 검증된다 */
  it('판정할 수 없는 사업장이 있다', () => {
    expect(counts.filter((c) => !c.judgeable).length).toBeGreaterThan(0);
  });

  /** 한 화면에 수십 줄이 쏟아지면 목록이 아니다 */
  it('한 사업장의 구간이 12건을 넘지 않는다', () => {
    for (const c of counts) expect(c.runs, c.id).toBeLessThanOrEqual(12);
  });
});

/**
 * **되감은 판정이 «지금»과 어긋나지 않는다.** 마지막 표본에서는 두 함수가 같은 값을 내야
 * 한다 — 갈리면 같은 사업장의 같은 시각을 두 화면이 다르게 말한다(**E1**).
 */
describe('getAnomalySummaryAt', () => {
  const online = SITE_SCENARIOS.find((s) => s.online)!;
  const lastIndex = buildAnomalyScores(online.id).length - 1;

  it('마지막 표본에서 `getAnomalySummary`와 같은 판정이다', () => {
    const now = getAnomalySummary(online.id);
    const at = getAnomalySummaryAt(online.id, lastIndex);

    expect(at.score).toBe(now.score);
    expect(at.level).toBe(now.level);
    expect(at.contributions).toEqual(now.contributions);
  });

  /** 산출 시각은 달라야 한다 — 되감은 시각에 «지금»을 적으면 E3를 어긴다 */
  it('산출 시각이 되감은 그 시각이다', () => {
    expect(getAnomalySummaryAt(online.id, 10).computedAtIso).toBe(timelineIsoAt(10));
    expect(getAnomalySummaryAt(online.id, 10).windowLabel).toContain('해당 시각');
  });

  /** 창 밖이면 점수가 없다 — 화면의 «산출값 없음»으로 떨어진다 */
  it('창 밖 인덱스는 산출값이 없다', () => {
    const out = getAnomalySummaryAt(online.id, 999_999);
    expect(out.score).toBeNull();
    expect(out.contributions).toEqual([]);
  });
});
