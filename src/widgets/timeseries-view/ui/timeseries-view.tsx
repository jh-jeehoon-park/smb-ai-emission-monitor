'use client';

import { useMemo } from 'react';
import { COLLECTION_INTERVAL_MINUTES, MEASUREMENT_ITEMS } from '@/shared/config/measurement';
import { DISPLAY_TIMEZONE, formatDateTime, formatValue } from '@/shared/lib/format';
import { getOutageWindow } from '@/shared/lib/timeline';
import { Panel } from '@/shared/ui/panel';
import {
  getMeasurementSeries,
  sliceRecentHours,
  summarizeSeries,
  type SeriesCode,
  type SeriesStats,
} from '@/entities/measurement';
import { getSite } from '@/entities/site';
import { MeasurementFilterBar, useMeasurementFilter } from '@/features/measurement-filter';
import { useSelectedSiteId } from '@/features/site-selection';
import { WaterQualityGrid } from '@/widgets/water-quality-grid';

export function TimeseriesView() {
  const { siteId } = useSelectedSiteId();
  const filter = useMeasurementFilter();
  const site = getSite(siteId);

  const view = useMemo(() => {
    const points = sliceRecentHours(getMeasurementSeries(siteId), filter.hours);
    return {
      points,
      outage: getOutageWindow(siteId),
      stats: filter.codes.map((code) => ({ code, stats: summarizeSeries(points, code) })),
    };
  }, [siteId, filter.hours, filter.codes]);

  return (
    <div className="space-y-3">
      <Panel
        eyebrow={`${site.name} · ${site.region}`}
        title="수질·설비 시계열"
        action={<MeasurementFilterBar filter={filter} />}
        bodyClassName="p-0"
      >
        <WaterQualityGrid data={view.points} codes={filter.codes} />
        <p className="max-w-[80ch] border-t border-border px-4 py-2.5 text-[12px] leading-relaxed text-fg-subtle">
          최근 {filter.hours}시간 · {COLLECTION_INTERVAL_MINUTES}분 주기 · {DISPLAY_TIMEZONE}.{' '}
          {outageNotice(site.online, view.outage)}
        </p>
      </Panel>

      <Panel
        eyebrow={`${filter.codes.length}개 항목`}
        title="항목별 요약"
        action={
          <span className="text-[12px] text-fg-subtle">결측은 평균에서 제외하고 건수로 센다</span>
        }
        bodyClassName="p-0"
      >
        <StatsTable rows={view.stats} />
      </Panel>
    </div>
  );
}

function outageNotice(online: boolean, outage: { fromIso: string; toIso: string } | null): string {
  if (!online) {
    return 'ECP 통신이 두절되어 수신값이 없습니다. 결측은 0으로 채우지 않고 비워 둡니다.';
  }
  if (outage) {
    return `${formatDateTime(outage.fromIso)}–${formatDateTime(outage.toIso)} 구간은 통신 두절로 수신값이 없습니다.`;
  }
  return '이 구간에는 결측이 없습니다.';
}

function StatsTable({ rows }: { rows: { code: SeriesCode; stats: SeriesStats }[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-[12px]">
        <thead>
          <tr className="border-b border-border text-[11px] text-fg-subtle">
            <th className="px-4 py-2 text-left font-normal">항목</th>
            <th className="px-3 py-2 text-left font-normal">단위</th>
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
                  <span className="font-display text-fg">{item.symbol}</span>
                  <span className="ml-1.5 text-[11px] text-fg-subtle">{item.label}</span>
                </td>
                <td className="px-3 py-2 text-fg-subtle">{item.unit || '—'}</td>
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
