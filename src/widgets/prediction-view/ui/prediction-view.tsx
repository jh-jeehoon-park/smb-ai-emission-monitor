'use client';

import { useMemo } from 'react';
import { DEMO_NOW_ISO } from '@/shared/config/demo';
import {
  UNRESOLVED_LIMIT_TEXT,
  formatClassification,
  formatLimitRange,
  isOverLimit,
  type DischargeLimitTable,
} from '@/shared/config/discharge-limits';
import { DISPLAY_TIMEZONE, formatClock, formatDateTime } from '@/shared/lib/format';
import { useQueryState } from '@/shared/lib/use-query-state';
import { ChartFigure } from '@/shared/ui/chart-figure';
import { Panel } from '@/shared/ui/panel';
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
  hasPlottableValues,
  peakValue,
  type ForecastPoint,
  type ForecastSummary,
  type ForecastTargetCode,
  type TrendEstimate,
} from '@/entities/prediction';
import { getSite } from '@/entities/site';
import {
  useDischargeLimits,
  type DischargeLimitsView,
} from '@/features/discharge-limit-settings';
import { useSelectedSiteId } from '@/features/site-selection';
import { SegmentedControl } from '@/shared/ui/segmented-control';
import {
  COMPACT_HEIGHT,
  ForecastChart,
  ForecastEmpty,
  ForecastHorizonNote,
  ForecastLegend,
  ForecastLimitNote,
} from '@/widgets/forecast-chart';
import { ALL_TARGETS, TARGET_QUERY_KEY, TARGET_VIEWS, type TargetView } from '../config/constants';

const TARGET_OPTIONS: { value: TargetView; label: string }[] = [
  { value: ALL_TARGETS, label: '전체' },
  ...FORECAST_TARGET_CODES.map((code) => ({ value: code as TargetView, label: code })),
  /* 수량은 오염도와 다른 축이라 맨 뒤에 둔다 `[원문 발표 p.11]` */
  { value: FLOW_FORECAST_CODE, label: '유량' },
];
const DEFAULT_VIEW: TargetView = ALL_TARGETS;

