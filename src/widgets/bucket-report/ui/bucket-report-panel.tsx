'use client';

import { Download } from 'lucide-react';
import { MEASUREMENT_ITEMS } from '@/shared/config/measurement';
import { downloadCsv } from '@/shared/lib/csv';
import { formatClock, formatValue } from '@/shared/lib/format';
import { Panel } from '@/shared/ui/panel';
import { SegmentedControl } from '@/shared/ui/segmented-control';
import {
  BUCKET_OPTIONS,
  STAT_LABELS,
  STAT_OPTIONS,
  WINDOW_HOURS,
  buildBucketReport,
  bucketReportToCsv,
  sliceRecentHours,
  type BucketRow,
  type BucketStat,
  type BucketUnit,
  type MeasurementPoint,
  type SeriesCode,
} from '@/entities/measurement';

/**
 * 구간이 행인 센서 리포트.
 *
 * **두 화면이 같은 표를 쓴다** — 시계열 변화(SCR-OP-003)와 리포트(SCR-OP-008)
 * `[사용자 요청 2026-08-21: 해당 페이지 내에 '시계열 변화' 페이지와 같이 집계와 같은 리포트도 필요함]`.
 * 각자 만들면 같은 사업장의 같은 구간이 두 화면에서 다른 값으로 보인다 — 결측을 세는 규칙
 * 하나만 갈려도 그렇게 된다(**E1**).
 *
 * 요약표가 하루 전체를 한 줄로 접는 반면 이쪽은 **시간의 흐름**을 보인다. 5분 표본 288개를
 * 늘어놓으면 값을 읽는 것이 아니라 세는 일이 된다.
 *
 * 집계 단위·통계 선택은 **호출부가 들고 있다** — 시계열 화면은 URL(`?bucket=`·`?stat=`)에
 * 두고 리포트 화면은 자기 상태에 둔다. 이 컴포넌트가 URL을 읽으면 두 화면이 같은 쿼리 키를
 * 다투게 된다.
 */
export function BucketReportPanel({
  points,
  codes,
  hours,
  unit,
  stat,
  onUnitChange,
  onStatChange,
  siteName,
  baseIso,
}: {
  points: MeasurementPoint[];
  codes: readonly SeriesCode[];
  /** 볼 구간. 리포트 화면의 기간 필터가 이 값을 정한다 */
  hours: number;
  unit: BucketUnit;
  stat: BucketStat;
  onUnitChange: (next: BucketUnit) => void;
  onStatChange: (next: BucketStat) => void;
  siteName: string;
  /** CSV 파일명에 넣을 기준 시각 */
  baseIso: string;
}) {
  const window = sliceRecentHours(points, hours);
  const rows = buildBucketReport(window, codes, unit, stat);

  return (
    <Panel
      eyebrow={`${rows.length}구간 · ${codes.length}개 항목 · 최근 ${hours}시간`}
      title="구간별 집계"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            ariaLabel="집계 단위"
            options={BUCKET_OPTIONS}
            value={unit}
            onChange={onUnitChange}
          />
          <SegmentedControl
            ariaLabel="보이는 통계"
            options={STAT_OPTIONS}
            value={stat}
            onChange={onStatChange}
          />
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                `${siteName}_구간집계_${STAT_LABELS[stat]}_${baseIso.slice(0, 10)}.csv`,
                bucketReportToCsv(rows, codes, stat),
              )
            }
            className="flex cursor-pointer items-center gap-1.5 rounded-[4px] border border-border bg-surface px-2.5 py-1.5 text-[11px] text-fg-muted transition-colors duration-200 hover:border-border-strong hover:bg-surface-2 hover:text-fg"
          >
            <Download size={12} strokeWidth={2} />
            CSV 내보내기
          </button>
        </div>
      }
      bodyClassName="p-0"
    >
      <BucketTable rows={rows} codes={codes} stat={stat} />
      <p className="max-w-[80ch] border-t border-border px-4 py-2.5 text-[12px] leading-relaxed text-fg-subtle">
        구간마다 {STAT_LABELS[stat]}을 냅니다. 결측은 계산에서 빼고 건수로만 세며, 구간 전체가
        결측이면 <strong className="text-fg-muted">수신 없음</strong>입니다 — 0으로 채우면 값
        자체가 거짓이 됩니다. <strong className="text-fg-muted">일·월 집계는 없습니다</strong> —
        시연 데이터의 축적 구간이 {WINDOW_HOURS}시간이라 [원문 p.65] 일 단위로 묶으면 한 행뿐이고
        월은 만들 수 없습니다. 이력이 쌓이면 단위만 더하면 됩니다.
      </p>
    </Panel>
  );
}

function BucketTable({
  rows,
  codes,
  stat,
}: {
  rows: BucketRow[];
  codes: readonly SeriesCode[];
  stat: BucketStat;
}) {
  if (rows.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-[12px] text-fg-subtle">
        이 구간에 표본이 없습니다.
      </p>
    );
  }

  return (
    <div className="max-h-[560px] overflow-auto">
      <table className="w-full border-collapse text-[12px]">
        <caption className="sr-only">
          구간별 {STAT_LABELS[stat]}. 행은 구간 시작 시각, 열은 계측 항목이다.
        </caption>
        <thead className="sticky top-0 z-10 bg-surface">
          <tr className="border-b border-border text-[11px] text-fg-subtle">
            <th scope="col" className="sticky left-0 bg-surface px-4 py-2 text-left font-normal">
              구간
            </th>
            {codes.map((code) => (
              <th key={code} scope="col" className="px-3 py-2 text-right font-normal">
                {MEASUREMENT_ITEMS[code].symbol}
                {MEASUREMENT_ITEMS[code].unit && (
                  <span className="ml-1 text-fg-subtle">{MEASUREMENT_ITEMS[code].unit}</span>
                )}
              </th>
            ))}
            <th scope="col" className="px-4 py-2 text-right font-normal">
              결측
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.startIso} className="border-b border-border last:border-0">
              <th
                scope="row"
                className="num sticky left-0 bg-surface px-4 py-2 text-left font-normal text-fg-muted"
              >
                {formatClock(row.startIso)}
              </th>
              {codes.map((code) => (
                <td key={code} className="num px-3 py-2 text-right text-fg">
                  {/* 구간 전체가 결측이면 값이 아니라 사실을 적는다(E4) */}
                  {formatValue(code, row.values[code] ?? null)}
                </td>
              ))}
              <td className="num px-4 py-2 text-right text-fg-subtle">
                {row.missingCount}/{row.totalCount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
