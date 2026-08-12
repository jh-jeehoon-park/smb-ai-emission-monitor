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
 */
function contributionsFor(score: number): Contribution[] {
  if (score >= 70) {
    return [
      { label: 'TOC 총유기탄소', weight: 0.34, direction: 'up' },
      { label: 'DO 용존산소', weight: 0.27, direction: 'down' },
      { label: '탁도', weight: 0.16, direction: 'up' },
      { label: 'EC 전기전도도', weight: 0.13, direction: 'up' },
      { label: '전류(폭기 블로워)', weight: 0.1, direction: 'up' },
    ];
  }
  if (score >= 50) {
    return [
      { label: 'EC 전기전도도', weight: 0.31, direction: 'up' },
      { label: '탁도', weight: 0.24, direction: 'up' },
      { label: 'TOC 총유기탄소', weight: 0.2, direction: 'up' },
      { label: '수온', weight: 0.14, direction: 'up' },
      { label: 'DO 용존산소', weight: 0.11, direction: 'down' },
    ];
  }
  return [
    { label: '수온', weight: 0.29, direction: 'up' },
    { label: 'pH 수소이온농도', weight: 0.24, direction: 'down' },
    { label: 'EC 전기전도도', weight: 0.19, direction: 'up' },
    { label: '유량', weight: 0.16, direction: 'up' },
    { label: '탁도', weight: 0.12, direction: 'up' },
  ];
}

export function getAnomalySummary(siteId: string): AnomalySummary {
  const scenario = getScenario(siteId);
  const latest = latestScore(buildAnomalyScores(siteId));

  return {
    score: latest,
    level: latest === null ? null : toStatusLevel(latest),
    online: scenario.online,
    computedAtIso: scenario.online ? DEMO_NOW_ISO : '2026-08-11T13:35:00Z',
    windowLabel: '최근 1시간 다변량 패턴',
    modelLabel: 'AutoEncoder · 복원오차 기반',
    contributions: latest === null ? [] : contributionsFor(latest),
  };
}
