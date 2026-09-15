'use client';

import { useMemo } from 'react';
import { DEMO_NOW_ISO } from '@/shared/config/demo';
import {
  UNRESOLVED_LIMIT_TEXT,
  formatClassification,
  formatLimitRange,
  isOverLimit,
} from '@/shared/config/discharge-limits';
import { DISPLAY_TIMEZONE, formatDateTime } from '@/shared/lib/format';
import { useQueryState } from '@/shared/lib/use-query-state';
import { CHART_SURFACE } from '@/shared/ui/chart-figure';
import { Panel } from '@/shared/ui/panel';
import { Skeleton, SkeletonRegion } from '@/shared/ui/skeleton';
import { InfoTip } from '@/shared/ui/tooltip';
import { VALUE_MD } from '@/shared/ui/type-scale';
import {
  FLOW_FORECAST,
  FLOW_FORECAST_CODE,
  FORECAST_TARGETS,
  FORECAST_TARGET_CODES,
  SERIES_ORIGIN_LABELS,
  SERIES_WINDOW_HOURS,
  TrendChip,
  trendVerdict,
  formatR2,
  getFlowForecast,
  getForecast,
  toMeasuredSeries,
  peakValue,
  type ForecastTargetCode,
  type TrendEstimate,
} from '@/entities/prediction';
import {
  useDischargeLimits,
  type DischargeLimitsView,
} from '@/features/discharge-limit-settings';
import {
  TELEMETRY_PENDING_NOTE,
  sliceRecentHours,
  useSiteSeries,
} from '@/entities/measurement';
import { useSelectedSiteId } from '@/features/site-selection';
import { SegmentedControl } from '@/shared/ui/segmented-control';
import {
  FULL_HEIGHT,
  ForecastChart,
  ForecastOverlay,
} from '@/widgets/forecast-chart';
import { ALL_TARGETS, TARGET_QUERY_KEY, TARGET_VIEWS, type TargetView } from '../config/constants';
import { TABLE_HEAD_CELL, TABLE_HEAD_ROW, TABLE_ROOT, TABLE_ROW } from '@/shared/ui/table';

const TARGET_OPTIONS: { value: TargetView; label: string }[] = [
  { value: ALL_TARGETS, label: '전체' },
  ...FORECAST_TARGET_CODES.map((code) => ({ value: code as TargetView, label: code })),
  /* 수량은 오염도와 다른 축이라 뒤에 모은다 `[원문 발표 p.11]` */
  { value: 'inflow', label: '유입' },
  { value: FLOW_FORECAST_CODE, label: '유출' },
];

/** 수량 계열 — 오염도와 축이 다르다(부피/시간 vs 농도) */
const FLOW_VIEWS: TargetView[] = ['inflow', FLOW_FORECAST_CODE];
const DEFAULT_VIEW: TargetView = ALL_TARGETS;

