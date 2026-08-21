import { MEASUREMENT_ITEMS } from '@/shared/config/measurement';
import { csvCell, toCsvText } from '@/shared/lib/csv';
import { formatClock } from '@/shared/lib/format';
import {
  bucketByMinutes,
  summarizeSeries,
  type MeasurementPoint,
  type SeriesCode,
} from '@/entities/measurement';
import { BUCKET_MINUTES, STAT_LABELS, type BucketStat, type BucketUnit } from '../config/constants';

export interface BucketRow {
  startIso: string;
  /** 항목별 값. **`null`은 그 구간 전체가 결측**이며 0으로 채우지 않는다(E4) */
  values: Record<string, number | null>;
  /** 그 구간에서 빠진 표본 수 — 값만 보이면 몇 개로 낸 값인지 알 수 없다 */
  missingCount: number;
  totalCount: number;
}

/**
 * 구간 × 항목 리포트.
 *
 * 회의가 시계열을 리포트 형식으로 볼 수 있어야 한다고 정리했고 `[회의 2026-08-20]`,
 * **구간을 행으로 두는 것이 센서 리포트의 통상 형식이다** `[사용자 요청 2026-08-21]` —
 * 5분 표본 288개를 늘어놓으면 값을 읽는 것이 아니라 세는 일이 된다.
 *
 * **통계 계산을 새로 만들지 않는다.** `summarizeSeries`가 결측을 평균에서 빼고 건수로 세는
 * 규칙을 이미 갖고 있다 — 여기서 다시 만들면 같은 항목이 요약표와 구간표에서 다른 값을
 * 갖는다(E1).
 */
export function buildBucketReport(
  points: MeasurementPoint[],
  codes: readonly SeriesCode[],
  unit: BucketUnit,
  stat: BucketStat,
): BucketRow[] {
  return bucketByMinutes(points, BUCKET_MINUTES[unit]).map((bucket) => {
    const values: Record<string, number | null> = {};
    let missing = 0;

    for (const code of codes) {
      const stats = summarizeSeries(bucket.points, code);
      values[code] = stats[stat];
      /* 항목마다 결측이 다르다. 구간의 결측은 **가장 많이 빠진 항목**으로 센다 —
         평균을 내면 한 항목이 통째로 빠진 것이 묻힌다 */
      missing = Math.max(missing, stats.missingCount);
    }

    return {
      startIso: bucket.startIso,
      values,
      missingCount: missing,
      totalCount: bucket.points.length,
    };
  });
}

/**
 * 구간 리포트를 CSV로.
 *
 * 화면의 표와 **같은 값·같은 자릿수**를 낸다. 여기서 다시 계산하면 화면과 파일이 갈린다(E1).
 */
export function bucketReportToCsv(
  rows: readonly BucketRow[],
  codes: readonly SeriesCode[],
  stat: BucketStat,
): string {
  const headers = [
    '구간(KST)',
    ...codes.map((code) => {
      const item = MEASUREMENT_ITEMS[code];
      return `${item.symbol} ${STAT_LABELS[stat]}${item.unit ? `(${item.unit})` : ''}`;
    }),
    '결측표본',
    '전체표본',
  ];

  return toCsvText(
    headers,
    rows.map((row) => [
      formatClock(row.startIso),
      ...codes.map((code) => csvCell(row.values[code] ?? null, MEASUREMENT_ITEMS[code].decimals)),
      String(row.missingCount),
      String(row.totalCount),
    ]),
  );
}
