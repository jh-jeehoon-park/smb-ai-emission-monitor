'use client';

import { useMemo } from 'react';
import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { isOverLimit } from '@/shared/config/discharge-limits';
import { STATUS_VISUAL, statusInk } from '@/shared/config/status-visual';
import { DISPLAY_TIMEZONE, formatDateTime } from '@/shared/lib/format';
import { COLLECTION_INTERVAL_MINUTES } from '@/shared/config/measurement';
import { getOutageWindow } from '@/shared/lib/timeline';
import { AnomalyBandLegend } from '@/shared/ui/anomaly-band-legend';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Panel } from '@/shared/ui/panel';
import { StickyBar } from '@/shared/ui/sticky-bar';
import { InfoTip } from '@/shared/ui/tooltip';
import { countByPriorityIn, countOpen, openCountBySite } from '@/entities/alarm';
import { ALARM_PRIORITY_LABELS, type AlarmPriority } from '@/entities/alarm';
import { getAnomalySeries, getAnomalySummary } from '@/entities/anomaly';
import { getEquipment } from '@/entities/equipment';
import {
  FLOW_SERIES_CODES,
  WATER_SERIES_CODES,
  sliceRecentHours,
  useSiteSeries,
  outageNotice,
} from '@/entities/measurement';
import {
  SERIES_ORIGIN_LABELS,
  SERIES_WINDOW_HOURS,
  TrendChip,
  formatR2,
  getForecast,
  toMeasuredSeries,
  trendVerdict,
} from '@/entities/prediction';
import { SITES, getSite } from '@/entities/site';
import { ALL_ALARMS, useAlarmStates } from '@/features/alarm-ack';
import { SiteTabs, useSelectedSiteId, useSiteHref } from '@/features/site-selection';
import { AnomalyPanel } from '@/widgets/anomaly-panel';
import { AnomalyTimeline } from '@/widgets/anomaly-timeline';
import { EquipmentPanel } from '@/widgets/equipment-panel';
import { FORECAST_HORIZON_NOTE, ForecastChart } from '@/widgets/forecast-chart';
import { SiteMapLegend, SiteMapPanel } from '@/widgets/site-map';
import { SiteWallboard } from '@/widgets/site-wallboard';
import { useDischargeLimits } from '@/features/discharge-limit-settings';
import { WaterQualityGrid } from '@/widgets/water-quality-grid';

