import { PROVISIONAL_STATUS_LEVELS, type StatusLevel } from '@/shared/config/provisional';
import type { DischargeLimitTable } from '@/shared/config/discharge-limits';
import { countOpen } from '@/entities/alarm';
import type { Alarm } from '@/entities/alarm';
import { idleDischargeAcross } from '@/entities/anomaly';
import { countOverLimit } from '@/entities/measurement';
import type { MeasurementPoint } from '@/entities/measurement';
import { WATER_SERIES_CODES } from '@/entities/measurement';
import type { Site } from '@/entities/site';

/** 관내 감독 표의 한 줄 */
export interface SupervisionRow {
  site: Site;
  status: StatusLevel | null;
  anomalyScore: number | null;
  /** **법정** 기준을 넘긴 표본 수. `null`은 판정 불가(기준 미설정 또는 두절) */
  overLimit: number | null;
  /**
   * **시연 임계값**을 넘긴 표본 수 `[사용자 요청 2026-09-28: 설정 재설계 검토]`.
   *
   * 법정 초과와 같은 칸에 담지 않는다 — 시연 임계값(`PROVISIONAL_DEMO_LIMITS`)이
   * 법정 판정 자격을 얻어 이 열이 「기준 초과 N건」이라 적던 것이 결함이었다.
   */
  overProvisional: number | null;
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
  /**
   * **사업장마다 자기 기준표를 받는다** `[사용자 요청 2026-09-28: 설정 재설계 검토]`.
   *
   * 한때 `limits: DischargeLimitTable` 하나였다 — 화면이 **지금 선택한 사업장**의 표를
   * 넘겼고, 관내 전부가 그 표로 판정됐다. A사업장을 골랐다는 이유로 B사업장이 A의 기준으로
   * 초과 건수를 얻는다. 기준은 지역구분·배출량 규모로 갈리므로(`[공정자료 p.11]`)
   * **다른 분류의 사업장이 같은 표를 받는 것 자체가 틀린 판정이다.**
   */
  limitsOf: (siteId: string) => DischargeLimitTable,
  seriesBySite: Map<string, MeasurementPoint[]>,
  /**
   * 아직 첫 응답이 오지 않은 사업장 `[사용자 지적 2026-09-07]`.
   *
   * **없으면 «초과 0건»이라 주장한다.** 대기 중에는 계열이 비어 있고, `countOverLimit`은
   * 기준이 있는 항목에서 빈 배열을 «걸러 보니 0건»으로 세기 때문이다 — 확인하지 않은 것이
   * 안전으로 둔갑한다(**E4**). 그 자리는 `null`이어야 하고 표가 `—`로 적는다.
   */
  pendingSites: ReadonlySet<string> = new Set(),
): SupervisionRow[] {
  const idle = new Map(
    idleDischargeAcross(sites.map((site) => site.id)).map((v) => [v.siteId, v.runs]),
  );

  const rows = sites.map((site) => ({
    site,
    status: site.status,
    anomalyScore: site.anomalyScore,
    ...countOverLimitIn(site, limitsOf(site.id), seriesBySite.get(site.id) ?? [], pendingSites),
    idleRuns: idle.get(site.id) ?? null,
    openAlarms: countOpen(alarms, site.id),
  }));

  return rows.sort(
    (a, b) =>
      severityRank(a.status) - severityRank(b.status) || b.openAlarms - a.openAlarms,
  );
}

/**
 * 수질 8종에서 기준을 넘긴 표본 수 — **법정과 시연을 따로 센다**.
 *
 * **`0`과 `null`을 가른다.** `0`은 *"확인했더니 없었다"* 이고 `null`은 *"확인할 수 없었다"* 다 —
 * 기준이 하나도 설정되지 않았거나 통신이 두절된 경우, 그리고 **아직 첫 응답을 기다리는
 * 경우**다(`pendingSites`). 셋을 같은 `0`으로 적으면 미설정·두절·대기가 안전으로 둔갑한다
 * (**E4** · `[TBD-45]`).
 *
 * **두 축을 더하지 않는다** `[사용자 요청 2026-09-28]`. 지금 시연에서는 pH만 법정이고
 * TOC·TN·TP는 시연 임계값이라, 합치면 「법정 기준 초과 3건」이 된다 — 그 셋 중 법령이
 * 뒷받침하는 것은 하나도 없다.
 */
function countOverLimitIn(
  site: Site,
  limits: DischargeLimitTable,
  points: MeasurementPoint[],
  pendingSites: ReadonlySet<string>,
): Pick<SupervisionRow, 'overLimit' | 'overProvisional'> {
  if (!site.online || pendingSites.has(site.id)) {
    return { overLimit: null, overProvisional: null };
  }

  let legal: number | null = null;
  let provisional: number | null = null;

  for (const code of WATER_SERIES_CODES) {
    const { count, basis } = countOverLimit(points, code, limits);
    if (count === null) continue;
    if (basis === 'legal') legal = (legal ?? 0) + count;
    if (basis === 'provisional') provisional = (provisional ?? 0) + count;
  }

  return { overLimit: legal, overProvisional: provisional };
}
