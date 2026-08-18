'use client';

import { Download } from 'lucide-react';
import { useMemo } from 'react';
import { PROVISIONAL_DISPLAY_DECIMALS, PROVISIONAL_STATUS_LABELS } from '@/shared/config/provisional';
import { STATUS_VISUAL, statusInk } from '@/shared/config/status-visual';
import { DISPLAY_TIMEZONE, formatDateTime } from '@/shared/lib/format';
import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { SCOPE_FILTERS, SCOPE_OPTIONS, SCOPE_QUERY_KEY } from '@/shared/config/scope';
import { useQueryState } from '@/shared/lib/use-query-state';
import { Panel } from '@/shared/ui/panel';
import { SegmentedControl } from '@/shared/ui/segmented-control';
import { StatTile } from '@/shared/ui/stat-tile';
import { StatusBadge } from '@/shared/ui/status-badge';
import { SITES, getSite } from '@/entities/site';
import { useSelectedSiteId } from '@/features/site-selection';
import { PERIOD_HOURS, PERIOD_OPTIONS, PERIOD_QUERY_KEY } from '@/features/measurement-filter';
import { buildSiteReport, toCsv, type SiteReportRow } from '../lib/build-report';

export function ReportsView() {
  const [period, setPeriod] = useQueryState(PERIOD_QUERY_KEY, PERIOD_HOURS, '24');
  const [scope, setScope] = useQueryState(SCOPE_QUERY_KEY, SCOPE_FILTERS, 'all');
  const { siteId } = useSelectedSiteId();
  const hours = Number(period);

  /**
   * 범위를 **URL로** 좁힌다. 역할로 행 수를 가르면 서버가 그린 표와 클라이언트가 그릴 표의
   * 행 수가 달라져 하이드레이션이 깨진다 — 서버는 역할을 모르지만 쿼리는 읽는다.
   * 관리자는 라우트 가드가 `scope=site`로 고정한다(회의 2026-08-13: 자사 1개소).
   */
  const allRows = useMemo(() => buildSiteReport(hours), [hours]);
  const rows = useMemo(
    () => (scope === 'site' ? allRows.filter((r) => r.siteId === siteId) : allRows),
    [allRows, scope, siteId],
  );

  const scopeLabel = scope === 'site' ? getSite(siteId).name : `실증 ${SITES.length}개소`;

  const totals = useMemo(
    () => ({
      urgent: rows.reduce((acc, r) => acc + r.alarmsByPriority.urgent, 0),
      alarms: rows.reduce((acc, r) => acc + r.totalAlarms, 0),
      offline: rows.filter((r) => !r.online).length,
      missing: rows.reduce((acc, r) => acc + r.missingCount, 0),
      noDischarge: rows.filter((r) => r.dischargeHours === 0).length,
    }),
    [rows],
  );

  const download = () => {
    const csv = toCsv(rows, PROVISIONAL_STATUS_LABELS);
    // 엑셀이 한글 CSV를 UTF-8로 인식하려면 BOM이 필요하다
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `배출관리_리포트_${DEMO_NOW_ISO.slice(0, 10)}_최근${hours}시간.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <Panel
        eyebrow={`${scopeLabel} · 최근 ${hours}시간`}
        title={scope === 'site' ? '배출 집계' : '사업장별 배출 집계'}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {/* 관리자는 자사 1개소뿐이라 고를 것이 없다 */}
            <div className="role-hide-admin">
              <SegmentedControl
                ariaLabel="집계 범위"
                options={SCOPE_OPTIONS}
                value={scope}
                onChange={setScope}
              />
            </div>
            <SegmentedControl
              ariaLabel="집계 기간"
              options={PERIOD_OPTIONS}
              value={period}
              onChange={setPeriod}
            />
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
        <ReportTable rows={rows} />

        {/* 무엇을 기준으로 센 값인지 적지 않으면 방류 열이 이상 점수까지 걸렀다고 읽힌다 */}
        <p className="border-t border-border px-4 py-2 text-[11px] leading-relaxed text-fg-subtle">
          이상 점수 통계는 <strong className="text-fg-muted">전 구간 기준</strong>입니다 — 방류
          여부로 거르지 않습니다. 이상 점수는 배출 수질이 아니라 공정 이상도이고, 방류하지 않는
          동안에도 설비는 돌기 때문입니다. 방류 시간은 <strong className="text-fg-muted">수신된
          표본</strong>에서만 세므로 결측이 있는 사업장은 그만큼 적게 잡힙니다.
        </p>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="집계 대상" value={`${rows.length}개소`} note={`최근 ${hours}시간`} />
        <StatTile
          label="누적 알람"
          value={`${totals.alarms}건`}
          note={`긴급 ${totals.urgent}건`}
          accent={totals.urgent > 0 ? statusInk(STATUS_VISUAL.critical) : undefined}
        />
        <StatTile
          label="통신 두절 사업장"
          value={`${totals.offline}개소`}
          note={totals.offline > 0 ? '해당 사업장은 집계에서 제외' : '집계 대상 전부 수신 중'}
          accent={totals.offline > 0 ? statusInk(STATUS_VISUAL.warning) : undefined}
        />
        <StatTile
          label="배출 없음"
          value={`${totals.noDischarge}개소`}
          note={
            totals.noDischarge > 0 ? '설비 가동 중 · 방류 0시간' : '집계 대상 전부 방류 이력 있음'
          }
          accent={totals.noDischarge > 0 ? statusInk(STATUS_VISUAL.caution) : undefined}
        />
      </div>

      <Panel eyebrow="원문 미정 항목" title="이 리포트가 정하지 않은 것">
        <p className="max-w-[86ch] text-[12px] leading-relaxed text-fg-muted">
          원문은 &ldquo;유지관리·리포트·운영지원 포함 통합 서비스&rdquo;라고만 적고{' '}
          <strong className="text-fg">리포트 항목·양식·발행 주기를 규정하지 않았다</strong>(FR-38).
          그래서 여기서는 화면에 이미 있는 값만 모아 보여주고, 일간·주간·월간 같은 주기나 법정
          서식은 임의로 만들지 않았다. 집계 구간도 시연 데이터가 가진 축적 구간 24시간 안에서만
          고른다. 기준 시각은 {formatDateTime(DEMO_NOW_ISO)} {DISPLAY_TIMEZONE}이다.
        </p>
      </Panel>
    </div>
  );
}

/**
 * 방류 시간.
 *
 * **0시간과 모름은 다른 상태다** — 0은 "설비는 돌았는데 배출은 없었다"는 관측이고,
 * 두절은 애초에 받지 못한 것이다. 두절을 0으로 적으면 배출이 없었다고 주장하게 된다(E4).
 */
function DischargeCell({ hours, windowHours }: { hours: number | null; windowHours: number }) {
  if (hours === null) return <span className="text-[11px] text-fg-subtle">—</span>;

  if (hours === 0) {
    return (
      <span className="text-[11px]" style={{ color: statusInk(STATUS_VISUAL.caution) }}>
        배출 없음
      </span>
    );
  }

  return (
    <span className="num text-fg-muted">
      {/* 올리지 않는다 — 23.9시간을 24로 적으면 확인되지 않은 시간을 방류로 주장하게 된다 */}
      {Math.floor(hours)}
      <span className="text-fg-subtle">/{windowHours}h</span>
    </span>
  );
}

function ReportTable({ rows }: { rows: SiteReportRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-[12px]">
        <thead>
          <tr className="border-b border-border text-[11px] text-fg-subtle">
            <th className="px-4 py-2 text-left font-normal">사업장</th>
            <th className="px-3 py-2 text-left font-normal">상태</th>
            <th className="px-3 py-2 text-right font-normal">방류</th>
            <th className="px-3 py-2 text-right font-normal">최신</th>
            <th className="px-3 py-2 text-right font-normal">최대</th>
            <th className="px-3 py-2 text-right font-normal">평균</th>
            <th className="px-3 py-2 text-right font-normal">결측</th>
            <th className="px-3 py-2 text-right font-normal">알람 (긴급·주의·정보)</th>
            <th className="px-3 py-2 text-right font-normal">처리율</th>
            <th className="px-4 py-2 text-right font-normal">가동률</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const ink = row.status ? statusInk(STATUS_VISUAL[row.status]) : 'var(--fg-subtle)';
            return (
              <tr key={row.siteId} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5">
                  <span className="block text-fg">{row.siteName}</span>
                  <span className="block text-[11px] text-fg-subtle">
                    {row.region} · {row.industry}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  {row.status ? (
                    <StatusBadge level={row.status} size="sm" />
                  ) : (
                    <span className="text-[11px] text-fg-subtle">수신 없음</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <DischargeCell hours={row.dischargeHours} windowHours={row.windowHours} />
                </td>
                <td className="num px-3 py-2.5 text-right" style={{ color: ink }}>
                  {row.latestScore ?? '—'}
                </td>
                <td className="num px-3 py-2.5 text-right text-fg-muted">{row.maxScore ?? '—'}</td>
                <td className="num px-3 py-2.5 text-right text-fg-muted">
                  {row.avgScore === null
                    ? '—'
                    : row.avgScore.toFixed(PROVISIONAL_DISPLAY_DECIMALS.anomalyScoreAverage)}
                </td>
                <td className="num px-3 py-2.5 text-right text-fg-subtle">
                  {row.missingCount > 0 ? `${row.missingCount}/${row.totalCount}` : '없음'}
                </td>
                <td className="num px-3 py-2.5 text-right text-fg-muted">
                  {row.alarmsByPriority.urgent} · {row.alarmsByPriority.caution} ·{' '}
                  {row.alarmsByPriority.info}
                </td>
                <td className="num px-3 py-2.5 text-right text-fg-muted">
                  {row.dataThroughput.toFixed(PROVISIONAL_DISPLAY_DECIMALS.dataThroughput)}%
                </td>
                <td className="num px-4 py-2.5 text-right text-fg-muted">
                  {row.uptime.toFixed(PROVISIONAL_DISPLAY_DECIMALS.uptime)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
