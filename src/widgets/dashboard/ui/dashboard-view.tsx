'use client';

import { useMemo } from 'react';
import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { FORECAST_HORIZON_HOURS } from '@/shared/config/measurement';
import { PROVISIONAL_DISPLAY_DECIMALS } from '@/shared/config/provisional';
import { STATUS_VISUAL, statusInk } from '@/shared/config/status-visual';
import { formatDateTime } from '@/shared/lib/format';
import { getOutageWindow } from '@/shared/lib/timeline';
import { AnomalyBandLegend } from '@/shared/ui/anomaly-band-legend';
import { Panel } from '@/shared/ui/panel';
import { CountUp, RiseItem, StaggerGroup } from '@/shared/ui/motion';
import { StatusBadge } from '@/shared/ui/status-badge';
import {
  ALARMS,
  countByPriorityIn,
  countOpen,
  getAlarmsForView,
  openCountBySite,
} from '@/entities/alarm';
import { ALARM_PRIORITY_LABELS, type AlarmPriority } from '@/entities/alarm';
import { getAnomalySeries, getAnomalySummary } from '@/entities/anomaly';
import { getEquipment } from '@/entities/equipment';
import { WATER_SERIES_CODES, getMeasurementSeries } from '@/entities/measurement';
import { TREND_LABELS, formatR2, getForecast } from '@/entities/prediction';
import { SITES, getSite } from '@/entities/site';
import { useAlarmStates } from '@/features/alarm-ack';
import { useSelectedSiteId } from '@/features/site-selection';
import { AlarmList } from '@/widgets/alarm-list';
import { AnomalyPanel } from '@/widgets/anomaly-panel';
import { AnomalyTimeline } from '@/widgets/anomaly-timeline';
import { EquipmentPanel } from '@/widgets/equipment-panel';
import { ForecastChart } from '@/widgets/forecast-chart';
import { SiteMapLegend, SiteMapPanel } from '@/widgets/site-map';
import { SiteWallboard } from '@/widgets/site-wallboard';
import { WaterQualityGrid } from '@/widgets/water-quality-grid';

