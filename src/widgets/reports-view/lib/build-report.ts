import { COLLECTION_INTERVAL_MINUTES } from '@/shared/config/measurement';
import { PROVISIONAL_DISPLAY_DECIMALS } from '@/shared/config/provisional';
import type { StatusLevel } from '@/shared/config/provisional';
import { buildAnomalyScores } from '@/shared/lib/anomaly-score';
import { ALARMS, type AlarmPriority } from '@/entities/alarm';
import { SITES } from '@/entities/site';

const POINTS_PER_HOUR = 60 / COLLECTION_INTERVAL_MINUTES;

export interface SiteReportRow {
  siteId: string;
  siteName: string;
  region: string;
  industry: string;
  status: StatusLevel | null;
  online: boolean;
  latestScore: number | null;
  maxScore: number | null;
  avgScore: number | null;
  missingCount: number;
  totalCount: number;
  alarmsByPriority: Record<AlarmPriority, number>;
  totalAlarms: number;
  dataThroughput: number;
  uptime: number;
}

/**
 * 집계는 결측을 뺀 표본으로만 낸다. 결측을 0으로 세면 평균 이상 점수가 낮아져
 * 상태가 실제보다 좋아 보인다 — 리포트에서 가장 위험한 거짓말이다(E4).
 */
function summarizeScores(scores: (number | null)[]) {
  const values = scores.filter((s): s is number => s !== null);
  if (values.length === 0) {
    return { latest: null, max: null, avg: null, missingCount: scores.length };
  }
  return {
    latest: values[values.length - 1],
    max: Math.max(...values),
    avg: values.reduce((acc, v) => acc + v, 0) / values.length,
    missingCount: scores.length - values.length,
  };
}

function countAlarms(siteId: string): { byPriority: Record<AlarmPriority, number>; total: number } {
  const byPriority: Record<AlarmPriority, number> = { urgent: 0, caution: 0, info: 0 };
  let total = 0;

  for (const alarm of ALARMS) {
    if (alarm.siteId !== siteId) continue;
    byPriority[alarm.priority] += 1;
    total += 1;
  }
  return { byPriority, total };
}

export function buildSiteReport(hours: number): SiteReportRow[] {
  const window = Math.round(hours * POINTS_PER_HOUR);

  return SITES.map((site) => {
    const scores = buildAnomalyScores(site.id).slice(-window);
    const stats = summarizeScores(scores);
    const alarms = countAlarms(site.id);

    return {
      siteId: site.id,
      siteName: site.name,
      region: site.region,
      industry: site.industry,
      status: site.status,
      online: site.online,
      latestScore: stats.latest,
      maxScore: stats.max,
      avgScore: stats.avg,
      missingCount: stats.missingCount,
      totalCount: scores.length,
      alarmsByPriority: alarms.byPriority,
      totalAlarms: alarms.total,
      dataThroughput: site.dataThroughput,
      uptime: site.uptime,
    };
  });
}

const CSV_HEADERS = [
  '사업장ID',
  '사업장명',
  '지역',
  '업종',
  '상태등급',
  '최신 이상점수',
  '최대 이상점수',
  '평균 이상점수',
  '결측표본',
  '전체표본',
  '알람_긴급',
  '알람_주의',
  '알람_정보',
  '데이터처리율(%)',
  '가동률(%)',
];

/** 값이 없는 칸은 0이 아니라 빈 칸으로 둔다. 표에서 '—'로 보이는 것과 같은 뜻이어야 한다 */
const cell = (value: number | null, decimals = 0) =>
  value === null ? '' : value.toFixed(decimals);

export function toCsv(rows: SiteReportRow[], statusLabels: Record<StatusLevel, string>): string {
  const lines = [CSV_HEADERS.join(',')];

  for (const row of rows) {
    lines.push(
      [
        row.siteId,
        row.siteName,
        row.region,
        row.industry,
        row.status ? statusLabels[row.status] : '수신없음',
        cell(row.latestScore),
        cell(row.maxScore),
        cell(row.avgScore, PROVISIONAL_DISPLAY_DECIMALS.anomalyScoreAverage),
        String(row.missingCount),
        String(row.totalCount),
        String(row.alarmsByPriority.urgent),
        String(row.alarmsByPriority.caution),
        String(row.alarmsByPriority.info),
        row.dataThroughput.toFixed(PROVISIONAL_DISPLAY_DECIMALS.dataThroughput),
        row.uptime.toFixed(PROVISIONAL_DISPLAY_DECIMALS.uptime),
      ].join(','),
    );
  }

  return lines.join('\n');
}