export function PredictionView() {
  const { siteId } = useSelectedSiteId();
  /* 기준표는 사업장 설정에서 온다 — 화면이 정적 표를 직접 읽으면 설정이 반영되지 않는다 */
  const limits = useDischargeLimits();
  const [view, setView] = useQueryState(TARGET_QUERY_KEY, TARGET_VIEWS, DEFAULT_VIEW);

  /*
   * **이 화면이 계측을 안 보고 있었다** `[사용자 지적 2026-09-07]` `[사용자 요청 2026-09-08]`.
   *
   * 다섯 계열(TOC·TN·TP·유입·유출)이 전부 시드 난수 생성값이었다 — 서버에 채널이 다 있고
   * 다른 화면들은 실측을 보는데 이 화면만 그랬다. 그러면서 TOC·유량을 `직접 계측`이라
   * 적었다(**E3**).
   *
   * **`useSiteSeries` 하나로 들어온다** — 화면이 계측을 읽는 통로는 그것뿐이다.
   */
  const { points, status: seriesStatus } = useSiteSeries(siteId);
  const seriesPending = seriesStatus === 'pending';
  const measured = useMemo(
    () => toMeasuredSeries(sliceRecentHours(points, SERIES_WINDOW_HOURS)),
    [points],
  );

  /* 전체 보기에서는 세 항목을 모두 만든다. 계열은 한 번 옮겨 두고 셋이 나눠 쓴다 */
  const showAll = view === ALL_TARGETS;
  const showFlow = FLOW_VIEWS.includes(view);
  const single: ForecastTargetCode = showAll || showFlow ? 'TOC' : (view as ForecastTargetCode);
  const forecast = useMemo(
    () =>
      showFlow
        ? getFlowForecast(siteId, view as 'flow' | 'inflow', measured)
        : getForecast(siteId, single, measured),
    [siteId, single, showFlow, view, measured],
  );
  const allForecasts = useMemo(
    () => (showAll ? FORECAST_TARGET_CODES.map((code) => getForecast(siteId, code, measured)) : []),
    [siteId, showAll, measured],
  );
  /* 수량은 축이 달라 따로 겹친다 — 농도와 부피/시간을 한 눈금에 두면 둘 다 못 읽는다 */
  const flowForecasts = useMemo(
    () =>
      showAll
        ? [
            getFlowForecast(siteId, 'inflow', measured),
            getFlowForecast(siteId, FLOW_FORECAST_CODE, measured),
          ]
        : [],
    [siteId, showAll, measured],
  );
  /* 결정계수는 보고 있는 계열의 것이다 — 유량은 성능 목표 자체가 없다 `[원문 발표 p.26]` */
  const r2 = showFlow ? FLOW_FORECAST.r2 : FORECAST_TARGETS[single].r2;
  const peak = peakValue(forecast);

  return (
    <div className="space-y-6">
      {/*
       * **판정이 맨 위에 온다** `[사용자 요청 2026-08-26]`.
       *
       * 이 화면의 질문은 *"지금 기준을 넘고 있나"* 이고, 그 답이 이 카드 셋이다 —
       * 항목마다 `기준보다 높음`·`낮음`·`기준 미설정` 하나를 낸다. 답을 맨 위에 두고
       * 아래에서 근거(계열)와 기준의 출처(`적용 기준치`)를 잇는다.
       *
       * **`적용 기준치`가 위에 있던 판본을 뒤집은 것이다** `[사용자 결정 2026-08-25]`.
       * 그때 근거는 *"계열이 기준 대비로 읽히므로 판정의 축이 먼저 와야 한다"* 였는데,
       * 그 축은 차트의 세로 눈금(`기준` 선)이 이미 말하고 있어 표가 앞설 이유가 없었다.
       */}
      <div className="grid gap-6 lg:grid-cols-3">
        {forecast.trends.map((trend) => (
          <TrendCard key={trend.code} trend={trend} limits={limits} pending={seriesPending} />
        ))}
      </div>

      <Panel
        /*
         * **`추이`라 부르지 않는다** `[사용자 지적 2026-08-25]`. 그 이름은 이 화면이
         * 시계열 변화 화면과 같은 일을 한다고 말한다 — 이 화면의 질문은 *"지금 기준을
         * 넘고 있나"* 다.
         */
        title={
          showAll
            ? `수질·수량 · 최근 ${SERIES_WINDOW_HOURS}시간`
            : `${forecast.targetLabel} · 최근 ${SERIES_WINDOW_HOURS}시간`
        }
        /*
         * **`추정 대상과 계측 대상` 카드를 걷고 여기로 옮겼다** `[사용자 요청 2026-08-28]`.
         * 그 카드는 본문이 설명 문단 하나뿐이라 §8이 막는 형태였다 — 설명은 제목 옆 툴팁이다.
         */
        titleAside={
          <InfoTip
            label="무엇을 계측하고 무엇을 추정하는가"
            content="다섯 계열 모두 계측 서버에서 받습니다. TOC와 유입·유출은 계측 사양에 있는 항목이고, TN·TP는 실증에서 센서가 없어 AI 소프트 센싱이 낼 항목입니다 — 그 모델이 아직 없어 지금은 계측 서버가 보내 주는 값을 그립니다. 그래서 그 둘의 출처를 «계측 서버 수신 · AI 산출 예정»이라 적고 선을 파선으로 둡니다: «직접 계측»이라 적으면 없는 센서를, «소프트 센싱 추정»이라 적으면 없는 AI 산출을 주장하게 됩니다(E3). 카드는 농도를 적지 않고 기준 대비 높낮이만 냅니다 — 소프트 센싱으로는 절대값의 정확도를 맞추기 어렵다는 판단입니다. 통신이 두절되면 값이 끊기고 마지막 산출 시각만 남습니다 — 임의로 이어 붙이지 않습니다(E3). 향후 6시간 예측은 그리지 않습니다 — 예측 대상 항목과 입력 데이터가 정해지지 않았습니다."
          />
        }
        action={
          <SegmentedControl
            ariaLabel="예측 대상 항목"
            options={TARGET_OPTIONS}
            value={view}
            onChange={setView}
          />
        }
      >
        {seriesPending ? (
          /*
           * **아직 안 받은 것을 «통신 두절»이라 적지 않는다**(**E4**). 계열이 비면 판정도
           * 계열도 낼 수 없다 — 자리는 실제 차트와 같은 높이로 잡아 값이 도착할 때 카드가
           * 튀지 않게 한다.
           */
          <SkeletonRegion label={TELEMETRY_PENDING_NOTE} className="space-y-5">
            <div className={CHART_SURFACE}>
              <Skeleton style={{ height: FULL_HEIGHT }} />
            </div>
            {showAll && (
              <div className={CHART_SURFACE}>
                <Skeleton style={{ height: FULL_HEIGHT }} />
              </div>
            )}
          </SkeletonRegion>
        ) : showAll ? (
          <div className="space-y-5">
            {/*
              * **수질은 기준 대비 한 축에 겹친다.** 3단으로 쌓던 판본은 축이 각자라 같은
              * 시각의 세 항목이 비교되지 않았고, 6종으로 늘리면 768px 스택이 됐다.
              * 기준으로 나누면 셋 다 100 언저리로 모여 **어느 항목이 기준에 가장 가까운가**
              * 가 한눈에 보인다 — 이 화면이 묻는 것이 그것이다.
              */}
            <div>
              <p className="mb-1.5 text-[12px] font-medium text-fg-subtle">수질 — 기준 대비</p>
              <ForecastOverlay
                summaries={allForecasts}
                nowIso={DEMO_NOW_ISO}
                limits={limits.table}
                unit="%"
                label="수질 3종 기준 대비"
              />
            </div>
            <div>
              <p className="mb-1.5 text-[12px] font-medium text-fg-subtle">
                수량 — 유입·유출 (m³/day)
              </p>
              <ForecastOverlay
                summaries={flowForecasts}
                nowIso={DEMO_NOW_ISO}
                unit="m³/day"
                label="수량 2종"
              />
            </div>
          </div>
        ) : (
          <ForecastChart summary={forecast} nowIso={DEMO_NOW_ISO} limits={limits.table} />
        )}

        {/*
         * 유량의 R²가 비어 있는 이유는 TOC와 다르다 — TOC는 원문이 값을 주지 않은 것이고,
         * 유량은 **성능 목표 자체가 없다**. 같은 `원문 미규정`으로 보이므로 이유를 적는다(E3).
         */}
        {showFlow && (
          <p className="mt-2 px-1 text-[12px] text-fg-subtle">
            유량 예측은 원문에 정확도 목표가 없다 — AI 성능 목표는 수질 예측에만 있다
          </p>
        )}

        {/* AI 산출값은 언제·무엇을 근거로 나왔는지 값과 함께 보여야 한다(E3) */}
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 border-t border-border pt-3 text-[12px] sm:grid-cols-4">
          <Meta label="산출 모델" value={forecast.modelLabel} />
          <Meta label="입력 대상 기간" value={forecast.inputWindowLabel} />
          <Meta
            label="산출 시각"
            value={
              forecast.online
                ? `${formatDateTime(forecast.computedAtIso)} ${DISPLAY_TIMEZONE}`
                : `중단 · 마지막 ${formatDateTime(forecast.computedAtIso)} ${DISPLAY_TIMEZONE}`
            }
            mono
          />
          <Meta label="결정계수 R²" value={formatR2(r2)} mono={r2 !== null} />
          {/*
            * 원문 화면이 차트 아래에 최대값을 함께 낸다 `[원문 발표 p.16 그림]` — 곡선을
            * 눈으로 훑어 꼭짓점을 찾지 않아도 되게 하는 값이다.
            *
            * **`최대 예측값`이 아니라 `최근 6시간 최대`다** `[INC-109]`. 예측 곡선을
            * 내렸으므로 이 값도 앞날이 아니라 관측 구간에서 나온다 — 이름을 그대로 두면
            * 없는 예측을 주장한다(E3).
            *
            * `전체` 보기에서는 세 항목의 단위가 같아도 크기가 달라 하나로 낼 수 없다.
            */}
          {!showAll && (
            <Meta
              label="최근 6시간 최대"
              value={
                peak === null ? '—' : `${peak.toFixed(forecast.decimals)} ${forecast.unit}`
              }
              mono={peak !== null}
            />
          )}
        </dl>
      </Panel>

      {/*
       * **기준치는 그래프 아래에 온다** `[사용자 요청 2026-08-26]`.
       *
       * 회의가 요구한 것이다 — "어느 지역의 TN 기준치는 몇이고 TP 기준치는 몇인 이러한
       * 사항의 모니터링도 필요" `[회의 2026-08-20]`. 위 카드가 항목마다 자기 기준치를
       * 적지만 **세 항목을 나란히 놓아야** 어느 항목이 아직 비었는지 한눈에 보인다.
       *
       * 자리가 아래인 이유: 이 표는 **판정의 근거**이지 판정이 아니다. 맨 위 카드가
       * 답을 내고, 차트가 그 답이 나온 계열을 보이고, 이 표가 무엇에 견줬는지 밝힌다.
       */}
      <LimitMonitor trends={forecast.trends} limits={limits} pending={seriesPending} />

    </div>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-fg-subtle">{label}</dt>
      <dd className={mono ? 'num mt-0.5 text-fg-muted' : 'mt-0.5 text-fg-muted'}>{value}</dd>
    </div>
  );
}

