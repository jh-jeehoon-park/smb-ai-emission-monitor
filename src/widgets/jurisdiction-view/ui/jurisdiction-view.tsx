'use client';

import { useMemo } from 'react';
import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { COLLECTION_INTERVAL_MINUTES } from '@/shared/config/measurement';
import { PROVISIONAL_DISPLAY_DECIMALS } from '@/shared/config/provisional';
import { STATUS_VISUAL, statusInk } from '@/shared/config/status-visual';
import { DISPLAY_TIMEZONE } from '@/shared/lib/format';
import { getOutageWindow } from '@/shared/lib/timeline';
import { Panel } from '@/shared/ui/panel';
import { AnomalyBandLegend } from '@/shared/ui/anomaly-band-legend';
import { InfoTip } from '@/shared/ui/tooltip';
import { StickyBar } from '@/shared/ui/sticky-bar';
import { countOpen, openAlarms } from '@/entities/alarm';
import { getAnomalySeries, getAnomalySummary, tallyIdleDischarge } from '@/entities/anomaly';
import { getEquipment } from '@/entities/equipment';
import {
  FLOW_SERIES_CODES,
  WATER_SERIES_CODES,
  pointsBySite,
  useSiteSeries,
  useSitesSeries,
  outageNotice,
} from '@/entities/measurement';
import { SERIES_WINDOW_HOURS, getForecast } from '@/entities/prediction';
import { GOV_MUNICIPALITY } from '@/entities/user';
import { getSite } from '@/entities/site';
import { useDischargeLimits } from '@/features/discharge-limit-settings';
import { ALL_ALARMS, useAlarmStates } from '@/features/alarm-ack';
import { SiteTabs, useScopedSites, useSelectedSiteId } from '@/features/site-selection';
import { AlarmList } from '@/widgets/alarm-list';
import { AnomalyPanel } from '@/widgets/anomaly-panel';
import { AnomalyTimeline } from '@/widgets/anomaly-timeline';
import { EquipmentPanel } from '@/widgets/equipment-panel';
import { ForecastChart } from '@/widgets/forecast-chart';
import { IDLE_DISCHARGE_NOTE, IdleDischargePanel } from '@/widgets/anomaly-view';
import { LocatorInset, SiteMapLegend, SiteMapPanel } from '@/widgets/site-map';
import { SiteWallboard } from '@/widgets/site-wallboard';
import { WaterQualityGrid } from '@/widgets/water-quality-grid';
import { BYPASS_PIPE_NOTE } from '../config/constants';
import { buildSupervisionRows } from '../lib/supervision-rows';
import { SupervisionTable } from './supervision-table';

/**
 * 관내 감독 현황 — 기초지자체(`SCR-GU-001`).
 *
 * **통합 관제에서 무엇을 빼는 화면이 아니다.** 같은 구성에 범위를 관할로 좁히고 감독 항목을
 * 더한다 — `조회만 가능` `[원문 p.69]`은 **조작이 없다**는 뜻이지 볼 것이 적다는 뜻이 아니고,
 * 이 역할이 하는 일은 사업장을 **세부적으로 관리**하는 것이다 `[회의 2026-08-20]`.
 * 수질·추이·설비는 각각 기준 판정·사전 경고·방류 의심의 **근거**다(E3).
 */
