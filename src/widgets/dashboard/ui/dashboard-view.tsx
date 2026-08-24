'use client';

import { useMemo, useState } from 'react';
import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { PROVISIONAL_DISPLAY_DECIMALS } from '@/shared/config/provisional';
import { isOverLimit } from '@/shared/config/discharge-limits';
import { STATUS_VISUAL, statusInk } from '@/shared/config/status-visual';
import { formatDateTime } from '@/shared/lib/format';
import { getOutageWindow } from '@/shared/lib/timeline';
import { AnomalyBandLegend } from '@/shared/ui/anomaly-band-legend';
import { Modal } from '@/shared/ui/modal';
import { Panel } from '@/shared/ui/panel';
import { CountUp, RiseItem, StaggerGroup } from '@/shared/ui/motion';
import { cn } from '@/shared/lib/cn';
import { StatusBadge } from '@/shared/ui/status-badge';
import { InfoTip } from '@/shared/ui/tooltip';
import { TILE_FOOTER, TILE_LABEL, TILE_SHELL, TILE_VALUE } from '@/shared/ui/stat-tile';
import {
  countByPriorityIn,
  countOpen,
  openAlarms,
  openCountBySite,
  type Alarm,
} from '@/entities/alarm';
import { ALARM_PRIORITY_LABELS, type AlarmPriority } from '@/entities/alarm';
import { getAnomalySeries, getAnomalySummary } from '@/entities/anomaly';
import { getEquipment } from '@/entities/equipment';
import { WATER_SERIES_CODES, getMeasurementSeries, outageNotice } from '@/entities/measurement';
import {
  SERIES_ORIGIN_LABELS,
  SERIES_WINDOW_HOURS,
  TrendChip,
  formatR2,
  getForecast,
  trendVerdict,
} from '@/entities/prediction';
import { SITES, getSite } from '@/entities/site';
import { ALL_ALARMS, allAlarmsForSite, useAlarmStates } from '@/features/alarm-ack';
import { SiteTabs, useSelectedSiteId } from '@/features/site-selection';
import { AlarmList } from '@/widgets/alarm-list';
import { AnomalyPanel } from '@/widgets/anomaly-panel';
import { AnomalyTimeline } from '@/widgets/anomaly-timeline';
import { EquipmentPanel } from '@/widgets/equipment-panel';
import { ForecastChart } from '@/widgets/forecast-chart';
import { SiteMapLegend, SiteMapPanel } from '@/widgets/site-map';
import { SiteWallboard } from '@/widgets/site-wallboard';
import { useDischargeLimits } from '@/features/discharge-limit-settings';
import { WaterQualityGrid } from '@/widgets/water-quality-grid';

