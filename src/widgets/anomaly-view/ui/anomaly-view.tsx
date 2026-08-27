'use client';

import { useMemo } from 'react';
import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { buildAnomalyScores, downsample } from '@/shared/lib/anomaly-score';
import { getOutageWindow } from '@/shared/lib/timeline';
import Link from 'next/link';
import { AnomalyBandLegend } from '@/shared/ui/anomaly-band-legend';
import { InfoTip } from '@/shared/ui/tooltip';
import { Panel } from '@/shared/ui/panel';
import { StickyBar } from '@/shared/ui/sticky-bar';
import { getAlarmsForView } from '@/entities/alarm';
import { getAnomalySeries, getAnomalySummary, findIdleDischargeRuns } from '@/entities/anomaly';
import { getMeasurementSeries } from '@/entities/measurement';
import { getSite } from '@/entities/site';
import { SiteTabs, useScopedSites, useSelectedSiteId, useSiteHref } from '@/features/site-selection';
import { AlarmList } from '@/widgets/alarm-list';
import { AnomalyPanel } from '@/widgets/anomaly-panel';
import { AnomalyTimeline } from '@/widgets/anomaly-timeline';
import { IDLE_DISCHARGE_NOTE, IdleDischargePanel } from './idle-discharge-panel';
import { SiteScoreTable } from './site-score-table';

const RANKING_SPARK_POINTS = 40;

/** 표의 `상세` 버튼이 데려갈 자리 */
const DETAIL_SECTION_ID = 'anomaly-detail';

