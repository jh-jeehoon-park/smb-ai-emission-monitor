'use client';

import { useMemo, useState } from 'react';
import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { PROVISIONAL_DISPLAY_DECIMALS } from '@/shared/config/provisional';
import { isOverLimit } from '@/shared/config/discharge-limits';
import { STATUS_VISUAL, statusInk } from '@/shared/config/status-visual';
import { DISPLAY_TIMEZONE, formatDateTime } from '@/shared/lib/format';
import { COLLECTION_INTERVAL_MINUTES } from '@/shared/config/measurement';
import { getOutageWindow } from '@/shared/lib/timeline';
import { AnomalyBandLegend } from '@/shared/ui/anomaly-band-legend';
import { Modal } from '@/shared/ui/modal';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Panel } from '@/shared/ui/panel';
import { StickyBar } from '@/shared/ui/sticky-bar';
import { InfoTip } from '@/shared/ui/tooltip';
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
import { ALL_ALARMS, useAlarmStates } from '@/features/alarm-ack';
import { SITE_QUERY_KEY, SiteTabs, useSelectedSiteId, useSiteHref } from '@/features/site-selection';
import { AlarmList } from '@/widgets/alarm-list';
import { AnomalyPanel } from '@/widgets/anomaly-panel';
import { AnomalyTimeline } from '@/widgets/anomaly-timeline';
import { EquipmentPanel } from '@/widgets/equipment-panel';
import { ForecastChart } from '@/widgets/forecast-chart';
import { SiteMapLegend, SiteMapPanel } from '@/widgets/site-map';
import { SiteWallboard } from '@/widgets/site-wallboard';
import { useDischargeLimits } from '@/features/discharge-limit-settings';
import { WaterQualityGrid } from '@/widgets/water-quality-grid';
import { BADGE_BASE } from '@/shared/ui/badge';
import { Eyebrow } from '@/shared/ui/eyebrow';
import { StatusBadge } from '@/shared/ui/status-badge';
import { VALUE_LG } from '@/shared/ui/type-scale';