export function PredictionView() {
  const { siteId } = useSelectedSiteId();
  /* 기준표는 사업장 설정에서 온다 — 화면이 정적 표를 직접 읽으면 설정이 반영되지 않는다 */
  const limits = useDischargeLimits();
  const [view, setView] = useQueryState(TARGET_QUERY_KEY, TARGET_VIEWS, DEFAULT_VIEW);
  const site = getSite(siteId);

  /* 전체 보기에서는 세 항목을 모두 만든다. 데이터는 이미 세 벌 다 생성돼 있다 */
  const showAll = view === ALL_TARGETS;
  const showFlow = view === FLOW_FORECAST_CODE;
  const single: ForecastTargetCode = showAll || showFlow ? 'TOC' : view;
  const forecast = useMemo(
    () => (showFlow ? getFlowForecast(siteId) : getForecast(siteId, single)),
    [siteId, single, showFlow],
  );
  const allForecasts = useMemo(
    () => (showAll ? FORECAST_TARGET_CODES.map((code) => getForecast(siteId, code)) : []),
    [siteId, showAll],
  );
  /* 결정계수는 보고 있는 계열의 것이다 — 유량은 성능 목표 자체가 없다 `[원문 발표 p.26]` */
  const r2 = showFlow ? FLOW_FORECAST.r2 : FORECAST_TARGETS[single].r2;
  const peak = peakValue(forecast);

  return (
    <div className="space-y-3">
      <Panel
        eyebrow={`${forecast.modelLabel} · ${site.name}`}
        title={
          showAll
            ? `TOC · TN · TP · 최근 ${SERIES_WINDOW_HOURS}시간 추이`
            : `${forecast.targetLabel} · 최근 ${SERIES_WINDOW_HOURS}시간 추이`
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
        {showAll ? (
          <ForecastStack limits={limits.table} summaries={allForecasts} />
        ) : (
          <ForecastChart summary={forecast} nowIso={DEMO_NOW_ISO} limits={limits.table} />
        )}

        {/*
         * 유량의 R²가 비어 있는 이유는 TOC와 다르다 — TOC는 원문이 값을 주지 않은 것이고,
         * 유량은 **성능 목표 자체가 없다**. 같은 `원문 미규정`으로 보이므로 이유를 적는다(E3).
         */}
        {showFlow && (
          <p className="mt-2 px-1 text-[11px] text-fg-subtle">
            유량 예측은 원문에 정확도 목표가 없다 — AI 성능 목표는 수질 예측에만 있다 [원문 발표
            p.26] · 예측 대상 포함은 [INC-95] 판정
          </p>
        )}

        {/* AI 산출값은 언제·무엇을 근거로 나왔는지 값과 함께 보여야 한다(E3) */}
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 border-t border-border pt-3 text-[11px] sm:grid-cols-4">
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
       * **기준치 모니터링.** 회의가 요구한 것이다 — "어느 지역의 TN 기준치는 몇이고 TP
       * 기준치는 몇인 이러한 사항의 모니터링도 필요" `[회의 2026-08-20]`.
       *
       * 카드가 항목마다 자기 기준치를 적지만, **세 항목을 나란히 놓아야** 어느 항목이 아직
       * 비었는지 한눈에 보인다 — 카드 셋을 훑어 비교하게 만들면 그것이 안 보인다.
       */}
      <LimitMonitor trends={forecast.trends} limits={limits} />

      <div className="grid gap-3 lg:grid-cols-3">
        {forecast.trends.map((trend) => (
          <TrendCard
            key={trend.code}
            trend={trend}
            limits={limits}
            selected={trend.code === view}
            onSelect={() => setView(trend.code)}
          />
        ))}
      </div>

      <Panel eyebrow="Soft Sensing" title="추정 대상과 계측 대상">
        <p className="max-w-[86ch] text-[12px] leading-relaxed text-fg-muted">
          TOC는 센서로 직접 계측하고,{' '}
          <strong className="text-fg">TN·TP는 계측 센서가 없어 소프트 센싱 추정만 존재한다</strong>
          (발표자료 p.17). 그래서 카드는{' '}
          <strong className="text-fg">농도를 적지 않고 기준 대비 높낮이만</strong> 냅니다 —
          소프트 센싱으로는 절대값의 정확도를 맞추기 어렵다는 판단입니다 [회의 2026-08-20].
          통신이 두절되면 추정도 중단되며 마지막 산출 시각만 남습니다 — 값을 임의로 이어
          붙이지 않습니다(E3).
        </p>
      </Panel>
    </div>
  );
}

/**
 * 세 항목을 3단으로 쌓는다.
 *
 * **한 축에 겹치지 않는 이유가 데이터에 있다** — TOC 25.5 · TN 16 · TP 1.5 mg/L로
 * 17배 차이라 같은 눈금에 올리면 TP가 바닥에 눕는다. 시간축만 공유하고 세로 눈금은
 * 각자 쓴다. 세로로 훑으면 같은 시각의 세 항목을 비교할 수 있다.
 */