export function AnomalyView() {
  const { siteId, setSiteId } = useSelectedSiteId();
  const withSite = useSiteHref();
  /* 순위·탭이 범위를 따른다 — `SITES`를 직접 읽으면 관할 밖 사업장이 줄에 선다 */
  const scopedSites = useScopedSites();
  const site = getSite(siteId);

  /*
   * 점수 높은 순. 통신이 끊긴 사업장은 점수를 0으로 내리지 않고 **끝으로** 보낸다(E4) —
   * 0으로 정렬하면 두절이 '가장 정상'으로 올라온다.
   */
  const rankedSites = useMemo(
    () =>
      [...scopedSites].sort((a, b) => {
        if (a.anomalyScore === null) return 1;
        if (b.anomalyScore === null) return -1;
        return b.anomalyScore - a.anomalyScore;
      }),
    [scopedSites],
  );

  const sparks = useMemo(
    () =>
      new Map(
        scopedSites.map((s) => [s.id, downsample(buildAnomalyScores(s.id), RANKING_SPARK_POINTS)]),
      ),
    [scopedSites],
  );
  const sparkOf = (id: string) => sparks.get(id) ?? [];

  /*
   * **표에서 고르면 아래 구역까지 데려간다** `[사용자 지시 2026-08-24]`.
   *
   * 표만 바뀌면 무엇이 일어났는지 화면에 보이지 않는다 — 바뀐 곳이 스크롤 아래에 있어서다.
   * 구역으로 스크롤하면 "무엇이 바뀌었는가"와 "어디를 봐야 하는가"가 한 동작으로 이어진다.
   *
   * 스크롤은 **선택을 화면에 반영한 다음** 실행한다. 목적지 요소는 `scroll-mt`으로 헤더와
   * 붙은 탭 줄만큼 여유를 갖는다 — 그것이 없으면 구역 제목이 헤더 뒤로 들어간다.
   */
  const selectAndReveal = (id: string) => {
    setSiteId(id);
    document.getElementById(DETAIL_SECTION_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const detail = useMemo(
    () => ({
      series: getAnomalySeries(siteId),
      summary: getAnomalySummary(siteId),
      outage: getOutageWindow(siteId),
      points: getMeasurementSeries(siteId),
      idleRuns: findIdleDischargeRuns(siteId),
      alarms: getAlarmsForView(siteId).filter((a) => a.condition === 'anomaly'),
    }),
    [siteId],
  );

  return (
    <div className="space-y-6">
      {/*
       * **사업장별 이상 점수가 맨 위 전폭이고, 형태는 표다** `[사용자 지시 2026-08-24]`.
       *
       * 통합 관제의 요약 카드와 같은 격자를 썼던 판본은 두 화면이 구분되지 않았다 — 같은 값을
       * 두 번 보여 주는 것이 아니라 **읽는 방식이 다르다는 것**을 형태로 말해야 한다.
       * 저쪽은 훑는 개요라 카드, 이쪽은 상세라 순위·점수·추세를 줄로 비교하는 표다.
       */}
      <Panel
        title="사업장별 이상 점수 요약"
        titleAside={
          <InfoTip
            label="이 표를 읽는 법"
            content="점수 높은 순입니다. 사업장명이나 상세 버튼을 누르면 아래 구역이 그 사업장으로 바뀌고 화면이 그 자리로 이동합니다. 추세선은 최근 24시간입니다."
          />
        }
        className="role-hide-site"
      >
        <SiteScoreTable
          sites={rankedSites}
          selectedId={siteId}
          onSelect={selectAndReveal}
          spark={sparkOf}
        />
      </Panel>

      {/* 통합 관제와 같은 구성 — 제목 · 탭을 한 구역으로 묶고 스크롤 중에도 위에 남긴다 */}
      <section
        id={DETAIL_SECTION_ID}
        /* 붙은 탭 줄(`--sticky-bar-h`) + 헤더만큼 위를 비워 둔다 — 스크롤 목적지가 그 뒤로 숨지 않게 */
        className="scroll-mt-[calc(var(--header-h)_+_var(--sticky-bar-h,0px)_+_1rem)] space-y-3 rounded-panel border border-card-border bg-section-bg p-4 lg:p-5"
      >
        <StickyBar>
          <div className="flex items-center gap-1.5">
            <h2 className="text-[16px] font-bold leading-tight tracking-tight text-fg">
              선택 사업장 이상 탐지
            </h2>
            <InfoTip
              label="이 구역의 범위"
              content="탭으로 고른 한 개소의 이상 점수·기여 변수·관련 알람을 봅니다. 위 사업장별 점수는 전 사업장 기준입니다."
            />
          </div>
          <SiteTabs sites={scopedSites} selectedId={siteId} onSelect={setSiteId} />
        </StickyBar>

        {/*
         * **두 칸이다** `[사용자 지시 2026-08-24]` — 왼쪽 판정, 오른쪽에 시간 흐름과 그 결과로
         * 나간 알람을 위아래로 쌓는다. 세 칸이던 판본은 xl에서 한 칸이 260px 밑으로 떨어져
         * XAI 막대의 라벨과 퍼센트가 접혔다.
         *
         * **높이는 왼쪽 판정 카드가 정한다** `[사용자 지시 2026-08-24]`. 격자 기본값이
         * `stretch`라 두 칸은 같은 높이가 되고, 오른쪽은 타임라인(고정) + 알람(남는 자리)로
         * 나눠 갖는다. 알람 목록은 `min-h-0` + `overflow-auto`라 **자기 안에서만 스크롤한다** —
         * `min-h-0`이 없으면 격자 칸의 자동 최소 높이가 목록 전체 길이가 되어 알람 20건이
         * 왼쪽 카드를 그만큼 늘린다.
         *
         * 왼쪽을 넓힌 것도 그래서다 — 오른쪽이 두 카드를 겹쳐 쓰게 되어 세로로 길어지므로,
         * 판정 카드도 그만큼 넓어야 점수·게이지·XAI가 위쪽에 몰리지 않는다.
         */}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,480px)_minmax(0,1fr)]">
          <Panel title={`이상 탐지 결과 · ${site.name}`} className="min-h-0">
            <AnomalyPanel summary={detail.summary} legend={<AnomalyBandLegend />} />
          </Panel>

          <div className="flex min-h-0 min-w-0 flex-col gap-6">
            <Panel
              className="shrink-0"
              title="이상 점수 타임라인"
              action={
                /* 원문 p.22의 현장 문제 — "TOC가 상승했는데 펌프 이상인지 유입 부하 증가인지
                   판단 어려움". 어느 공정 단계인지 짚으려면 공정도로 갈 수 있어야 한다 */
                <Link
                  href={withSite('/process')}
                  className="text-[12px] text-accent underline decoration-accent/40 underline-offset-2 transition-colors duration-200 hover:decoration-accent"
                >
                  공정에서 보기
                </Link>
              }
            >
              <AnomalyTimeline data={detail.series} outage={detail.outage} />
            </Panel>

            {/* 남는 높이를 받아 그 안에서만 스크롤한다 — 목록 길이가 격자 높이를 정하지 않는다 */}
            <Panel
              title="관련 알람"
              className="min-h-0 flex-1"
              bodyClassName="min-h-0 overflow-auto xl:min-h-[160px]"
            >
              <AlarmList alarms={detail.alarms} nowIso={DEMO_NOW_ISO} selectedSiteId={siteId} />
            </Panel>
          </div>
        </div>

        {/*
         * 이상 점수와 **다른 축**의 탐지다 — 점수가 낮아도 여기서 잡힌다.
         * 발표 p.11 그림이 이 기능을 `이상배출 조기탐지` 그룹에 두었기에 같은 화면에 둔다.
         * 전폭인 이유: 판정 결과가 아니라 **구간 목록**이라 시각·항목·지속시간이 한 줄에 와야 한다.
         */}
        <Panel
          title="방지시설 미가동 중 방류 의심"
          titleAside={<InfoTip label="판정 방법과 한계" content={IDLE_DISCHARGE_NOTE} />}
        >
          <IdleDischargePanel siteId={siteId} points={detail.points} />
        </Panel>
      </section>
    </div>
  );
}