/**
 * 그 사업장에 적용되는 기준치 표.
 *
 * **기준치는 지역구분 × 배출량 규모 × 항목으로 갈린다** `[공정자료 p.11]`. 값만 보이고 어느
 * 구분의 값인지 안 보이면 다른 사업장의 기준과 구별되지 않는다 — 회의가 요구한 것이 그
 * 모니터링이다 `[회의 2026-08-20]`.
 *
 * **우리가 법령 값을 채우지 않는다** — 법령이 원천이고 우리가 정하면 그냥 틀린 값이 된다
 * (`README` §3.1). 사업장이 허가증의 값을 넣고 화면은 그것을 비추기만 한다.
 */
function LimitMonitor({
  trends,
  limits,
  pending,
}: {
  trends: TrendEstimate[];
  limits: DischargeLimitsView;
  /** 첫 응답 전인가. **기준치 열은 설정에서 오므로 그대로 두고 판정 열만 기다린다** */
  pending: boolean;
}) {
  const classificationLabel = formatClassification(
    limits.classification.regionGrade,
    limits.classification.dischargeScale,
  );

  return (
    <Panel
      title="적용 기준치"
      /*
       * **수량이 왜 이 표에 없는지**와 **이 값이 법정 기준이 아니라는 것**을 한 자리에 모은다.
       * 조용히 빠져 있으면 "빠뜨렸나"로 읽히고, 출처를 안 적으면 법정 표로 읽힌다.
       */
      titleAside={
        <InfoTip
          label="이 표가 담는 것과 담지 않는 것"
          content={`유입 · 유량 · 유출은 기준 대상이 아닙니다 — 배출허용기준은 농도 기준입니다. 기준치는 지역구분 · 1일 폐수배출량 규모 · 항목으로 갈립니다. 법령이 원천이라 우리가 법정 표를 채우지 않습니다 — 지금 표의 TOC · TN · TP는 시연 기본값이며 법정 기준이 아닙니다. 사업장 허가증(폐수배출시설 설치허가·신고증)의 값을 시스템 설정에 넣으면 그 값이 덮어씁니다.${limits.unresolvedReason ? ` ${limits.unresolvedReason}` : ''}`}
        />
      }
      action={
        <span className="text-[12px] text-fg-subtle">
          {classificationLabel ?? '사업장 분류 미설정'}
        </span>
      }
    >
      <div className="overflow-x-auto">
        <table className={`${TABLE_ROOT} min-w-[520px] text-[12px] text-center`}>
          <thead>
            <tr className={TABLE_HEAD_ROW}>
              <th className={TABLE_HEAD_CELL}>항목</th>
              <th className={TABLE_HEAD_CELL}>기준치</th>
              <th className={TABLE_HEAD_CELL}>판정</th>
              <th className={TABLE_HEAD_CELL}>출처</th>
            </tr>
          </thead>
          <tbody>
            {trends.map((trend) => {
              const limit = limits.table[trend.code];
              const range = formatLimitRange(limit, trend.decimals);
              const over = isOverLimit(trend.code, trend.value, limits.table);
              const verdict = trendVerdict(trend, over, limits.unresolvedReason);

              return (
                <tr key={trend.code} className={TABLE_ROW}>
                  <td className="px-3 py-3.5">
                    <span className="font-semibold text-fg">{trend.code}</span>
                    <span className="ml-1.5 text-[12px] text-fg-subtle">{trend.label}</span>
                  </td>
                  <td className="num px-3 py-3.5 text-center">
                    {range === null ? (
                      <span className="text-fg-subtle">—</span>
                    ) : (
                      <span className="text-fg">
                        {range} {trend.unit}
                      </span>
                    )}
                  </td>
                  {/* 판정만 계열에서 온다 — 기준치·출처 열은 설정이 아는 것이라 그대로 둔다 */}
                  <td className="px-3 py-3.5" style={{ color: pending ? undefined : verdict.ink }}>
                    {pending ? (
                      <Skeleton className="mx-auto h-3 w-16" />
                    ) : (
                      verdict.text
                    )}
                  </td>
                  {/* 우리가 넣은 값이 아니라 사용자가 넣은 값임을 심사자가 바로 알아야 한다 */}
                  <td className="px-3 py-3.5 text-[12px] text-fg-subtle">
                    {limit && limit.unavailableReason === null
                      ? limit.source
                      : UNRESOLVED_LIMIT_TEXT}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/**
 * 항목 하나의 판정 카드.
 *
 * **차트로 가는 버튼을 두지 않는다** `[사용자 요청 2026-08-26]`. 대상 선택은 위 패널의
 * 세그먼트가 이미 갖고 있어 같은 조작이 화면에 두 벌이었고, 카드가 고른 것과 세그먼트가
 * 고른 것이 같은 상태를 서로 다르게 표시했다(`보는 중` 배지 vs 켜진 칸).
 */
function TrendCard({
  trend,
  limits,
  pending,
}: {
  trend: TrendEstimate;
  /** 기준표는 사업장 설정에서 온다 — 카드가 정적 표를 직접 읽으면 설정이 반영되지 않는다 */
  limits: DischargeLimitsView;
  /**
   * 첫 응답 전인가 `[사용자 지적 2026-09-07]`.
   *
   * 계열이 비면 `trendVerdict`가 값 없음을 **`수신 없음 · 통신 두절로 산출 중단`** 이라
   * 적는다 — 아직 묻지도 않은 상태에 확인된 부재의 말을 쓰는 것이다(**E4**).
   */
  pending: boolean;
}) {
  /* `null`은 판정하지 않았다는 뜻이다 — 기준이 없거나 값이 결측이다(E4) */
  const over = isOverLimit(trend.code, trend.value, limits.table);
  const headline = pending
    ? { text: TELEMETRY_PENDING_NOTE, ink: undefined, basis: null }
    : trendVerdict(trend, over, limits.unresolvedReason);
  /* 판정만 있고 기준치가 안 보이면 무엇에 견준 판정인지 알 수 없다 `[회의 2026-08-20]` */
  const range = formatLimitRange(limits.table[trend.code], trend.decimals);
  const classificationLabel = formatClassification(
    limits.classification.regionGrade,
    limits.classification.dischargeScale,
  );

  return (
    <Panel title={trend.code}>
      <div className="flex items-end justify-between gap-3">
        {/*
         * **농도를 적지 않는다** `[회의 2026-08-20]`. 소프트 센싱으로는 절대값의 정확도를
         * 맞추기 어려워 높낮이만 낸다 — 숫자를 크게 띄우면 그 값이 계측된 농도로 읽힌다(E3).
         *
         * **축은 기준치 하나다** `[사용자 지적 2026-08-21]`. 기준이 없을 때 시간 축으로
         * 대체하지 않는다 — 화면이 묻지 않은 것을 답한다. 대신 아래 줄이 **기준치 자체**를
         * 보여 주고 근거 줄이 무엇을 설정해야 하는지 적는다.
         *
         * **글자 크기를 줄이지 않는다.** 예전에는 `기준 미설정`이 15px 흐린 글자로 떨어져
         * "이 카드엔 값이 없다"로 읽혔다.
         */}
        <p
          className={`${VALUE_MD} text-fg`}
          style={{ color: headline.ink }}
        >
          {headline.text}
        </p>
        <TrendChip trend={trend.trend} />
      </div>
      {/*
        * **기준치를 값으로 보여 준다** `[회의 2026-08-20: 어느 지역의 TN 기준치는 몇이고
        * TP 기준치는 몇인 이러한 사항의 모니터링도 필요]`. 판정만 있으면 무엇에 견준 것인지
        * 알 수 없고, 기준치가 지역·규모마다 다르므로 어느 구분의 값인지도 함께 적는다.
        */}
      <p className="mt-2 text-[12px] text-fg-muted">
        기준{' '}
        {range === null ? (
          <span className="text-fg-subtle">미설정</span>
        ) : (
          <span className="num text-fg">
            {range} {trend.unit}
          </span>
        )}
        {classificationLabel && <span className="ml-1 text-fg-subtle">· {classificationLabel}</span>}
      </p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-fg-subtle">
        {SERIES_ORIGIN_LABELS[trend.origin]} · R² <span className="num">{formatR2(trend.r2)}</span>
        {/* 어느 근거로 판정했는지 적는다 — 기준 미설정이면 무엇을 해야 하는지가 온다 */}
        <span className="ml-1">· {headline.basis}</span>
      </p>
    </Panel>
  );
}
