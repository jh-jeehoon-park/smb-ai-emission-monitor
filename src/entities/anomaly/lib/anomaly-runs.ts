import { PROVISIONAL_ANOMALY_BANDS, toStatusLevel, type StatusLevel } from '@/shared/config/provisional';
import { timelineIsoAt } from '@/shared/lib/timeline';

/**
 * 이상 점수가 **경계 위로 이어진 한 구간** `[사용자 요청 2026-09-08]`.
 *
 * 이 화면이 답해야 하는 질문은 «지금 91점»이 아니라 **«언제부터, 얼마나, 무엇 때문에»** 다.
 * 점수 하나로는 답할 수 없어 구간을 1급 객체로 세운다 — `IdleDischargeRun`과 같은 모양이라
 * 화면이 두 목록을 같은 어휘로 그린다.
 */
export interface AnomalyRun {
  /** 표본 인덱스(시작·끝 포함) */
  from: number;
  to: number;
  fromIso: string;
  toIso: string;
  /** 표본 수. 시간 환산은 화면이 한다 */
  samples: number;
  /** 구간 안의 최고 점수와 그 시각의 인덱스 — 판독은 그 지점을 연다 */
  peak: number;
  peakIndex: number;
  /** 최고 점수의 등급. 구간을 한 줄로 요약할 때 쓴다 */
  level: StatusLevel;
  /**
   * 계열 끝까지 이어졌는가 — **«지금도 그런가»의 답**이다.
   *
   * 화면이 `13:10–지금`이라 적는 근거다. `toIso`만 보면 그 시각이 마지막 표본인지 알 수 없어
   * 소비처가 계열 길이를 다시 들고 와야 한다.
   */
  isNow: boolean;
}

/** 구간으로 셀 최소 점수 — `주의` 경계다. 등급 표에서 파생시켜 두 곳이 갈리지 않게 한다 */
export const ANOMALY_RUN_MIN_SCORE =
  PROVISIONAL_ANOMALY_BANDS.find((band) => band.level === 'caution')?.min ?? 50;

/**
 * 이상 구간을 찾는다.
 *
 * **`siteId`가 아니라 점수 배열을 받는다.** `findIdleDischargeRuns`는 시나리오를 직접 읽지만
 * 이쪽은 계열이 이미 손에 있는 값이고(`buildAnomalyScores`), 배열을 받으면 검사가 시연
 * 시나리오에 묶이지 않는다.
 *
 * **결측에서 구간을 닫는다.** 점수가 `null`인 표본은 «모르는 시간»이라 이어 붙이면 없는
 * 이상을 만든다(**E4**) — `idle-discharge.ts`가 같은 이유로 `null`에서 끊는다. `0`으로
 * 접지 않는 이유도 같다.
 *
 * **끝까지 이어진 구간은 마지막 표본에서 닫힌다.** 그것이 «지금도 그런가»의 답이라
 * 화면은 `to === scores.length - 1`을 보고 `–지금`이라 적는다.
 */
export function findAnomalyRuns(
  scores: readonly (number | null)[],
  minScore: number = ANOMALY_RUN_MIN_SCORE,
  minSamples = 1,
): AnomalyRun[] {
  const runs: AnomalyRun[] = [];
  let start: number | null = null;
  let peak = 0;
  let peakIndex = 0;

  const close = (end: number) => {
    if (start === null) return;
    const samples = end - start + 1;
    if (samples >= minSamples) {
      runs.push({
        from: start,
        to: end,
        fromIso: timelineIsoAt(start),
        toIso: timelineIsoAt(end),
        samples,
        peak,
        peakIndex,
        level: toStatusLevel(peak),
        isNow: end === scores.length - 1,
      });
    }
    start = null;
  };

  for (let i = 0; i < scores.length; i += 1) {
    const score = scores[i];

    if (score === null || score === undefined || score < minScore) {
      close(i - 1);
      continue;
    }

    if (start === null) {
      start = i;
      peak = score;
      peakIndex = i;
    } else if (score > peak) {
      peak = score;
      peakIndex = i;
    }
  }
  close(scores.length - 1);

  return runs;
}

/**
 * 판정 자체가 불가능한 계열인가.
 *
 * 전 구간이 결측이면 구간 **0건**이 아니라 **모름**이다. 0건으로 적으면 "확인했더니 없었다"가
 * 되어 통신이 끊긴 사업장이 조용한 사업장으로 둔갑한다(**E4**) — `canJudgeIdleDischarge`와
 * 같은 규약이다.
 */
export function canJudgeAnomalyRuns(scores: readonly (number | null)[]): boolean {
  return scores.some((score) => score !== null);
}
