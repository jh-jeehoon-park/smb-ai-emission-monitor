'use client';

import { useMemo } from 'react';
import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { buildAnomalyScores, downsample } from '@/shared/lib/anomaly-score';
import { HISTORY_WINDOW_HOURS } from '@/shared/config/measurement';
import {
  PROVISIONAL_ANOMALY_RUN_MIN_MINUTES,
  PROVISIONAL_STATUS_LABELS,
} from '@/shared/config/provisional';
import { useQueryState } from '@/shared/lib/use-query-state';
import { getOutageWindow, timelineIndexAt } from '@/shared/lib/timeline';
import Link from 'next/link';
import { AnomalyBandLegend } from '@/shared/ui/anomaly-band-legend';
import { InfoTip } from '@/shared/ui/tooltip';
import { Panel } from '@/shared/ui/panel';
import { StickyBar } from '@/shared/ui/sticky-bar';
import { getAlarmsForView } from '@/entities/alarm';
import {
  ANOMALY_RUN_MIN_SCORE,
  canJudgeAnomalyRuns,
  findAnomalyRuns,
  getAnomalySeries,
  getAnomalySummaryAt,
} from '@/entities/anomaly';
import { useSiteSeries } from '@/entities/measurement';
import { getSite } from '@/entities/site';
import {
  SiteList,
  SiteTabs,
  useScopedSites,
  useSelectedSiteId,
  useSiteHref,
} from '@/features/site-selection';
import { AlarmList } from '@/widgets/alarm-list';
import { AnomalyTimeline } from '@/widgets/anomaly-timeline';
import { NO_RUN, RUN_MIN_SAMPLES, RUN_QUERY_KEY } from '../config/constants';
import { contributionEvidence } from '../lib/distribution';
import { IDLE_DISCHARGE_NOTE, IdleDischargePanel } from './idle-discharge-panel';
import { RunInvestigation } from './run-investigation';
import { RunInvestigationSkeleton } from './run-investigation-skeleton';
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

  /*
   * **`status`도 받는다** `[사용자 지적 2026-09-07]`. 미가동 방류 패널이 구간의 계측값을
   * 적는데, 첫 응답 전에는 그 값이 없어 `—` 셋이 결측처럼 보였다.
   */
  const { points, status: seriesStatus } = useSiteSeries(siteId);
  const seriesPending = seriesStatus === 'pending';

  /*
   * **구간을 1급 객체로 세운다** `[사용자 요청 2026-09-08]`.
   *
   * 이 화면에 오는 이유는 «이 사업장 왜 91점이지?»인데, 그 답의 나머지 셋(언제부터·얼마나·
   * 무엇 때문에)은 **되감을 수단이 없어** 낼 수 없었다 — 이 앱의 모든 화면이 «지금»에 고정돼
   * 있고, 그래서 통합 관제와 이 화면이 같은 그림을 그렸다.
   *
   * `idleRuns`를 여기서 걷었다 — 계산해 놓고 아무도 읽지 않았고, 패널이 같은 함수를 다시
   * 부르고 있었다.
   */
  const detail = useMemo(() => {
    const scores = buildAnomalyScores(siteId);

    return {
      series: getAnomalySeries(siteId),
      outage: getOutageWindow(siteId),
      points,
      runs: findAnomalyRuns(scores, ANOMALY_RUN_MIN_SCORE, RUN_MIN_SAMPLES),
      canJudgeRuns: canJudgeAnomalyRuns(scores),
      alarms: getAlarmsForView(siteId).filter((a) => a.condition === 'anomaly'),
    };
  }, [siteId, points]);

  /*
   * 고른 구간을 URL에 남긴다(§8 `URL 상태`·**P6**) — 링크를 보내면 «왜 91점이지?»가 그대로
   * 전달된다. `useQueryState`가 요구하는 허용 목록에 **구간 시작 시각이 유한 목록으로 맞는다.**
   */
  const runIsos = detail.runs.map((run) => run.fromIso);
  const [runIso, setRunIso] = useQueryState(
    RUN_QUERY_KEY,
    runIsos.length > 0 ? runIsos : [NO_RUN],
    runIsos[runIsos.length - 1] ?? NO_RUN,
  );
  const selectedRun = detail.runs.find((run) => run.fromIso === runIso) ?? detail.runs.at(-1) ?? null;

  /*
   * 판독은 구간의 **최고점 시각**을 연다 — 구간을 대표하는 한 지점이고, 거기가 곧 «무엇 때문에»의
   * 답이 가장 뚜렷한 자리다.
   */
  const reading = useMemo(() => {
    if (selectedRun === null) return { summary: null, evidence: [] };

    const summary = getAnomalySummaryAt(siteId, selectedRun.peakIndex);
    return {
      summary,
      evidence: contributionEvidence(summary.contributions, points, selectedRun.peakIndex),
    };
  }, [siteId, points, selectedRun]);

  /**
   * **알람에서 들어온 사람을 그 시각으로 데려간다.** 이 화면에 오는 가장 흔한 경로가 알람이라
   * 그것이 화면 안에서 완결되어야 한다 — 창 밖 알람이면 `timelineIndexAt`이 `null`이라
   * 아무 일도 하지 않는다(양 끝으로 클램프하면 없는 시각을 짚는다).
   */
  const revealAlarm = (raisedAtIso: string) => {
    const index = timelineIndexAt(raisedAtIso);
    if (index === null) return;

    const hit = detail.runs.find((run) => index >= run.from && index <= run.to);
    if (hit) setRunIso(hit.fromIso);
  };

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
              content="탭으로 고른 한 개소를 되감아 봅니다 — 이상 점수가 경계 위로 이어진 구간을 고르면 그 시각의 판정·기여 변수·계측이 열립니다. 위 사업장별 점수는 전 사업장 기준입니다."
            />
          </div>
          {/*
           * **고르는 방법이 폭으로 갈린다** `[사용자 요청 2026-09-21: 나머지 전체 화면 반응형]`.
           * 통합 관제가 2026-09-18에 세운 짜임을 그대로 쓴다 — 탭 줄은 `lg` 이상, 그 아래는
           * 목록이다. 같은 `onSelect`로 같은 `?site=`를 쓰므로 고르는 일 자체는 달라지지 않는다.
           *
           * 여기서도 같은 값이 나왔다(390px 실측) — **탭 10개가 4행 132px**로 접히고 알약
           * 실높이가 **26px**이라 손가락 최소를 크게 밑돌았다. 구성이 같으니(제목 + 탭 + 긴
           * 격자) 고치는 방법도 같아야 한다 — 화면마다 다르게 풀면 같은 부품이 자리마다
           * 다르게 행동한다.
           *
           * **한 겹으로 묶는다.** 띠(`StickyBar`)는 `space-y-3`이라 마지막 자식에게 아래
           * 여백을 주지 않는다 — 형제로 두면 탭 줄이 «마지막»에서 밀려나며 없던 12px을 얻어
           * 넓은 화면의 띠가 자란다(통합 관제에서 118 → 130px로 실측된 그 일이다).
           */}
          <div>
            <SiteTabs
              sites={scopedSites}
              selectedId={siteId}
              onSelect={setSiteId}
              className="hidden lg:flex"
            />
            <SiteList
              sites={scopedSites}
              selectedId={siteId}
              onSelect={setSiteId}
              className="lg:hidden"
            />
          </div>
        </StickyBar>

        {/*
         * **판정 카드 옆에 타임라인을 세우던 두 칸 배치를 걷었다** `[사용자 요청 2026-09-08]`.
         *
         * 그 배치의 근거는 «왼쪽 판정, 오른쪽에 시간 흐름과 알람» `[사용자 지시 2026-08-24]`
         * 이었고, 왼쪽을 넓게 잡은 것도 점수·게이지·XAI가 위로 몰리지 않게 하려던 것이다.
         * **그 왼쪽 카드가 통합 관제의 것과 같은 컴포넌트·같은 props였다** — 카드 제목까지
         * 같아 두 화면이 구분되지 않았다.
         *
         * 지금은 **조사 카드가 전폭으로 서고** 타임라인·알람이 그 아래에서 그것을 뒷받침한다.
         * 조사 카드 안이 이미 두 칸(구간 목록 │ 판독)이라 밖에서 또 나누면 칸이 넷이 된다.
         * 통합 관제의 카드는 그대로 남는다(**A2**) — 이 화면만 자리를 내준다.
         */}
        <Panel
          /*
           * **어느 사업장인지 화면이 말한다.** 이 구역은 탭으로 사업장을 갈아 끼우므로
           * 카드가 자기 대상을 적지 않으면 스크롤 중에 무엇을 보고 있는지 잃는다.
           */
          title={`이상 구간 조사 · ${site.name}`}
          titleAside={
            <InfoTip
              label="구간을 세는 방법과 한계"
              content={`이상 점수가 ${PROVISIONAL_STATUS_LABELS.caution} 경계(${ANOMALY_RUN_MIN_SCORE}점) 위로 연속 ${PROVISIONAL_ANOMALY_RUN_MIN_MINUTES}분 이상 이어진 구간을 셉니다 — 점수 구간 경계는 원문에 없어 잠정값입니다. 수신이 끊긴 표본에서 구간을 닫습니다: 모르는 시간을 이어 붙이면 없는 이상을 만듭니다. 판독은 구간의 최고점 시각을 열며, 기여 변수의 %는 모델 산출이고 그 옆의 값·분포는 같은 시각의 계측입니다 — 둘이 어긋나면 어긋난 대로가 검증 결과입니다. 백분위는 관측 분포 안에서의 자리이지 기준 초과 판정이 아닙니다.`}
            />
          }
          action={
            <span className="text-[12px] text-fg-subtle">
              최근 {HISTORY_WINDOW_HOURS}시간 ·{' '}
              {detail.canJudgeRuns ? (
                <span className="num text-fg-muted">{detail.runs.length}건</span>
              ) : (
                <span className="text-fg-muted">판정 불가</span>
              )}
            </span>
          }
        >
          {seriesPending ? (
            <RunInvestigationSkeleton />
          ) : (
            <RunInvestigation
              runs={detail.runs}
              selectedIso={runIso}
              onSelect={setRunIso}
              summary={reading.summary}
              evidence={reading.evidence}
              canJudge={detail.canJudgeRuns}
              minMinutes={PROVISIONAL_ANOMALY_RUN_MIN_MINUTES}
            />
          )}
        </Panel>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          <Panel
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
            {/* 위에서 고른 구간을 여기서 짚는다 — 목록과 그림이 서로를 가리킨다 */}
            <AnomalyTimeline
              data={detail.series}
              outage={detail.outage}
              focus={selectedRun && { fromIso: selectedRun.fromIso, toIso: selectedRun.toIso }}
            />
            <div className="mt-3 border-t border-border pt-2">
              <AnomalyBandLegend />
            </div>
          </Panel>

          {/* 목록 길이가 격자 높이를 정하지 않는다 — 자기 안에서만 스크롤한다 */}
          <Panel
            title="관련 알람"
            titleAside={
              <InfoTip
                label="알람과 구간의 관계"
                content="이상 판정으로 올라온 알람만 모읍니다. 알람을 누르면 그 시각이 든 이상 구간이 위에서 열립니다 — 조회 구간(24시간) 밖에서 올라온 알람은 짚을 자리가 없어 움직이지 않습니다."
              />
            }
            bodyClassName="max-h-[420px] overflow-auto"
          >
            <AlarmList
              alarms={detail.alarms}
              nowIso={DEMO_NOW_ISO}
              selectedSiteId={siteId}
              onReveal={revealAlarm}
            />
          </Panel>
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
          <IdleDischargePanel siteId={siteId} points={detail.points} pending={seriesPending} />
        </Panel>
      </section>
    </div>
  );
}