export function JurisdictionView() {
  const { siteId, setSiteId } = useSelectedSiteId();
  /* 목록은 URL 범위가 정한다 — 라우트 가드가 `scope=municipality`를 박아 둔다 */
  const sites = useScopedSites();
  const site = getSite(siteId);
  const limits = useDischargeLimits();
  const { alarms: allAlarms } = useAlarmStates(ALL_ALARMS);

  /* 관내 알람만 센다. 셈 함수는 그대로 두고 목록을 좁혀 넘긴다 */
  const inMunicipality = useMemo(() => {
    const ids = new Set(sites.map((s) => s.id));
    return allAlarms.filter((alarm) => ids.has(alarm.siteId));
  }, [allAlarms, sites]);

  /* 관내 사업장 전부의 계열이 한 번에 필요하다 — 표의 기준 초과 건수가 계열에서 나온다 */
  const seriesBySite = useSitesSeries(useMemo(() => sites.map((s) => s.id), [sites]));

  const rows = useMemo(
    () => buildSupervisionRows(sites, inMunicipality, limits.table, pointsBySite(seriesBySite)),
    [sites, inMunicipality, limits.table, seriesBySite],
  );

  const { points: series } = useSiteSeries(siteId);

  const detail = useMemo(
    () => ({
      series,
      anomalySeries: getAnomalySeries(siteId),
      anomalySummary: getAnomalySummary(siteId),
      forecast: getForecast(siteId),
      equipment: getEquipment(siteId),
      outage: getOutageWindow(siteId),
    }),
    [siteId, series],
  );

  const online = sites.filter((s) => s.online).length;
  const idle = tallyIdleDischarge(rows.map((row) => ({ siteId: row.site.id, runs: row.idleRuns })));
  /* 감독자가 세는 단위는 건수가 아니라 **사업장**이다 */
  const needsAction = rows.filter(
    (row) => row.status === null || row.openAlarms > 0 || (row.overLimit ?? 0) > 0,
  ).length;

  return (
    <div className="space-y-6">
      {/* 관내 합계는 여기에만 둔다 — 아래 구역은 전부 선택 사업장 축이다 */}
      <Panel
        title={`관내 사업장 현황 — ${GOV_MUNICIPALITY}`}
        titleAside={
          <InfoTip
            label="이 화면의 범위"
            content={`관할 ${GOV_MUNICIPALITY} 안의 사업장만 다룹니다. 관할 밖 사업장은 이 화면과 메뉴 어디에서도 보이지 않습니다.`}
          />
        }
        action={
          <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[12px] text-fg-subtle">
            {/* **분모를 함께 적는다** — `수신 1`만 적으면 나머지가 두절인지 없는지 모른다(E4) */}
            <span>
              관내 <span className="num font-bold text-fg">{sites.length}</span>개소 · 수신{' '}
              <span className="num font-bold text-fg">{online}</span>/{sites.length}
            </span>
            <span>
              조치 필요{' '}
              <span
                className="num font-bold"
                style={{
                  color: needsAction > 0 ? statusInk(STATUS_VISUAL.warning) : 'var(--color-fg)',
                }}
              >
                {needsAction}
              </span>
              개소
            </span>
            <span>
              미확인{' '}
              <span
                className="num font-bold"
                style={{
                  color:
                    countOpen(inMunicipality) > 0
                      ? statusInk(STATUS_VISUAL.critical)
                      : 'var(--color-fg)',
                }}
              >
                {countOpen(inMunicipality)}
              </span>
              건
            </span>
            {/*
             * **두 수를 함께 낸다** — `의심 0개소`만 적으면 두절이 "깨끗함"으로 둔갑한다.
             * 두절된 사업장은 확인되지 않았을 뿐이다(E4).
             */}
            <span>
              방류 의심 <span className="num font-bold text-fg">{idle.suspected}</span>개소
              {idle.unjudged > 0 && (
                <span className="ml-1">
                  · 판정 불가 <span className="num font-bold text-fg">{idle.unjudged}</span>개소
                </span>
              )}
            </span>
          </div>
        }
      >
        <div className="space-y-4">
          <SiteWallboard
            sites={sites}
            selectedId={siteId}
            onCardClick={setSiteId}
            cardLabel={(s) => `${s.name} 상세 보기`}
            renderFooter={(s) => (
              <span className="text-[12px] text-fg-subtle">
                미확인 알람{' '}
                <span className="num font-bold text-fg">
                  {openAlarms(inMunicipality, s.id).length}
                </span>
                건
              </span>
            )}
          />

          {/* 카드는 훑기, 표는 비교 — 둘 다 관내 전체 축이라 한 판에 둔다 */}
          <div className="border-t border-border pt-3">
            <p className="mb-2 px-1 text-[12px] font-medium text-fg-subtle">
              관내 감독 표 — 조치 필요한 순
            </p>
            <SupervisionTable rows={rows} selectedId={siteId} onSelect={setSiteId} />
          </div>
        </div>
      </Panel>

      <section className="space-y-3 rounded-panel border border-card-border bg-section-bg p-4 lg:p-5">
        <StickyBar>
          <h2 className="text-[16px] font-bold leading-tight tracking-tight text-fg">
            선택 사업장 현황
          </h2>
          <InfoTip
            label="이 구역의 범위"
            content="아래 카드는 전부 위에서 고른 한 개소의 값입니다. 관내 합계는 이 구역이 아니라 위 판의 머리에 있습니다."
          />
          <SiteTabs sites={sites} selectedId={siteId} onSelect={setSiteId} />
        </StickyBar>

        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)] 2xl:grid-cols-[470px_minmax(0,1fr)]">
          <Panel
            title="사업장 위치"
            action={<SiteMapLegend density={false} />}
            className="xl:sticky xl:top-[calc(var(--header-h)_+_var(--sticky-bar-h,0px)_+_1.5rem)] xl:h-[calc(88svh_-_var(--sticky-bar-h,0px)_-_1.5rem)] xl:max-h-[753px] xl:self-start"
            bodyClassName="flex min-h-0 flex-col gap-3"
          >
            <SiteMapPanel
              sites={sites}
              selectedId={siteId}
              onSelect={setSiteId}
              municipality={GOV_MUNICIPALITY}
            />
            {/* 본지도가 시도 한 장이라 그것이 전국 어디인지는 이 인셋이 답한다 */}
            <LocatorInset municipality={GOV_MUNICIPALITY} sites={sites} />
          </Panel>

          <div className="@container min-w-0 space-y-6">
            <Panel title={`이상 탐지 결과 · ${site.name}`}>
              <div className="space-y-5">
                <AnomalyPanel
                  summary={detail.anomalySummary}
                  legend={<AnomalyBandLegend />}
                  metrics={[
                    {
                      label: '데이터 처리율',
                      value: `${site.dataThroughput.toFixed(PROVISIONAL_DISPLAY_DECIMALS.dataThroughput)}%`,
                      hint: '목표 98%',
                    },
                    {
                      label: '시스템 가동률',
                      value: `${site.uptime.toFixed(PROVISIONAL_DISPLAY_DECIMALS.uptime)}%`,
                      hint: '목표 95%',
                    },
                  ]}
                />
                <AnomalyTimeline data={detail.anomalySeries} outage={detail.outage} />
              </div>
            </Panel>

            {/* 배출허용기준이 수질에 걸린다 — 값이 없으면 판정만 있고 근거가 없다(E3) */}
            <Panel
              title="수질·설비 실시간 계측"
              titleAside={
                <InfoTip
                  label="이 카드를 읽는 법"
                  content={`최근 24시간 · ${COLLECTION_INTERVAL_MINUTES}분 주기 · ${DISPLAY_TIMEZONE}. ${outageNotice(site.online, detail.outage)}`}
                />
              }
            >
              <WaterQualityGrid
                data={detail.series}
                sections={[
                  { title: '수질 8종', codes: WATER_SERIES_CODES },
                  {
                    title: '유량 — 들어온 양과 나간 양',
                    codes: FLOW_SERIES_CODES,
                    diff: { of: ['inflow', 'flow'], label: '유입 − 유출' },
                  },
                ]}
                limits={limits.table}
                windowHours={SERIES_WINDOW_HOURS}
              />
            </Panel>

            {/* 선행 경보는 원문 요구다(FR-30) — 사후 적발보다 미리 아는 편이 낫다 */}
            <Panel title={`${detail.forecast.targetLabel} · 최근 ${SERIES_WINDOW_HOURS}시간 추이`}>
              <ForecastChart summary={detail.forecast} nowIso={DEMO_NOW_ISO} limits={limits.table} />
            </Panel>

            <Panel title={`관내 알람 · ${GOV_MUNICIPALITY}`}>
              {/* `selectedSiteId`를 주지 않는다 — 관내가 여럿이라 사업장명이 정보다 */}
              <AlarmList alarms={openAlarms(inMunicipality)} nowIso={DEMO_NOW_ISO} />
            </Panel>

            {/* 판정 조건이 `방류 중 ∧ 방지시설 미가동`이라 근거가 옆에 있어야 읽힌다 */}
            <Panel title={`설비 상태 · ${site.name}`}>
              <EquipmentPanel items={detail.equipment} online={site.online} />
            </Panel>

            <Panel
              title="방지시설 미가동 중 방류 의심"
              titleAside={<InfoTip label="판정 방법과 한계" content={IDLE_DISCHARGE_NOTE} />}
            >
              <IdleDischargePanel siteId={siteId} points={detail.series} />
              <p className="mt-3 max-w-[86ch] border-t border-border pt-2 text-[12px] leading-relaxed text-fg-subtle">
                {BYPASS_PIPE_NOTE}
              </p>
            </Panel>
          </div>
        </div>
      </section>
    </div>
  );
}