function ForecastStack({
  summaries,
  limits,
}: {
  summaries: ForecastSummary[];
  /* 기준표를 위에서 받는다 — 이 컴포넌트가 직접 읽으면 화면 안에서 두 표가 생긴다 */
  limits: DischargeLimitTable;
}) {
  const lastIndex = summaries.length - 1;

  /*
   * 세 항목이 모두 비면 한 번만 말한다. 단마다 같은 문장을 적으면 세 가지 다른 사정이
   * 있는 것처럼 읽히고, 그릴 계열이 없는데 범례가 계열을 설명하고 표는 전부 `—`가 된다.
   */
  if (summaries.every((summary) => !hasPlottableValues(summary))) {
    return <ForecastEmpty height={COMPACT_HEIGHT * summaries.length} />;
  }

  return (
    <>
      {/*
       * 표와 범례는 스택 전체가 하나만 갖는다. 단마다 붙이면 `표로 보기`가 세 번,
       * 범례가 세 번 나와 무엇이 다른 표인지 알 수 없다 — 세 항목이 같은 시각 축을
       * 쓰므로 한 표에 나란히 담는 편이 비교에도 맞다.
       */}
      <ChartFigure
        label={`TOC · TN · TP 최근 ${SERIES_WINDOW_HOURS}시간 계열, 시각 축 공유, KST 기준`}
        rows={summaries[0]?.points ?? []}
        sampleEvery={6}
        columns={[
          { header: '시각(KST)', cell: (r) => formatClock(r.t) },
          ...summaries.map((summary, i) => ({
            header: `${code(i)}(${summary.unit})`,
            cell: (r: ForecastPoint) => valueAt(summaries[i]!, r.t),
          })),
        ]}
      >
        <div className="divide-y divide-border">
          {summaries.map((summary, i) => {
            const latest =
              [...summary.points].reverse().find((p) => p.value !== null)?.value ?? null;

            return (
              <div key={summary.targetLabel} className={i === 0 ? 'pb-2' : 'py-2 last:pb-0'}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <p className="text-[12px] font-medium text-fg">{summary.targetLabel}</p>
                  <p className="text-[11px] text-fg-subtle">
                    현재{' '}
                    <span className="num text-fg-muted">
                      {latest === null ? '—' : latest.toFixed(summary.decimals)}
                    </span>{' '}
                    {summary.unit} · {SERIES_ORIGIN_LABELS[summary.origin]}
                  </p>
                </div>
                {/* 시각 라벨은 맨 아래 단에만, `현재` 라벨은 첫 단에만 — 세 단이 같은 축을 쓴다 */}
                <ForecastChart
                  summary={summary}
                  nowIso={DEMO_NOW_ISO}
                  limits={limits}
                  compact
                  showTimeAxis={i === lastIndex}
                  showNowLabel={i === 0}
                />
              </div>
            );
          })}
        </div>
      </ChartFigure>

      {/* 세 단이 같은 규약을 쓰므로 범례·문구는 스택 전체에 하나만 둔다 */}
      <ForecastLegend origin={summaries[0]!.origin} />
      <ForecastHorizonNote />
      <ForecastLimitNote code={code(0)} limits={limits} />
    </>
  );
}

const code = (index: number): ForecastTargetCode => FORECAST_TARGET_CODES[index]!;

/**
 * 세 항목이 같은 시각 축을 쓰지만 표는 시각으로 맞춰 읽는다 — 배열 순서에 기대지 않는다.
 * 값이 없으면 `수신 없음`이다. 0으로 채우면 없는 계측을 만든다(E4).
 */