export function DashboardView() {
  const {
    siteId: selectedSiteId,
    setSiteId: setSelectedSiteId,
    chosen: siteChosen,
  } = useSelectedSiteId();
  const withSite = useSiteHref();
  const site = getSite(selectedSiteId);
  const limits = useDischargeLimits();
  /* 헤더 알림·사이드바와 같은 상태를 읽는다 — 정적 fixture면 확인해도 줄지 않는다 */
  const { alarms: allAlarms } = useAlarmStates(ALL_ALARMS);
  const alarmCounts = openCountBySite(allAlarms);
  const totalOpen = countOpen(allAlarms);
  const priorityCounts = countByPriorityIn(allAlarms);
  const priorityBreakdown =
    Object.entries(priorityCounts)
      .map(([p, n]) => `${ALARM_PRIORITY_LABELS[p as AlarmPriority]} ${n}`)
      .join(' · ') || null;

  /*
   * **`status`도 받는다** `[사용자 지적 2026-09-07]`. 첫 응답이 오기 전에는 값이 없고
   * (`pending`) 격자가 그 자리에 스켈레톤을 그린다 — 한때 그 자리에 내장 데이터가 그려져,
   * 답이 아닐 수 있는 값이 답의 자리에 앉았다가 응답이 오면 카드가 다시 그려졌다.
   */
  const { points: series, status: seriesStatus } = useSiteSeries(selectedSiteId);
  const seriesPending = seriesStatus === 'pending';
  /* 오염도 계열도 계측에서 온다 `[사용자 요청 2026-09-08]` — 창은 예측 화면과 같은 6시간이다 */
  const measured = useMemo(
    () => toMeasuredSeries(sliceRecentHours(series, SERIES_WINDOW_HOURS)),
    [series],
  );

  const detail = useMemo(
    () => ({
      series,
      anomalySeries: getAnomalySeries(selectedSiteId),
      anomalySummary: getAnomalySummary(selectedSiteId),
      /* 오염도 추정 화면과 **같은 계열**을 본다 — 갈리면 한 사업장이 화면마다 다른 값이 된다(E1) */
      forecast: getForecast(selectedSiteId, 'TOC', measured),
      equipment: getEquipment(selectedSiteId),
      outage: getOutageWindow(selectedSiteId),
    }),
    [selectedSiteId, series, measured],
  );

  return (
    <div className="space-y-6">
      <Panel
        title="사업장 현황 요약"
        titleAside={
          <InfoTip
            label="이 카드를 읽는 법"
            content="카드를 누르면 그 사업장의 상세 화면으로 이동합니다. 아래 탭에서 고른 한 개소는 이 카드가 아니라 그 아래 구역이 다룹니다."
          />
        }
        /* 전 사업장 합계는 여기에만 둔다 — 아래 카드는 전부 선택 사업장 축이다 */
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
            <DetailLink href={withSite('/alarms')} label="알람 이력으로 이동" text="전체 보기" />
          </div>
        }
      >
        {/*
         * **카드를 누르면 그 사업장 상세로 간다** `[사용자 요청 2026-09-15]`.
         *
         * 한때는 미확인 알람 모달이 열렸다 — 카드가 «훑는 개요»이고 화면을 옮기는 것은
         * 구역 머리의 링크뿐이라는 짜임이었다. 그 사이 «카드에서 한 번에 상세로»가
         * 한 번 세워졌다 걷혔는데(`b884b1b` · 2026-09-15 되돌림), 그때는 카드 안에
         * **상세 칸을 따로 내는** 방식이라 한 카드에 목적지가 둘이었다. 지금은 카드
         * 전체가 하나의 목적지다 — 칸도 없고 고를 것도 없다.
         *
         * 알람은 카드 아래 줄의 건수가 말하고, 목록은 `전체 보기`가 여는 알람 이력이 맡는다.
         */}
        <SiteWallboard
          sites={SITES}
          action="link"
          /* 누른 카드의 사업장이다 — 탭에서 고른 사업장과 다르므로 id를 넘긴다.
             손으로 `?site=`를 이어 붙이면 `scope`·`municipality`가 함께 날아간다 */
          cardHref={(s) => withSite('/overview', s.id)}
          cardLabel={(s) => `${s.name} 사업장 상세로 이동`}
          renderFooter={(s) => (
            <span className="text-[12px] text-fg-subtle">
              미확인 알람 <span className="num font-bold text-fg">{alarmCounts[s.id] ?? 0}</span>건
            </span>
          )}
        />
      </Panel>

      <section className="space-y-3 rounded-panel border border-card-border bg-section-bg p-4 lg:p-5">
        <StickyBar>
          <div className="flex items-center gap-1.5">
            <h2 className="text-[16px] font-bold leading-tight tracking-tight text-fg">
              선택 사업장 현황
            </h2>
            <InfoTip
              label="이 구역의 범위"
              content="탭으로 고른 한 개소의 이상 판정·계측·예측·설비 상태를 모아 봅니다."
            />
            {/*
             * **사업장 축의 입구다** `[사용자 요청 2026-08-28]`. 이 화면의 다른 `상세 보기`
             * 다섯은 주제별로 흩어 보내는데(계측→시계열, 예측→오염도…), 고른 사업장 하나를
             * 통째로 볼 곳이 없었다. 선택은 탭·핀이 그대로 맡고 이 링크는 화면을 옮긴다.
             *
             * **한때 월보드 카드의 상세 칸이 이 일을 물려받았다** `[사용자 요청 2026-08-31]` —
             * 2026-09-15에 그 판본을 되돌리며 이 입구가 돌아왔다.
             *
             * **«이 링크만»은 더 이상 아니다** `[사용자 요청 2026-09-15]` — 같은 날 월보드
             * 카드도 옮기는 쪽이 됐다. 둘을 함께 두는 이유는 **대상이 다르기 때문**이다:
             * 이 링크는 «탭에서 고른 사업장», 카드는 «그 카드의 사업장»이다. `b884b1b`가
             * 이 링크를 걷었던 근거(같은 목적지가 화면에 둘)는 그때 **카드 하나 안에**
             * 목적지가 둘이던 것과 겹쳐 있었고, 지금은 카드에 목적지가 하나뿐이다.
             */}
            <DetailLink href={withSite('/overview')} label={`${site.name} 사업장 상세로 이동`} />
          </div>
          <SiteTabs sites={SITES} selectedId={selectedSiteId} onSelect={setSelectedSiteId} />
        </StickyBar>

        {/*
         * 레일 폭은 오른쪽 열의 하한이 정한다 — xl에서 470px을 쓰면 오른쪽이 354px이 되어
         * 타일 2열 하한(384px) 밑으로 떨어진다. 1280 미만은 나누지 않는다(오른쪽 210px).
         */}
        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)] 2xl:grid-cols-[470px_minmax(0,1fr)]">
          <Panel
            title="사업장 위치"
            action={<SiteMapLegend />}
            /*
             * 붙은 탭 줄 높이(`--sticky-bar-h`)를 자리와 높이에서 함께 뺀다 — 빼지 않으면
             * 지도 머리가 탭 뒤로 들어간다. 세로 768px에서 88svh가 한계다(90svh면 잘린다).
             */
            className="xl:sticky xl:top-[calc(var(--header-h)_+_var(--sticky-bar-h,0px)_+_1.5rem)] xl:h-[calc(88svh_-_var(--sticky-bar-h,0px)_-_1.5rem)] xl:max-h-[753px] xl:self-start"
            /* flex 자식의 자동 최소 높이는 내용 높이다 — 잠그지 않으면 카드 밖으로 밀린다 */
            bodyClassName="min-h-0"
          >
            {/* 새로고침해도 고른 사업장의 시도로 남아 있게 한다 — 상세는 `SiteMap`의 `siteChosen` */}
            <SiteMapPanel
              sites={SITES}
              selectedId={selectedSiteId}
              onSelect={setSelectedSiteId}
              siteChosen={siteChosen}
            />
          </Panel>

          <div className="@container min-w-0 space-y-6">
            <Panel
              title={`이상 탐지 결과 · ${site.name}`}
              action={<DetailLink href={withSite('/anomaly')} label="이상 탐지 상세로 이동" />}
            >
              <div className="space-y-5">
                <AnomalyPanel
                  summary={detail.anomalySummary}
                  legend={<AnomalyBandLegend />}
                />
                <AnomalyTimeline data={detail.anomalySeries} outage={detail.outage} />
              </div>
            </Panel>

            <Panel
              title="수질·설비 실시간 계측"
              titleAside={
                <InfoTip
                  label="조회 조건과 결측 표시"
                  content={`최근 24시간 · ${COLLECTION_INTERVAL_MINUTES}분 주기 · ${DISPLAY_TIMEZONE}. ${outageNotice(site.online, detail.outage)}`}
                />
              }
              action={<DetailLink href={withSite('/timeseries')} label="시계열 변화로 이동" />}
            >
              {/*
                * 유량을 소절로 가른다 `[회의 피드백 2026-08-24]` — 농도와 부피/시간을 한 격자에
                * 두면 옆 칸과 비교된다는 잘못된 신호를 준다. 유입·유출은 서로 비교되어야 한다.
                */}
              <WaterQualityGrid
                pending={seriesPending}
                data={detail.series}
                /* 이 화면은 한 사업장만 그린다 — 카드가 그 사업장 주기로 «지금 값»을 받는다 */
                siteId={selectedSiteId}
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

            <Panel
              title={`${detail.forecast.targetLabel} · 최근 ${SERIES_WINDOW_HOURS}시간 추이`}
              /* 산출 시각·대상 기간은 E3가 값과 함께 요구하는 근거다 */
              titleAside={
                <InfoTip
                  label="이 예측의 산출 근거"
                  content={
                    detail.forecast.online
                      ? `산출 ${formatDateTime(detail.forecast.computedAtIso)} ${DISPLAY_TIMEZONE} · 입력 대상 기간 ${detail.forecast.inputWindowLabel}. ${FORECAST_HORIZON_NOTE}`
                      : `통신이 두절되어 산출이 중단되었습니다. ${FORECAST_HORIZON_NOTE}`
                  }
                />
              }
              action={<DetailLink href={withSite('/prediction')} label="오염도 추정으로 이동" />}
            >
              <ForecastChart
                summary={detail.forecast}
                nowIso={DEMO_NOW_ISO}
                limits={limits.table}
              />

              {/* 390px에서 세 칸을 나누면 한 칸이 106px이라 근거 줄이 접힌다 — 쌓는다 */}
              <div className="mt-4 grid grid-cols-1 divide-y divide-border border-t border-border pt-3 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {/*
                 * **농도를 적지 않는다** `[회의 2026-08-20]` — 소프트 센싱 값을 숫자로 띄우면
                 * 계측된 농도로 읽힌다(E3). 판정 문구·색은 `entities/prediction`이 낸다.
                 */}
                {detail.forecast.trends.map((t) => {
                  const verdict = trendVerdict(
                    t,
                    isOverLimit(t.code, t.value, limits.table),
                    limits.unresolvedReason,
                  );
                  return (
                    <div
                      key={t.code}
                      className="py-2 first:pt-0 last:pb-0 sm:px-3 sm:py-0 sm:first:pl-0 sm:last:pr-0"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[12px] uppercase tracking-[0.1em] text-fg-subtle">
                          {t.code}
                        </span>
                        <TrendChip trend={t.trend} />
                      </div>
                      <p
                        className="mt-1.5 text-[14px] font-semibold leading-snug text-fg"
                        style={{ color: verdict.ink }}
                      >
                        {verdict.text}
                      </p>
                      <p className="num mt-1 text-[12px] text-fg-subtle">
                        R² {formatR2(t.r2)} · {SERIES_ORIGIN_LABELS[t.origin]}
                      </p>
                    </div>
                  );
                })}
              </div>
            </Panel>

            <Panel
              title={`설비 상태 · ${site.name}`}
              titleAside={<InfoTip label="정렬 기준" content="상태가 나쁜 설비부터 정렬합니다." />}
              action={<DetailLink href={withSite('/equipment')} label="설비 이상 탐지로 이동" />}
            >
              <EquipmentPanel items={detail.equipment} online={site.online} />
            </Panel>
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * 카드 머리의 이동 링크. 목적지는 `aria-label`이 적는다 — 짧은 글자·아이콘만으로는
 * 링크 이름이 서지 않는다.
 *
 * **보이는 글자는 기본이 `상세 보기`이고 한 자리만 다르다** `[사용자 확인 2026-08-31]`.
 * §8이 문구를 통일하라는 이유는 *"카드마다 문구가 다르면 같은 동작이 여러 개로 읽힌다"*
 * 인데, 뒤집으면 **동작이 다르면 문구도 달라야 한다.** 넷은 «고른 사업장을 그 주제로 더
 * 자세히»(계측→시계열·예측→오염도·설비→설비 이상 탐지·판정→이상 탐지)이고, `사업장 현황
 * 요약` 머리의 하나만 **«전 사업장 알람을 전부»** 라 축이 다르다 — 패널 이름도 `요약`이라
 * 그 반대는 `전체`다. 알람 모달의 `이력 전체 보기`가 같은 목적지로 가며 이미 그 말을 쓴다.
 */
function DetailLink({
  href,
  label,
  text = '상세 보기',
}: {
  href: string;
  label: string;
  text?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex shrink-0 cursor-pointer items-center gap-0.5 rounded-chip py-0.5 pl-1.5 pr-0.5 text-[12px] text-fg-subtle transition-colors duration-200 hover:bg-accent-weak hover:text-accent"
    >
      <span className="hidden sm:inline">{text}</span>
      <ChevronRight aria-hidden size={16} strokeWidth={2} />
    </Link>
  );
}
