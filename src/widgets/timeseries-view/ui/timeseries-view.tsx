'use client';

import { Download } from 'lucide-react';
import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { csvFileName, downloadCsv } from '@/shared/lib/csv';
import { useMemo } from 'react';
import {
  LEGAL_CHECK_ITEMS,
  UNRESOLVED_LIMIT_TEXT,
  formatLimitRange,
  type DischargeLimitTable,
} from '@/shared/config/discharge-limits';
import { COLLECTION_INTERVAL_MINUTES, MEASUREMENT_ITEMS } from '@/shared/config/measurement';
import { DISPLAY_TIMEZONE, formatDateTime, formatValue } from '@/shared/lib/format';
import { useQueryState } from '@/shared/lib/use-query-state';
import { getOutageWindow } from '@/shared/lib/timeline';
import { Panel } from '@/shared/ui/panel';
import {
  getMeasurementSeries,
  sliceRecentHours,
  summarizeSeries,
  type SeriesCode,
  type SeriesStats,
  BUCKET_UNITS,
  BUCKET_STATS,
  DEFAULT_BUCKET,
  DEFAULT_STAT,
} from '@/entities/measurement';
import { getSite } from '@/entities/site';
import { MeasurementFilterBar, useMeasurementFilter } from '@/features/measurement-filter';
import { useSelectedSiteId } from '@/features/site-selection';
import { useDischargeLimits } from '@/features/discharge-limit-settings';
import { WaterQualityGrid } from '@/widgets/water-quality-grid';
import { BucketReportPanel } from '@/widgets/bucket-report';
import { BUCKET_QUERY_KEY, STAT_QUERY_KEY } from '../config/constants';
import { statsToCsv } from '../lib/stats-csv';

export function TimeseriesView() {
  const { siteId } = useSelectedSiteId();
  const filter = useMeasurementFilter();
  const site = getSite(siteId);
  /* 사용자가 설정한 기준치와 사업장 분류. `site`의 두 축을 직접 읽으면 설정 후에도 `미확인`이 남는다 */
  const limits = useDischargeLimits();

  const view = useMemo(() => {
    const points = sliceRecentHours(getMeasurementSeries(siteId), filter.hours);
    return {
      points,
      outage: getOutageWindow(siteId),
      stats: filter.codes.map((code) => ({ code, stats: summarizeSeries(points, code) })),
    };
  }, [siteId, filter.hours, filter.codes]);

  const download = () =>
    downloadCsv(
      csvFileName('시계열요약', DEMO_NOW_ISO, filter.hours),
      statsToCsv(view.stats, limits.table),
    );

  /*
   * **구간이 행인 리포트.** 센서 데이터 리포트의 통상 형식이다 `[사용자 요청 2026-08-21]` —
   * 항목별 요약이 하루 전체를 한 줄로 접는 반면 이쪽은 시간의 흐름을 보인다.
   */
  const [bucket, setBucket] = useQueryState(BUCKET_QUERY_KEY, BUCKET_UNITS, DEFAULT_BUCKET);
  const [stat, setStat] = useQueryState(STAT_QUERY_KEY, BUCKET_STATS, DEFAULT_STAT);

  return (
    <div className="space-y-3">
      <Panel
        eyebrow={`${site.name} · ${site.region}`}
        title="수질·설비 시계열"
        action={<MeasurementFilterBar filter={filter} />}
        bodyClassName="p-0"
      >
        <WaterQualityGrid data={view.points} codes={filter.codes} limits={limits.table} />
        <p className="max-w-[80ch] border-t border-border px-4 py-2.5 text-[12px] leading-relaxed text-fg-subtle">
          최근 {filter.hours}시간 · {COLLECTION_INTERVAL_MINUTES}분 주기 · {DISPLAY_TIMEZONE}.{' '}
          {outageNotice(site.online, view.outage)}
        </p>
      </Panel>

      {/*
       * **구간이 행인 리포트.** 아래 요약표가 하루 전체를 한 줄로 접는 반면 이쪽은 시간의
       * 흐름을 보인다 — 센서 데이터 리포트의 통상 형식이다 `[사용자 요청 2026-08-21]`.
       *
       * 리포트 화면(SCR-OP-008)도 같은 표를 쓴다 — 각자 만들면 같은 구간이 두 화면에서
       * 다른 값으로 보인다(E1).
       */}
      <BucketReportPanel
        points={view.points}
        codes={filter.codes}
        hours={filter.hours}
        unit={bucket}
        stat={stat}
        onUnitChange={setBucket}
        onStatChange={setStat}
        siteName={site.name}
        baseIso={DEMO_NOW_ISO}
      />

      <Panel
        eyebrow={`${filter.codes.length}개 항목 · 전 구간`}
        title="항목별 요약"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-fg-subtle">
              결측은 평균에서 제외하고 건수로 센다
            </span>
            {/*
              * **리포트 형식으로도 볼 수 있어야 한다** `[회의 2026-08-20]`. 리포트 화면과
              * 같은 CSV 유틸을 쓴다(`shared/lib/csv`) — 화면마다 따로 만들면 한쪽이 BOM을
              * 잃거나 파일명 규칙이 갈린다.
              */}
            <button
              type="button"
              onClick={download}
              className="flex cursor-pointer items-center gap-1.5 rounded-[4px] border border-border bg-surface px-2.5 py-1.5 text-[11px] text-fg-muted transition-colors duration-200 hover:border-border-strong hover:bg-surface-2 hover:text-fg"
            >
              <Download size={12} strokeWidth={2} />
              CSV 내보내기
            </button>
          </div>
        }
        bodyClassName="p-0"
      >
        <StatsTable rows={view.stats} limits={limits.table} />
        {/*
         * 기준값을 화면이 확정 기준처럼 보이게 하면 안 된다 — `[공정자료 p.11]`이 통상 범위라고
         * 적었고, 적용 구간은 사업장마다 허가증으로 갈린다. 나머지 항목은 표를 고를 2축
         * (지역구분·배출량 규모)이 없어 아예 판정하지 않는다.
         */}
        <div className="max-w-[80ch] space-y-2 border-t border-border px-4 py-2.5 text-[12px] leading-relaxed text-fg-subtle">
          <p>
            pH 기준 5.80–8.60은 통상 적용 범위이며, 정확한 구간은 사업장 폐수배출시설
            설치허가(신고)증에서 확인한다 [공정자료 p.11]. 나머지 항목은 아래 두 축이 정해져야
            기준표를 고를 수 있다 —{' '}
            <span className="text-fg-muted">
              지역구분 {limits.classification.regionGrade ?? '미확인'} · 배출량 규모{' '}
              {limits.classification.dischargeScale ?? '미확인'}
            </span>{' '}
            [TBD-45].
          </p>

          {/*
           * 법정 점검 5항목을 그대로 적고 보유 여부를 표시한다. 우리가 가진 것만 적으면
           * **SS를 못 본다는 사실이 화면에서 사라진다** — 탁도는 물리 지표일 뿐 SS가 아니다.
           */}
          <p>
            법정 방류기준 점검 대상 [공정자료 p.5·19] —{' '}
            {LEGAL_CHECK_ITEMS.map((item, i) => (
              <span key={item.label}>
                {i > 0 && ' · '}
                <span className={item.code === null ? 'text-caution-ink' : 'text-fg-muted'}>
                  {item.label}
                  {item.code === null && '(계측 없음)'}
                </span>
              </span>
            ))}
            . SS는 계측·추정 대상이 아니라 이 화면에서 확인할 수 없다.
          </p>
        </div>
      </Panel>
    </div>
  );
}

