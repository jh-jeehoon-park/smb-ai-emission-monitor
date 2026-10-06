import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { getScenario } from '@/shared/config/demo-scenario';
import { toStatusLevel } from '@/shared/config/provisional';
import { buildAnomalyScores, latestScore } from '@/shared/lib/anomaly-score';
import { timelineIsoAt } from '@/shared/lib/timeline';
import type { AnomalyPoint, AnomalySummary, Contribution } from '../model/types';

/**
 * 계측이 결측인 구간은 이상 점수도 산출되지 않으므로 null로 둔다.
 * 0으로 채우면 '정상'으로 오독된다(E4). 결측 판정은 계측과 같은 함수를 쓴다.
 */
export function getAnomalySeries(siteId: string): AnomalyPoint[] {
  return buildAnomalyScores(siteId).map((score, i) => ({ t: timelineIsoAt(i), score }));
}

/**
 * 기여 변수는 상황에 따라 달라야 한다. 이상 점수가 낮은데 "TOC 34% 기여"가 뜨면
 * 화면이 스스로를 반박한다.
 *
 * **항목 코드를 함께 낸다** `[사용자 요청 2026-09-08]`. 화면이 기여도 옆에 그 시각의 실측을
 * 적으려면 어느 계측 항목인지 알아야 하고, 라벨로 맞추면 조용히 어긋난다(`Contribution.code`).
 *
 * **밴드가 셋뿐이라 78과 91이 같은 다섯 행을 낸다.** 지어내서 메우지 않는다 — `[TBD-32]`가
 * 값 정의를 서버 몫으로 못박았다. 화면은 그 사실이 드러나게 «이 구간 등급의 기여 변수»라
 * 적는다.
 */
function contributionsFor(score: number): Contribution[] {
  if (score >= 70) {
    return [
      { code: 'TOC', label: 'TOC 총유기탄소', weight: 0.34, direction: 'up' },
      { code: 'DO', label: 'DO 용존산소', weight: 0.27, direction: 'down' },
      { code: 'turbidity', label: '탁도', weight: 0.16, direction: 'up' },
      { code: 'EC', label: 'EC 전기전도도', weight: 0.13, direction: 'up' },
      { code: 'current', label: '전류(폭기 블로워)', weight: 0.1, direction: 'up' },
    ];
  }
  if (score >= 50) {
    return [
      { code: 'EC', label: 'EC 전기전도도', weight: 0.31, direction: 'up' },
      { code: 'turbidity', label: '탁도', weight: 0.24, direction: 'up' },
      { code: 'TOC', label: 'TOC 총유기탄소', weight: 0.2, direction: 'up' },
      { code: 'temperature', label: '수온', weight: 0.14, direction: 'up' },
      { code: 'DO', label: 'DO 용존산소', weight: 0.11, direction: 'down' },
    ];
  }
  return [
    { code: 'temperature', label: '수온', weight: 0.29, direction: 'up' },
    { code: 'pH', label: 'pH 수소이온농도', weight: 0.24, direction: 'down' },
    { code: 'EC', label: 'EC 전기전도도', weight: 0.19, direction: 'up' },
    { code: 'flow', label: '유량', weight: 0.16, direction: 'up' },
    { code: 'turbidity', label: '탁도', weight: 0.12, direction: 'up' },
  ];
}

/** 마지막 표본의 판정. **화면 넷이 이것을 부른다** — 통합 관제·사업장 상세·관내 감독·리포트 */
export function getAnomalySummary(siteId: string): AnomalySummary {
  const scores = buildAnomalyScores(siteId);
  const latest = latestScore(scores);
  const scenario = getScenario(siteId);

  return {
    ...summaryOf(siteId, latest),
    /* 마지막 표본은 «지금»이라 산출 시각이 시연 현재다. 되감은 시각은 그 표본의 시각이다 */
    computedAtIso: scenario.online ? DEMO_NOW_ISO : '2026-08-21T13:35:00Z',
    windowLabel: '최근 1시간 다변량 패턴',
  };
}

/**
 * **되감은 시각의 판정** `[사용자 요청 2026-09-08]`.
 *
 * 이상 탐지 화면만 조사 시각을 갖는다 — 다른 화면은 전부 «지금»에 고정돼 있어 «언제부터
 * 올랐나»에 답할 수 없었다. 기여 변수는 `contributionsFor`를 **그대로 재사용**하므로 새
 * 데이터를 지어내지 않는다(`[TBD-32]`가 값 정의를 서버 몫으로 못박았다).
 *
 * 창 밖 인덱스면 점수가 없어 «산출값 없음»으로 떨어진다 — 화면이 그 상태를 이미 그린다.
 */
export function getAnomalySummaryAt(siteId: string, index: number): AnomalySummary {
  const score = buildAnomalyScores(siteId)[index] ?? null;

  return {
    ...summaryOf(siteId, score),
    /* 되감은 시각이 곧 산출 시각이다(**E3**) — «지금»을 적으면 몇 시간 전 판정에 지금이 붙는다 */
    computedAtIso: timelineIsoAt(index),
    windowLabel: '해당 시각 기준 1시간 다변량 패턴',
  };
}

/** 두 진입점이 공유하는 몸통. 갈리면 같은 점수가 화면마다 다른 등급을 받는다 */
function summaryOf(siteId: string, score: number | null): AnomalySummary {
  return {
    score,
    level: score === null ? null : toStatusLevel(score),
    online: getScenario(siteId).online,
    computedAtIso: DEMO_NOW_ISO,
    windowLabel: '',
    modelLabel: 'AutoEncoder · 복원오차 기반',
    contributions: score === null ? [] : contributionsFor(score),
  };
}