export function DashboardView() {
  const { siteId: selectedSiteId, setSiteId: setSelectedSiteId } = useSelectedSiteId();

  const site = getSite(selectedSiteId);
  /* 확인 처리가 헤더 알림·사이드바와 함께 반영되도록 공유 상태를 읽는다 */
  const { alarms: allAlarms } = useAlarmStates(ALARMS);
  const alarmCounts = openCountBySite(allAlarms);
  /* 통합 관제는 운영자 전용(회의 2026-08-13)이라 전 사업장 집계가 맞다 */
  const totalOpen = countOpen(allAlarms);
  const priorityCounts = countByPriorityIn(allAlarms);

  // 사업장을 바꿀 때마다 시계열을 새로 만든다. 선택이 바뀔 때만 계산한다.
  const detail = useMemo(
    () => ({
      series: getMeasurementSeries(selectedSiteId),
      anomalySeries: getAnomalySeries(selectedSiteId),
      anomalySummary: getAnomalySummary(selectedSiteId),
      forecast: getForecast(selectedSiteId),
      equipment: getEquipment(selectedSiteId),
      alarmIds: new Set(getAlarmsForView(selectedSiteId).map((a) => a.id)),
      outage: getOutageWindow(selectedSiteId),
    }),
    [selectedSiteId],
  );

  return (
    /* 지도는 스크롤해도 남는 좌측 레일에 둔다. 상세를 보는 동안에도 전체 위치가 보여야 한다.
       544 = 지도 영역 510 + 패널 좌우 패딩 16×2 + 보더 1×2.
       1280 미만에서는 레일을 만들지 않는다 — 1024에서 나누면 오른쪽에 210px밖에 남지 않아
       KPI 타일이 44px로 뭉개진다. 대신 지도가 본문 위에 전폭으로 놓인다. */
    <div className="grid gap-3 xl:grid-cols-[544px_minmax(0,1fr)]">
      {/* eyebrow에 역할이 아니라 범위를 적는다. 역할은 사이드바가 보여주고, 이 화면은
          운영자 전용이라 역할명을 박아 두면 역할을 바꿔도 남아 어긋난다(회의 2026-08-13) */}
      <Panel
        eyebrow="전 사업장"
        title="사업장 위치"
        action={<SiteMapLegend />}
        className="xl:sticky xl:top-[104px] xl:self-start"
      >
        <SiteMapPanel sites={SITES} selectedId={selectedSiteId} onSelect={setSelectedSiteId} />
      </Panel>

      <div className="min-w-0 space-y-4">
        <Panel
          eyebrow={`실증 ${SITES.length}개소`}
          title="사업장 현황"
          action={<span className="text-[12px] text-fg-subtle">지도 핀 또는 카드로 선택</span>}
        >
          <SiteWallboard
            sites={SITES}
            selectedId={selectedSiteId}
            onSelect={setSelectedSiteId}
            alarmCounts={alarmCounts}
          />
        </Panel>

        <StaggerGroup className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <RiseItem>
            <KpiTile
              label="선택 사업장 이상 점수"
              value={site.anomalyScore}
              suffix="/100"
              accent={site.status ? statusInk(STATUS_VISUAL[site.status]) : undefined}
              footer={site.status ? <StatusBadge level={site.status} size="sm" /> : '통신 두절'}
            />
          </RiseItem>
          <RiseItem>
            <KpiTile
              label="데이터 처리율"
              value={site.dataThroughput}
              decimals={PROVISIONAL_DISPLAY_DECIMALS.dataThroughput}
              suffix="%"
              footer="목표 ≥ 98%"
            />
          </RiseItem>
          <RiseItem>
            <KpiTile
              label="시스템 가동률"
              value={site.uptime}
              decimals={PROVISIONAL_DISPLAY_DECIMALS.uptime}
              suffix="%"
              footer="목표 ≥ 95%"
            />
          </RiseItem>
          <RiseItem>
            <KpiTile
              label="미확인 알람 (전체)"
              value={totalOpen}
              suffix="건"
              accent={totalOpen > 0 ? statusInk(STATUS_VISUAL.critical) : undefined}
              footer={
                Object.entries(priorityCounts)
                  .map(([p, n]) => `${ALARM_PRIORITY_LABELS[p as AlarmPriority]} ${n}`)
                  .join(' · ') || '없음'
              }
            />
          </RiseItem>
        </StaggerGroup>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-3">
            <Panel
              eyebrow={`${site.name} · ${site.region}`}
              title="수질·설비 실시간 계측"
              action={
                <span className="text-[12px] text-fg-subtle">최근 24시간 · 5분 주기 · KST</span>
              }
              bodyClassName="p-0"
            >
              <WaterQualityGrid data={detail.series} codes={WATER_SERIES_CODES} />
              <p className="max-w-[76ch] border-t border-border px-4 py-2.5 text-[12px] leading-relaxed text-fg-subtle">
                {!site.online
                  ? 'ECP 통신이 두절되어 수신값이 없습니다. 결측은 0으로 채우지 않고 비워 둡니다.'
                  : detail.outage
                    ? `${formatDateTime(detail.outage.fromIso)}–${formatDateTime(detail.outage.toIso)} 구간은 통신 두절로 수신값이 없습니다. 결측은 0으로 채우지 않고 끊어서 표시합니다.`
                    : '최근 24시간 동안 결측 구간이 없습니다.'}
              </p>
            </Panel>

            <Panel eyebrow="AutoEncoder" title="이상 점수 타임라인" action={<AnomalyBandLegend />}>
              <AnomalyTimeline data={detail.anomalySeries} outage={detail.outage} />
            </Panel>

            <Panel
              eyebrow="LSTM + Attention"
              title={`${detail.forecast.targetLabel} · 향후 ${FORECAST_HORIZON_HOURS}시간 예측`}
              action={
                <span className="max-w-[46ch] text-[12px] text-fg-subtle">
                  {detail.forecast.online
                    ? `산출 ${formatDateTime(detail.forecast.computedAtIso)} KST · 입력 ${detail.forecast.inputWindowLabel}`
                    : '통신 두절로 산출 중단'}
                </span>
              }
            >
              <ForecastChart summary={detail.forecast} nowIso={DEMO_NOW_ISO} />

              {/* 카드 안에 카드를 넣지 않는다 — 세로 구분선만으로 나눈다 */}
              <div className="mt-4 grid grid-cols-3 divide-x divide-border border-t border-border pt-3">
                {detail.forecast.trends.map((t) => (
                  <div key={t.code} className="px-3 first:pl-0 last:pr-0">
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-[11px] uppercase tracking-[0.1em] text-fg-subtle">
                        {t.code}
                      </span>
                      <span
                        className="text-[11px]"
                        style={{
                          color:
                            t.trend === 'rising'
                              ? statusInk(STATUS_VISUAL.warning)
                              : 'var(--fg-muted)',
                        }}
                      >
                        {t.trend === 'rising' ? '▲' : t.trend === 'falling' ? '▼' : '—'}{' '}
                        {TREND_LABELS[t.trend]}
                      </span>
                    </div>
                    <p className="num mt-1.5 text-[17px] leading-none text-fg">
                      {t.value === null ? '—' : t.value.toFixed(t.decimals)}
                      <span className="ml-1 text-[11px] text-fg-subtle">{t.unit}</span>
                    </p>
                    <p className="num mt-1 text-[11px] text-fg-subtle">
                      R² {formatR2(t.r2)} · AI 추정
                    </p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <div className="space-y-3">
            <Panel eyebrow={site.name} title="이상 탐지 결과">
              <AnomalyPanel summary={detail.anomalySummary} />
            </Panel>

            <Panel eyebrow={`전체 미확인 ${totalOpen}건`} title="알람" bodyClassName="px-4 py-3">
              <AlarmList
                alarms={allAlarms.filter((a) => detail.alarmIds.has(a.id))}
                nowIso={DEMO_NOW_ISO}
                selectedSiteId={selectedSiteId}
              />
            </Panel>
          </div>
        </div>

        {/* 설비는 4대를 가로로 편다 — 세로로 쌓으면 오른쪽 열만 길어져 왼쪽 아래가 빈다 */}
        <Panel
          eyebrow="RandomForest · 예지보전"
          title={`설비 상태 · ${site.name}`}
          action={
            <span className="text-[12px] text-fg-subtle">유지관리 우선순위(MPI) 높은 순</span>
          }
        >
          <EquipmentPanel items={detail.equipment} online={site.online} />
        </Panel>
      </div>
    </div>
  );
}

interface KpiTileProps {
  label: string;
  value: number | null;
  decimals?: number;
  suffix?: string;
  accent?: string;
  footer?: React.ReactNode;
}

function KpiTile({ label, value, decimals = 0, suffix, accent, footer }: KpiTileProps) {
  return (
    <div className="rounded-[5px] border border-border bg-surface p-3 transition-colors duration-200 hover:border-border-strong">
      <p className="truncate text-[11px] text-fg-subtle">{label}</p>
      <p
        className="mt-1.5 text-[26px] font-semibold leading-none tracking-tight"
        style={{
          color: value === null ? 'var(--fg-subtle)' : (accent ?? 'var(--color-fg)'),
        }}
      >
        {value === null ? (
          <span className="num">—</span>
        ) : (
          <CountUp value={value} decimals={decimals} />
        )}
        {suffix && value !== null && (
          <span className="ml-1 text-[11px] font-normal text-fg-subtle">{suffix}</span>
        )}
      </p>
      <div className="mt-2 text-[11px] text-fg-subtle">{footer}</div>
    </div>
  );
}