function valueAt(summary: ForecastSummary, iso: string): string {
  const value = summary.points.find((p) => p.t === iso)?.value ?? null;
  return value === null ? '수신 없음' : value.toFixed(summary.decimals);
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
}: {
  trends: TrendEstimate[];
  limits: DischargeLimitsView;
}) {
  const classificationLabel = formatClassification(
    limits.classification.regionGrade,
    limits.classification.dischargeScale,
  );

  return (
    <Panel
      eyebrow="배출허용기준"
      title="적용 기준치"
      action={
        <span className="text-[12px] text-fg-subtle">
          {classificationLabel ?? '사업장 분류 미설정'}
        </span>
      }
      bodyClassName="p-0"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-border text-[11px] text-fg-subtle">
              <th className="px-4 py-2 text-left font-normal">항목</th>
              <th className="px-3 py-2 text-right font-normal">기준치</th>
              <th className="px-3 py-2 text-left font-normal">판정</th>
              <th className="px-4 py-2 text-left font-normal">출처</th>
            </tr>
          </thead>
          <tbody>
            {trends.map((trend) => {
              const limit = limits.table[trend.code];
              const range = formatLimitRange(limit, trend.decimals);
              const over = isOverLimit(trend.code, trend.value, limits.table);
              const verdict = trendVerdict(trend, over, limits.unresolvedReason);

              return (
                <tr key={trend.code} className="border-b border-border last:border-0">
                  <td className="px-4 py-2">
                    <span className="font-semibold text-fg">{trend.code}</span>
                    <span className="ml-1.5 text-[11px] text-fg-subtle">{trend.label}</span>
                  </td>
                  <td className="num px-3 py-2 text-right">
                    {range === null ? (
                      <span className="text-fg-subtle">—</span>
                    ) : (
                      <span className="text-fg">
                        {range} {trend.unit}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2" style={{ color: verdict.ink }}>
                    {verdict.text}
                  </td>
                  {/* 우리가 넣은 값이 아니라 사용자가 넣은 값임을 심사자가 바로 알아야 한다 */}
                  <td className="px-4 py-2 text-[11px] text-fg-subtle">
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
      <p className="max-w-[86ch] border-t border-border px-4 py-2 text-[11px] leading-relaxed text-fg-subtle">
        기준치는 <strong className="text-fg-muted">지역구분 · 1일 폐수배출량 규모 · 항목</strong>으로
        갈립니다 [공정자료 p.11].{' '}
        <strong className="text-fg-muted">법령이 원천이므로 우리가 값을 채우지 않습니다</strong> —
        사업장 허가증(폐수배출시설 설치허가·신고증)의 값을 시스템 설정에 넣으면 이 표와 위 카드가
        곧바로 기준 판정으로 바뀝니다.
        {limits.unresolvedReason && <span className="ml-1">{limits.unresolvedReason}</span>}
      </p>
    </Panel>
  );
}

function TrendCard({
  trend,
  limits,
  selected,
  onSelect,
}: {
  trend: TrendEstimate;
  /** 기준표는 사업장 설정에서 온다 — 카드가 정적 표를 직접 읽으면 설정이 반영되지 않는다 */
  limits: DischargeLimitsView;
  selected: boolean;
  onSelect: () => void;
}) {
  /* `null`은 판정하지 않았다는 뜻이다 — 기준이 없거나 값이 결측이다(E4) */
  const over = isOverLimit(trend.code, trend.value, limits.table);
  const headline = trendVerdict(trend, over, limits.unresolvedReason);
  /* 판정만 있고 기준치가 안 보이면 무엇에 견준 판정인지 알 수 없다 `[회의 2026-08-20]` */
  const range = formatLimitRange(limits.table[trend.code], trend.decimals);
  const classificationLabel = formatClassification(
    limits.classification.regionGrade,
    limits.classification.dischargeScale,
  );

  return (
    <Panel
      eyebrow={trend.label}
      title={trend.code}
      className={selected ? 'border-border-strong' : undefined}
      action={
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          className="cursor-pointer rounded-[3px] border border-border px-2 py-1 text-[11px] text-fg-subtle transition-colors duration-200 hover:border-border-strong hover:text-fg"
        >
          {selected ? '보는 중' : '차트 보기'}
        </button>
      }
    >
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
          className="text-[19px] font-semibold leading-tight tracking-tight text-fg"
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
      <p className="mt-1.5 text-[11px] leading-relaxed text-fg-subtle">
        {SERIES_ORIGIN_LABELS[trend.origin]} · R² <span className="num">{formatR2(trend.r2)}</span>
        {/* 어느 근거로 판정했는지 적는다 — 기준 미설정이면 무엇을 해야 하는지가 온다 */}
        <span className="ml-1">· {headline.basis}</span>
      </p>
    </Panel>
  );
}
