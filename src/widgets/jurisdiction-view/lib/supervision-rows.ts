import { PROVISIONAL_STATUS_LEVELS, type StatusLevel } from '@/shared/config/provisional';
import type { DischargeLimitTable } from '@/shared/config/discharge-limits';
import { countOpen } from '@/entities/alarm';
import type { Alarm } from '@/entities/alarm';
import { idleDischargeAcross } from '@/entities/anomaly';
import { getMeasurementSeries } from '@/entities/measurement';
import { countOverLimit } from '@/entities/measurement';
import { WATER_SERIES_CODES } from '@/entities/measurement';
import type { Site } from '@/entities/site';

/** 관내 감독 표의 한 줄 */
export interface SupervisionRow {
  site: Site;
  status: StatusLevel | null;
  anomalyScore: number | null;
  /** 기준을 넘긴 표본 수. **`null`은 판정 불가**(기준 미설정 또는 두절) */
  overLimit: number | null;
  /** 방류 의심 구간 수. **`null`은 판정 불가**(두절) */
  idleRuns: number | null;
  openAlarms: number;
}

/**
 * `조치 필요한 순`의 가중치. 낮을수록 위로 온다.
 *
 * **이상 점수 순이 아니다.** 두절은 점수가 `null`이라 점수로 세우면 맨 아래로 밀리는데,
 * 감독자에게 두절은 **가장 먼저** 볼 것이다(**E4**) — 그 사업장은 지금 아무것도 확인되지
 * 않고 있다.
 */
const OUTAGE_FIRST = -1;

function severityRank(status: StatusLevel | null): number {
  if (status === null) return OUTAGE_FIRST;
  /* 등급이 높을수록 위로 — 배열이 정상→위험 순이라 뒤집는다 */
  return PROVISIONAL_STATUS_LEVELS.length - PROVISIONAL_STATUS_LEVELS.indexOf(status);
}

/**
 * 관내 사업장을 **조치 필요한 순**으로 세운다.
 *
 * 순서는 `두절 → 등급 높은 순 → 미확인 많은 순`이다. 마지막 축을 두는 이유는 같은 등급이
 * 여럿일 때 손댈 것이 남은 쪽이 위에 와야 하기 때문이다.
 */
export function buildSupervisionRows(
  sites: readonly Site[],
  alarms: readonly Alarm[],
  limits: DischargeLimitTable,
): SupervisionRow[] {
  const idle = new Map(
    idleDischargeAcross(sites.map((site) => site.id)).map((v) => [v.siteId, v.runs]),
  );

  const rows = sites.map((site) => ({
    site,
    status: site.status,
    anomalyScore: site.anomalyScore,
    overLimit: countOverLimitIn(site, limits),
    idleRuns: idle.get(site.id) ?? null,
    openAlarms: countOpen(alarms, site.id),
  }));

  return rows.sort(
    (a, b) =>
      severityRank(a.status) - severityRank(b.status) || b.openAlarms - a.openAlarms,
  );
}

/**
 * 수질 8종에서 기준을 넘긴 표본 수.
 *
 * **`0`과 `null`을 가른다.** `0`은 *"확인했더니 없었다"* 이고 `null`은 *"확인할 수 없었다"* 다 —
 * 기준이 하나도 설정되지 않았거나 통신이 두절된 경우다. 둘을 같은 `0`으로 적으면
 * 미설정과 두절이 안전으로 둔갑한다(**E4** · `[TBD-45]`).
 */
function countOverLimitIn(site: Site, limits: DischargeLimitTable): number | null {
  if (!site.online) return null;

  const points = getMeasurementSeries(site.id);
  let total = 0;
  let judged = false;

  for (const code of WATER_SERIES_CODES) {
    const count = countOverLimit(points, code, limits);
    if (count === null) continue;
    judged = true;
    total += count;
  }

  return judged ? total : null;
}
