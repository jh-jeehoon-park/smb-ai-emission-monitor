import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { DEFAULT_SITE_ID, SITE_SCENARIOS } from '@/shared/config/demo-scenario';
import { toStatusLevel } from '@/shared/config/provisional';
import { buildAnomalyScores, downsample, latestScore } from '@/shared/lib/anomaly-score';
import type { Site } from '../model/types';

export { DEFAULT_SITE_ID };

/**
 * 점수와 스파크라인은 상세 패널과 **같은 생성기**에서 나온다.
 * 각자 만들면 한 화면에서 같은 사업장이 다른 점수로 보인다.
 */
function buildSites(): Site[] {
  return SITE_SCENARIOS.map((scenario) => {
    const scores = buildAnomalyScores(scenario.id);
    const anomalyScore = latestScore(scores);

    return {
      id: scenario.id,
      name: scenario.name,
      industry: scenario.industry,
      region: scenario.region,
      address: scenario.address,
      province: scenario.province,
      coordinates: scenario.coordinates,
      regionGrade: scenario.regionGrade,
      dischargeScale: scenario.dischargeScale,
      anomalyScore,
      status: anomalyScore === null ? null : toStatusLevel(anomalyScore),
      online: scenario.online,
      lastSyncIso: scenario.online ? DEMO_NOW_ISO : '2026-08-21T13:35:00Z',
      spark: downsample(scores, 24),
      dataThroughput: scenario.dataThroughput,
      uptime: scenario.uptime,
    };
  });
}

export const SITES: Site[] = buildSites();

export function getSite(siteId: string): Site {
  return SITES.find((s) => s.id === siteId) ?? SITES[0]!;
}