/**
 * 구간 × 항목 표.
 *
 * **통계 하나만 보인다.** 11항목 × 3통계 = 33열은 표가 아니라 벽이다 — 어느 통계를 볼지는
 * 위 세그먼트가 정한다.
 *
 * 시각을 왼쪽에 고정한다(`sticky`). 항목이 11개면 가로로 넘치는데 시각이 함께 밀려나면
 * 어느 구간의 값인지 알 수 없다.
 */
function outageNotice(online: boolean, outage: { fromIso: string; toIso: string } | null): string {
  if (!online) {
    return 'ECP 통신이 두절되어 수신값이 없습니다. 결측은 0으로 채우지 않고 비워 둡니다.';
  }
  if (outage) {
    return `${formatDateTime(outage.fromIso)}–${formatDateTime(outage.toIso)} 구간은 통신 두절로 수신값이 없습니다.`;
  }
  return '이 구간에는 결측이 없습니다.';
}

/**
 * 기준을 아는 항목만 값을 적는다.
 *
 * 세 상태를 구분한다 — **판정 가능**(pH), **기준표 미확보**(TOC), **기준 대상 아님**(수온·전류 등).
 * 셋을 모두 `—`로 적으면 "기준이 없는 항목"과 "기준을 모르는 항목"이 같아 보인다(E4).
 */
function limitText(code: SeriesCode, decimals: number, table: DischargeLimitTable): string {
  const limit = table[code];
  if (!limit) return '—';
  /* 상한만 있는 항목도 값이 있으면 적는다 — `≤ 40.0` 꼴 */
  return formatLimitRange(limit, decimals) ?? UNRESOLVED_LIMIT_TEXT;
}

function StatsTable({
  rows,
  limits,
}: {
  rows: { code: SeriesCode; stats: SeriesStats }[];
  /** 기준표는 사업장 설정에서 온다 — 화면이 자기 값을 갖지 않는다 */
  limits: DischargeLimitTable;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-[12px]">
        <thead>
          <tr className="border-b border-border text-[11px] text-fg-subtle">
            <th className="px-4 py-2 text-left font-normal">항목</th>
            <th className="px-3 py-2 text-left font-normal">단위</th>
            <th className="px-3 py-2 text-left font-normal">배출허용기준</th>
            <th className="px-3 py-2 text-right font-normal">최소</th>
            <th className="px-3 py-2 text-right font-normal">평균</th>
            <th className="px-3 py-2 text-right font-normal">최대</th>
            <th className="px-3 py-2 text-right font-normal">최신</th>
            <th className="px-4 py-2 text-right font-normal">결측</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ code, stats }) => {
            const item = MEASUREMENT_ITEMS[code];
            return (
              <tr key={code} className="border-b border-border last:border-0">
                <td className="px-4 py-2">
                  <span className="font-semibold text-fg">{item.symbol}</span>
                  <span className="ml-1.5 text-[11px] text-fg-subtle">{item.label}</span>
                </td>
                <td className="px-3 py-2 text-fg-subtle">{item.unit || '—'}</td>
                <td className="num px-3 py-2 text-fg-subtle">{limitText(code, item.decimals, limits)}</td>
                <td className="num px-3 py-2 text-right text-fg-muted">
                  {formatValue(code, stats.min)}
                </td>
                <td className="num px-3 py-2 text-right text-fg">{formatValue(code, stats.avg)}</td>
                <td className="num px-3 py-2 text-right text-fg-muted">
                  {formatValue(code, stats.max)}
                </td>
                <td className="num px-3 py-2 text-right text-fg">
                  {formatValue(code, stats.latest)}
                </td>
                <td className="num px-4 py-2 text-right text-fg-subtle">
                  {stats.missingCount > 0 ? `${stats.missingCount}/${stats.totalCount}` : '없음'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