export function DashboardView() {
  const { siteId: selectedSiteId, setSiteId: setSelectedSiteId } = useSelectedSiteId();
  /* 월보드 카드를 누른 사업장. 선택(상세 대상)과 **다른 축이다** — 알람만 열고 닫는다 */
  const [alarmSiteId, setAlarmSiteId] = useState<string | null>(null);

  const site = getSite(selectedSiteId);
  /* 사용자가 설정한 기준치. 화면마다 따로 읽으면 같은 항목이 화면마다 다른 기준을 갖는다 */
  const limits = useDischargeLimits();
  /* 확인 처리가 헤더 알림·사이드바와 함께 반영되도록 공유 상태를 읽는다 */
  const { alarms: allAlarms } = useAlarmStates(ALL_ALARMS);
  const alarmCounts = openCountBySite(allAlarms);
  /* 통합 관제는 사업장 역할에 닫혀 있어(회의 2026-08-20) 전 사업장 집계가 맞다 */
  const totalOpen = countOpen(allAlarms);
  const priorityCounts = countByPriorityIn(allAlarms);
  const priorityBreakdown =
    Object.entries(priorityCounts)
      .map(([p, n]) => `${ALARM_PRIORITY_LABELS[p as AlarmPriority]} ${n}`)
      .join(' · ') || null;

  // 사업장을 바꿀 때마다 시계열을 새로 만든다. 선택이 바뀔 때만 계산한다.
  const detail = useMemo(
    () => ({
      series: getMeasurementSeries(selectedSiteId),
      anomalySeries: getAnomalySeries(selectedSiteId),
      anomalySummary: getAnomalySummary(selectedSiteId),
      forecast: getForecast(selectedSiteId),
      equipment: getEquipment(selectedSiteId),
      alarmIds: new Set(allAlarmsForSite(selectedSiteId).map((a) => a.id)),
      outage: getOutageWindow(selectedSiteId),
    }),
    [selectedSiteId],
  );

  return (
    /* 지도는 스크롤해도 남는 좌측 레일에 둔다. 상세를 보는 동안에도 전체 위치가 보여야 한다.
       500 = 지도 영역 + 패널 좌우 패딩 20×2. 지도는 `w-full max-w-[510px]`로 유동이라
       이 폭에서 460px로 그려진다 — 사이드바가 280px이 되면서 1280px의 오른쪽 열이
       384px(타일 2열의 하한)까지 내려갈 참이었다. 지도 44px을 내주고 본문 폭을 지킨다.
       1280 미만에서는 레일을 만들지 않는다 — 1024에서 나누면 오른쪽에 210px밖에 남지 않아
       KPI 타일이 44px로 뭉개진다. 대신 지도가 본문 위에 전폭으로 놓인다. */
    <div className="space-y-6">
      {/*
       * **사업장 현황이 맨 위 전폭이다** `[사용자 지시 2026-08-24]`. 전 사업장을 한눈에
       * 보는 것이 이 화면의 첫 목적이라, 상세 레일 안에 끼워 넣으면 10개소가 2열까지 접힌다.
       */}
      <Panel
        title="사업장 현황 요약"
        /*
         * **전체 미확인 알람을 여기에 둔다** `[사용자 지시 2026-08-24]`. 예전에는 지표 타일
         * 한 장이었는데, 그 타일들은 `선택 사업장`의 값이고 이것만 전 사업장 합계라 같은
         * 줄에서 축이 갈렸다. 카드마다 사업장별 건수가 이미 있어 그 합계가 놓일 자리는 이 머리다.
         */
        action={
          <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[12px]">
            <span className="text-fg-subtle">
              전체 미확인 알람{' '}
              <span
                className="num font-bold"
                style={{
                  color: totalOpen > 0 ? statusInk(STATUS_VISUAL.critical) : 'var(--color-fg)',
                }}
              >
                {totalOpen}
              </span>
              건
            </span>
            {priorityBreakdown && <span className="text-fg-subtle">{priorityBreakdown}</span>}
            <span className="text-fg-subtle">카드를 누르면 사업장별 알람</span>
          </div>
        }
      >
        <SiteWallboard sites={SITES} alarmCounts={alarmCounts} onOpenAlarms={setAlarmSiteId} />
      </Panel>

      {/*
       * 사업장 탭을 **지도 밖, 상세 격자 위**에 둔다 `[사용자 지시 2026-08-24]`.
       * 지도 머리에 두었을 때는 폭이 460px뿐이라 탭이 세 줄로 접혔다 — 여기서는 본문 전폭을
       * 써서 10개가 한 줄에 들어간다. 아래 격자 전체가 이 탭의 결과라는 것도 위치로 드러난다.
       */}
      <div className="space-y-3">
        {/*
         * 구역 제목. 화면명(h1) 아래 두 번째 단이라 그보다 작고, 카드 제목(15px)보다는 커야
         * 카드가 이 구역에 속한 것으로 읽힌다 `[사용자 지시 2026-08-24]`.
         */}
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <h2 className="text-[16px] font-bold leading-tight tracking-tight text-fg">
            사업장 상세
          </h2>
          <p className="text-[12px] text-fg-subtle">탭으로 고른 한 개소를 아래에서 자세히 본다</p>
        </div>
        <SiteTabs sites={SITES} selectedId={selectedSiteId} onSelect={setSelectedSiteId} />
      </div>

      {/* 지도는 스크롤해도 남는 좌측 레일에 둔다. 상세를 보는 동안에도 전체 위치가 보여야 한다.
          500 = 지도 영역 + 패널 좌우 패딩 20×2. 지도는 `w-full max-w-[510px]`로 유동이라
          이 폭에서 460px로 그려진다.
          1280 미만에서는 레일을 만들지 않는다 — 1024에서 나누면 오른쪽에 210px밖에 남지 않아
          KPI 타일이 44px로 뭉개진다. 대신 지도가 본문 위에 전폭으로 놓인다. */}
      <div className="grid gap-6 xl:grid-cols-[500px_minmax(0,1fr)]">
        <Panel
          title="사업장 위치"
          action={<SiteMapLegend />}
          className="xl:sticky xl:top-[calc(var(--header-h)_+_1.5rem)] xl:self-start"
        >
          <SiteMapPanel sites={SITES} selectedId={selectedSiteId} onSelect={setSelectedSiteId} />
        </Panel>

        <div className="@container min-w-0 space-y-6">
        {/* 타일 3장. 2열에서 셋째가 혼자 반 칸을 차지하지 않도록 그 칸만 넓힌다 */}
        <StaggerGroup className="grid grid-cols-1 gap-6 @sm:grid-cols-2 @2xl:grid-cols-3 [&>*:nth-child(3)]:@sm:col-span-2 [&>*:nth-child(3)]:@2xl:col-span-1">
          <RiseItem>
            <KpiTile
              label="선택 사업장 이상 점수"
              value={site.anomalyScore}
              suffix="/100"
              accent={site.status ? statusInk(STATUS_VISUAL[site.status]) : undefined}
              footer={site.status ? <StatusBadge level={site.status} /> : '통신 두절'}
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
        </StaggerGroup>

        <div className="grid gap-6 @3xl:grid-cols-[minmax(0,1fr)_calc((100%_-_3rem)/3)]">
          <div className="space-y-6">
            <Panel
              title="수질·설비 실시간 계측"
              action={
                <span className="flex items-center gap-2 text-[12px] text-fg-subtle">
                  최근 24시간 · 5분 주기 · KST
                  <InfoTip label="결측 표시 방식" content={outageNotice(site.online, detail.outage)} />
                </span>
              }
            >
              {/* 사업장 계열은 방류구 계열이라 기준을 적용한다 */}
              <WaterQualityGrid
                data={detail.series}
                codes={WATER_SERIES_CODES}
                limits={limits.table}
              />
            </Panel>

            <Panel title="이상 점수 타임라인" action={<AnomalyBandLegend />}>
              <AnomalyTimeline data={detail.anomalySeries} outage={detail.outage} />
            </Panel>

            <Panel
              title={`${detail.forecast.targetLabel} · 최근 ${SERIES_WINDOW_HOURS}시간 추이`}
              action={
                <span className="max-w-[46ch] text-[12px] text-fg-subtle">
                  {detail.forecast.online
                    ? `산출 ${formatDateTime(detail.forecast.computedAtIso)} KST · 입력 ${detail.forecast.inputWindowLabel}`
                    : '통신 두절로 산출 중단'}
                </span>
              }
            >
              <ForecastChart summary={detail.forecast} nowIso={DEMO_NOW_ISO} limits={limits.table} />

              {/* 카드 안에 카드를 넣지 않는다 — 세로 구분선만으로 나눈다 */}
              <div className="mt-4 grid grid-cols-3 divide-x divide-border border-t border-border pt-3">
{/*
                 * **농도를 적지 않는다** `[회의 2026-08-20]`. 이 화면만 숫자를 그대로 찍고
                 * 있었다 — 같은 결정이 오염도 추정·리포트에서는 지켜지는데 여기서만 깨지면
                 * 관제 화면을 보는 사람이 그 숫자를 계측된 농도로 읽는다(E3).
                 *
                 * 판정 문구·색·칩은 `entities/prediction`이 낸다. 위젯이 각자 분기를 들고
                 * 있던 동안 이 화면은 TOC(직접 계측)에도 `AI 추정`을 박아 놨다.
                 */}
                {detail.forecast.trends.map((t) => {
                  const verdict = trendVerdict(
                    t,
                    isOverLimit(t.code, t.value, limits.table),
                    limits.unresolvedReason,
                  );
                  return (
                    <div key={t.code} className="px-3 first:pl-0 last:pr-0">
                      <div className="flex items-baseline justify-between gap-1">
                        <span className="text-[11px] uppercase tracking-[0.1em] text-fg-subtle">
                          {t.code}
                        </span>
                        <TrendChip trend={t.trend} bare />
                      </div>
                      <p
                        className="mt-1.5 text-[14px] font-semibold leading-snug text-fg"
                        style={{ color: verdict.ink }}
                      >
                        {verdict.text}
                      </p>
                      <p className="num mt-1 text-[11px] text-fg-subtle">
                        R² {formatR2(t.r2)} · {SERIES_ORIGIN_LABELS[t.origin]}
                      </p>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel title="이상 탐지 결과">
              <AnomalyPanel summary={detail.anomalySummary} />
            </Panel>

            <Panel title="알람">
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
          title={`설비 상태 · ${site.name}`}
          action={<span className="text-[12px] text-fg-subtle">상태 나쁜 순</span>}
        >
          <EquipmentPanel items={detail.equipment} online={site.online} />
        </Panel>
        </div>
      </div>

      <SiteAlarmsModal
        siteId={alarmSiteId}
        alarms={allAlarms}
        onClose={() => setAlarmSiteId(null)}
      />
    </div>
  );
}

/**
 * 한 사업장의 **미확인 알람**만 모아 보여 준다 `[사용자 지시 2026-08-24]`.
 *
 * 월보드 카드를 누르면 열린다. 확인·조치 상태 전이는 알람 이력 화면의 몫이고 여기서는
 * "무엇이 남아 있는가"만 답한다 — 목록은 헤더 알림·사이드바와 **같은 상태**를 읽으므로
 * 다른 화면에서 확인 처리하면 이 숫자도 함께 준다.
 *
 * `siteId`가 `null`이면 닫힘이다. 컴포넌트를 조건부로 마운트하지 않는 이유는 Modal이
 * 닫힐 때 포커스를 열기 전 자리로 되돌리기 때문이다 — 언마운트하면 그 대상을 잃는다.
 */
function SiteAlarmsModal({
  siteId,
  alarms,
  onClose,
}: {
  siteId: string | null;
  alarms: Alarm[];
  onClose: () => void;
}) {
  const site = siteId ? getSite(siteId) : null;
  const open = siteId ? openAlarms(alarms, siteId) : [];

  return (
    <Modal
      open={siteId !== null}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={site ? `${site.name} · 미확인 알람 ${open.length}건` : '미확인 알람'}
    >
      {site && (
        <>
          <p className="mb-3 text-[12px] text-fg-subtle">
            {site.industry} · {site.region} ·{' '}
            {site.online ? '수신 중' : '통신 두절 — 마지막 수신 이후 값이 없습니다'}
          </p>
          <AlarmList alarms={open} nowIso={DEMO_NOW_ISO} selectedSiteId={site.id} />
        </>
      )}
    </Modal>
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
    <div className={TILE_SHELL}>
      <div className="flex items-start justify-between gap-2">
        <p className={cn('min-w-0', TILE_LABEL)}>{label}</p>
        <p
          className={TILE_VALUE}
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
            <span className="ml-1 text-[12px] font-normal text-fg-subtle">{suffix}</span>
          )}
        </p>
      </div>
      <div className={TILE_FOOTER}>{footer}</div>
    </div>
  );
}