export function DashboardView() {
  const { siteId: selectedSiteId, setSiteId: setSelectedSiteId } = useSelectedSiteId();
  const withSite = useSiteHref();
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
      outage: getOutageWindow(selectedSiteId),
    }),
    [selectedSiteId],
  );

  return (
    <div className="space-y-6">
      {/*
       * **사업장 현황이 맨 위 전폭이다** `[사용자 지시 2026-08-24]`. 전 사업장을 한눈에
       * 보는 것이 이 화면의 첫 목적이라, 상세 레일 안에 끼워 넣으면 10개소가 2열까지 접힌다.
       */}
      <Panel
        title="사업장 현황 요약"
        titleAside={
          <InfoTip
            label="이 카드를 읽는 법"
            content="카드를 누르면 그 사업장의 미확인 알람이 열립니다. 아래 탭에서 고른 한 개소는 이 카드가 아니라 그 아래 구역이 다룹니다."
          />
        }
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
            <DetailLink href={withSite('/alarms')} label="알람 이력으로 이동" />
          </div>
        }
      >
        <SiteWallboard
          sites={SITES}
          onCardClick={setAlarmSiteId}
          hasPopup
          cardLabel={(s) => `${s.name} 미확인 알람 ${alarmCounts[s.id] ?? 0}건 보기`}
          renderFooter={(s) => (
            /* 화살표는 이제 카드 오른쪽 끝이 갖는다 — 이 줄은 값만 적는다 */
            <span className="text-[12px] text-fg-subtle">
              미확인 알람 <span className="num font-bold text-fg">{alarmCounts[s.id] ?? 0}</span>건
            </span>
          )}
        />
      </Panel>

      {/*
       * 제목 · 탭 · 상세 격자를 **한 구역으로 묶는다** `[사용자 지시 2026-08-24]`.
       *
       * 테두리 + 여백 + **옅은 면**(`--section-bg`) `[사용자 지시 2026-08-24]`.
       * 본문 배경보다 한 단 어둡다(1.057:1) — '면이 깔려 있다'는 것만 전하고, 안의 흰 카드와는
       * 1.15:1로 벌어져 카드가 그 위에 떠 보인다. `--surface-2`로는 본문과 1.01:1이라
       * 아무것도 보이지 않았다.
       *
       * 간격도 함께 쓴다 — 안쪽 12px, 바깥 24px. 탭이 무엇을 바꾸는지를 거리로도 말한다.
       */}
      <section className="space-y-3 rounded-panel border border-card-border bg-section-bg p-4 lg:p-5">
        {/*
         * 이름이 **이 구역이 무엇인가**를 말해야 한다 `[사용자 지시 2026-08-24]`.
         *
         * `사업장 상세` → `선택 사업장 진단` → **`선택 사업장 현황`** 순으로 바뀌었다.
         * 첫 이름은 어느 사업장인지·무엇을 보는지를 말하지 않았고, `진단`은 이 구역이 하는
         * 일보다 커 보였다 — 여기 놓인 것은 판정·계측·예측·설비의 **지금 상태**이고 사용자가
         * 무엇을 진단하는 곳이 아니다 `[사용자 지시 2026-08-24]`.
         *
         * 위 요약 카드와 이름이 비슷해도 범위가 다르다 — 저쪽은 전 사업장, 이쪽은 고른 한 개소다.
         * 그 구분은 제목의 `선택`과 인포 툴팁이 말한다.
         */}
        <StickyBar>
          <div className="flex items-center gap-1.5">
            <h2 className="text-[16px] font-bold leading-tight tracking-tight text-fg">
              선택 사업장 현황
            </h2>
            <InfoTip
              label="이 구역의 범위"
              content="탭으로 고른 한 개소의 이상 판정·계측·예측·설비 상태를 모아 봅니다."
            />
          </div>
          <SiteTabs sites={SITES} selectedId={selectedSiteId} onSelect={setSelectedSiteId} />
        </StickyBar>

        {/* 지도는 스크롤해도 남는 좌측 레일에 둔다. 상세를 보는 동안에도 전체 위치가 보여야 한다.
            레일을 **두 단으로** 둔다 `[사용자 지시 2026-08-24: 오른쪽이 너무 넓다, 지도를 키워라]`.
            xl(1280~1535)에서 420px — 여기서 470px을 쓰면 오른쪽 열이 354px이 되어 타일이
            2열 하한(384px) 밑으로 떨어진다. 2xl(1536~)에서 470px — 오른쪽 열이 1920px에서
            1044→994px으로 50px 줄고 지도가 380→430px로 커진다.
            1280 미만에서는 레일을 만들지 않는다 — 1024에서 나누면 오른쪽에 210px밖에 남지 않아
            KPI 타일이 44px로 뭉개진다. 대신 지도가 본문 위에 전폭으로 놓인다. */}
        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)] 2xl:grid-cols-[470px_minmax(0,1fr)]">
          <Panel
            title="사업장 위치"
            action={<SiteMapLegend />}
            /*
             * 패널 자체가 뷰포트 기준 높이를 갖는다 — 지도는 `flex-1`로 남는 자리를 채우고
             * 위아래 여백은 패널의 `p-5` 하나로 정해져 똑같아진다 `[사용자 지시 2026-08-24]`.
             * `max-h`는 지도 상한(630) + 패널 안 크롬(헤더 43 · 확대 줄 32 · 여백 40 · 간격 8).
             *
             * 멈추는 자리와 높이에서 `--sticky-bar-h`(위에 붙은 탭 줄의 높이)를 뺀다 —
             * 빼지 않으면 지도 머리가 탭 뒤로 들어가고, 높이만큼 아래가 화면 밖으로 밀린다.
             *
             * **거기에 24px을 더 띄운다** `[사용자 지시 2026-08-24]` — 붙은 탭 줄 바로 아래에
             * 카드가 닿아 숨 쉴 틈이 없었다. 높이에서도 같은 24px을 빼고 `90svh`를 `88svh`로
             * 내렸다: 세로 768px 화면에서 위 offset(헤더 61 + 탭 줄 90 + 24 = 175)에
             * 88svh(676) − 114를 더하면 737px로 화면 안에 들어온다. 90svh면 752px이라
             * 아래가 잘리기 직전이었다.
             */
            className="xl:sticky xl:top-[calc(var(--header-h)_+_var(--sticky-bar-h,0px)_+_1.5rem)] xl:h-[calc(88svh_-_var(--sticky-bar-h,0px)_-_1.5rem)] xl:max-h-[753px] xl:self-start"
            /*
             * 카드 본문이 남는 높이보다 커지지 않게 잠근다. flex 자식의 자동 최소 높이는
             * **내용의 최소 높이**라, 이것이 없으면 안쪽에서 무엇이 커질 때 카드 밖으로 밀린다.
             */
            bodyClassName="min-h-0"
          >
            <SiteMapPanel sites={SITES} selectedId={selectedSiteId} onSelect={setSelectedSiteId} />
          </Panel>

          <div className="@container min-w-0 space-y-6">
            {/*
             * **이상 탐지 결과가 상세의 첫 카드다** `[사용자 지시 2026-08-24]`.
             *
             * 올리면서 **이상 점수 타임라인을 같은 카드에 녹였다.** 예전에는 타임라인이 왼쪽 열,
             * 판정이 오른쪽 1/3 칸에 흩어져 있었다 — 점수의 시간 흐름과 그 점수를 만든 기여
             * 변수는 한 판정의 두 면이라, 카드를 나누면 같은 산출을 두 번 설명하게 된다.
             */}
            <Panel
              /* 어느 사업장의 판정인지를 제목이 말한다 — 탭이 위에 있어도 카드만 보면 알 수 없다 */
              title={`이상 탐지 결과 · ${site.name}`}
              action={<DetailLink href={withSite('/anomaly')} label="이상 탐지 상세로 이동" />}
            >
              {/*
               * 판정(점수·근거·기여 변수)을 가로 한 줄로 두고 **타임라인을 그 아래 전폭**에 둔다
               * `[사용자 지시 2026-08-24]`. 시간축은 넓을수록 읽히므로 카드 폭을 다 준다.
               */}
              <div className="space-y-5">
                {/* 범례를 판정 줄 안으로 넘긴다 — 그 줄의 오른쪽 아래에 붙는다 */}
                <AnomalyPanel
                  summary={detail.anomalySummary}
                  legend={<AnomalyBandLegend />}
                  /*
                   * **KPI 타일 3장을 걷었다** `[사용자 지시 2026-08-24]`.
                   * `선택 사업장 이상 점수`는 이 카드의 56px 점수와 같은 값이라 지웠고(중복),
                   * 처리율·가동률은 여기 뱃지로 내려왔다. 목표치는 뱃지 안에 남긴다 —
                   * 98%·95%가 원문 성과지표(p.3·p.119)라 값만 두면 근거가 사라진다.
                   */
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

            <Panel
              title="수질·설비 실시간 계측"
              /*
               * **조회 조건도 툴팁으로 옮긴다** `[사용자 지시 2026-08-24: 우측 상단 설명은 전부]`.
               *
               * 수집 주기·기간·시간대는 E5가 표기를 요구하는 값이라 카드 머리에 상시로 두었는데,
               * 사용자가 그 자리를 비우기로 결정했다. **툴팁 안에 남는다**(사라지지 않는다) —
               * 시각 자체는 차트 툴팁과 표(`표로 보기`)의 `시각(KST)` 열이 계속 적는다.
               */
              titleAside={
                <InfoTip
                  label="조회 조건과 결측 표시"
                  content={`최근 24시간 · ${COLLECTION_INTERVAL_MINUTES}분 주기 · ${DISPLAY_TIMEZONE}. ${outageNotice(site.online, detail.outage)}`}
                />
              }
              /* 카드마다 상세로 가는 길을 둔다 — 요약을 읽다 막힌 자리에서 이어진다 */
              action={<DetailLink href={withSite('/timeseries')} label="시계열 변화로 이동" />}
            >
              {/* 사업장 계열은 방류구 계열이라 기준을 적용한다 */}
              <WaterQualityGrid
                data={detail.series}
                codes={WATER_SERIES_CODES}
                limits={limits.table}
                windowHours={SERIES_WINDOW_HOURS}
              />
            </Panel>

            <Panel
              title={`${detail.forecast.targetLabel} · 최근 ${SERIES_WINDOW_HOURS}시간 추이`}
              /*
               * 산출 시각·대상 기간은 E3가 요구하는 근거다. 카드 머리에서 툴팁으로 옮기되
               * **오염도 추정 화면이 같은 값을 카드 안에 표로 계속 보인다** — 근거가 화면에서
               * 사라진 것이 아니라 요약 카드에서 접힌 것이다 `[사용자 지시 2026-08-24]`.
               */
              titleAside={
                <InfoTip
                  label="이 예측의 산출 근거"
                  content={
                    detail.forecast.online
                      ? `산출 ${formatDateTime(detail.forecast.computedAtIso)} ${DISPLAY_TIMEZONE} · 입력 대상 기간 ${detail.forecast.inputWindowLabel}`
                      : '통신이 두절되어 산출이 중단되었습니다.'
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

              {/*
               * 카드 안에 카드를 넣지 않는다 — 구분선만으로 나눈다.
               * **좁은 화면에서는 세로로 쌓는다** `[사용자 지시 2026-08-24: 반응형 점검]` —
               * 390px에서 세 칸을 나누면 한 칸이 106px이라 `R² 0.87 · 계측`이 두 줄로 접혔다.
               * 쌓으면서 구분선도 방향을 바꾼다(가로선 → 세로선).
               */}
              <div className="mt-4 grid grid-cols-1 divide-y divide-border border-t border-border pt-3 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
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
                    <div
                      key={t.code}
                      className="py-2 first:pt-0 last:pb-0 sm:px-3 sm:py-0 sm:first:pl-0 sm:last:pr-0"
                    >
                      {/*
                       * 경향은 **뱃지**로 낸다 `[사용자 지시 2026-08-25]` — `bare`(배경 없는 글자)는
                       * 표에서 줄이 시끄러워지지 않게 쓰는 형태이고, 여기는 세 칸짜리 요약이라
                       * 칩 배경이 있어야 항목 코드와 방향이 같은 무게로 읽히지 않는다.
                       */}
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

            {/* 설비는 4대를 가로로 편다 — 세로로 쌓으면 오른쪽 열만 길어져 왼쪽 아래가 빈다 */}
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
 * '무엇이 남아 있는가'만 답한다 — 목록은 헤더 알림·사이드바와 **같은 상태**를 읽으므로
 * 다른 화면에서 확인 처리하면 이 숫자도 함께 준다.
 *
 * `siteId`가 `null`이면 닫힘이다. 컴포넌트를 조건부로 마운트하지 않는 이유는 Modal이
 * 닫힐 때 포커스를 열기 전 자리로 되돌리기 때문이다 — 언마운트하면 그 대상을 잃는다.
 */
/**
 * 사업장 카드를 눌렀을 때 열리는 미확인 알람 모음.
 *
 * **위계를 세 단으로 나눈다** `[사용자 지시 2026-08-25]`. 예전에는 제목 아래 회색 한 줄
 * (`업종 · 지역 · 수신 중`)과 목록만 있어, 무엇이 얼마나 심각한지를 목록을 세어 봐야 알았다.
 *
 *  ① **제목** — 어느 사업장의 무엇인가
 *  ② **요약 면** — 미확인 건수(큰 수치) · 우선순위 분해 뱃지 · 등급 · 수신 상태
 *  ③ **목록** — 각각이 무엇인가(공용 `AlarmList`를 그대로 쓴다)
 *
 * 요약 면은 화면의 다른 값 덩어리와 같은 어휘다 — 옅은 면(`--surface-2`) 위에 큰 수치를 두고
 * 그 옆에 뱃지를 붙인다(사업장 요약 카드·이상 탐지 결과와 같은 구성).
 *
 * 푸터의 `알람 이력`은 **여기서 끝내지 않는다는 표시**다 — 모달은 미확인만 담고, 확인·조치한
 * 것까지 보려면 이력 화면으로 가야 한다.
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
  const counts = countByPriorityIn(open);

  return (
    <Modal
      open={siteId !== null}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={site ? `${site.name} 미확인 알람` : '미확인 알람'}
    >
      {site && (
        <div className="space-y-4">
          {/* ② 요약 면 — 건수가 먼저 읽히고 그 옆에 무엇이 몇 건인지가 붙는다 */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-nested bg-surface-2 p-4">
            <div className="flex items-baseline gap-2">
              <span
                className={`num ${VALUE_LG}`}
                style={{
                  color: open.length > 0 ? statusInk(STATUS_VISUAL.critical) : 'var(--color-fg)',
                }}
              >
                {open.length}
              </span>
              <span className="text-[12px] text-fg-muted">건 미확인</span>
            </div>

            {/*
             * 우선순위 분해. **0건인 우선순위는 적지 않는다** — 없는 것을 `긴급 0`으로 세우면
             * 세 뱃지가 늘 같은 자리에 있어 무엇이 있는지가 아니라 무엇이 없는지를 읽게 된다.
             *
             * **이력 링크도 이 줄에 둔다** `[사용자 지시 2026-08-25]` — 모달 바닥에 혼자
             * 떠 있으면 요약과 목록 사이가 끊기고, 목록이 길면 스크롤 끝까지 가야 보인다.
             * 여기 두면 "미확인 5건 · 이게 전부는 아니다"가 한 줄에서 읽힌다.
             */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(Object.keys(ALARM_PRIORITY_LABELS) as AlarmPriority[])
                .filter((priority) => counts[priority] > 0)
                .map((priority) => (
                  <span
                    key={priority}
                    className={`${BADGE_BASE} font-medium ${MODAL_PRIORITY_CHIP[priority]}`}
                  >
                    {ALARM_PRIORITY_LABELS[priority]} {counts[priority]}
                  </span>
                ))}
              {site.status ? (
                <StatusBadge level={site.status} />
              ) : (
                <span className={`${BADGE_BASE} bg-surface-3 text-fg-muted`}>통신 두절</span>
              )}

              {/*
               * **누른 카드의 사업장**으로 간다. 지금 탭에서 고른 사업장이 아니다 —
               * 요약 카드는 선택을 바꾸지 않고 모달만 열기 때문에 둘이 다를 수 있다.
               */}
              <Link
                href={`/alarms?${SITE_QUERY_KEY}=${site.id}`}
                className="ml-auto flex items-center gap-0.5 rounded-chip py-0.5 pl-1.5 pr-0.5 text-[12px] text-fg-subtle transition-colors duration-200 hover:bg-accent-weak hover:text-accent"
              >
                이력 전체 보기
                <ChevronRight aria-hidden size={16} strokeWidth={2} />
              </Link>
            </div>
          </div>

          {/* 두절이면 목록이 비어 있는 이유가 따로 있다 — 알람이 없는 것이 아니라 못 받는 것이다(E4) */}
          {!site.online && (
            <p className="text-[12px] leading-relaxed text-fg-subtle">
              통신이 두절되어 마지막 수신 이후의 알람은 받지 못했습니다. 아래 목록은 두절 전까지
              받은 것입니다.
            </p>
          )}

          <div>
            <Eyebrow className="mb-2">알람 목록</Eyebrow>
            <AlarmList alarms={open} nowIso={DEMO_NOW_ISO} selectedSiteId={site.id} />
          </div>
        </div>
      )}
    </Modal>
  );
}

/** 요약 면의 우선순위 칩. 목록 행과 같은 색을 쓴다 — 두 곳이 갈리면 같은 알람이 달라 보인다 */
const MODAL_PRIORITY_CHIP: Record<AlarmPriority, string> = {
  urgent: 'bg-chip-critical text-critical-ink',
  caution: 'bg-chip-warning text-warning-ink',
  info: 'bg-chip-info text-info-ink',
};

/**
 * 카드 머리의 상세 이동 링크 `[사용자 지시 2026-08-24]`.
 *
 * **보이는 글자는 `상세 보기` 하나로 통일한다** — 카드마다 문구가 다르면 같은 동작이
 * 여러 개로 읽힌다. 어디로 가는지는 카드 제목이 말하고, 보조기술에는 `aria-label`이
 * 목적지를 적는다(아이콘·짧은 글자만으로는 링크 이름이 서지 않는다).
 *
 * 좁아지면(`sm` 미만) 글자를 감추고 화살표만 남긴다. `aria-label`은 그대로다.
 */
function DetailLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex shrink-0 cursor-pointer items-center gap-0.5 rounded-chip py-0.5 pl-1.5 pr-0.5 text-[12px] text-fg-subtle transition-colors duration-200 hover:bg-accent-weak hover:text-accent"
    >
      <span className="hidden sm:inline">상세 보기</span>
      <ChevronRight aria-hidden size={16} strokeWidth={2} />
    </Link>
  );
}
