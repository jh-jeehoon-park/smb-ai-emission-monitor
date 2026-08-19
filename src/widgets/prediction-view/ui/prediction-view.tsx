'use client';

import { useMemo } from 'react';
import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { FORECAST_HORIZON_HOURS } from '@/shared/config/measurement';
import { STATUS_VISUAL, statusInk } from '@/shared/config/status-visual';
import { DISPLAY_TIMEZONE, formatClock, formatDateTime } from '@/shared/lib/format';
import { useQueryState } from '@/shared/lib/use-query-state';
import { ChartFigure } from '@/shared/ui/chart-figure';
import { Panel } from '@/shared/ui/panel';
import {
  FLOW_FORECAST,
  FLOW_FORECAST_CODE,
  FORECAST_TARGETS,
  FORECAST_TARGET_CODES,
  TREND_LABELS,
  formatR2,
  getFlowForecast,
  getForecast,
  hasPlottableValues,
  type ForecastPoint,
  type ForecastSummary,
  type ForecastTargetCode,
  type TrendEstimate,
} from '@/entities/prediction';
import { getSite } from '@/entities/site';
import { useSelectedSiteId } from '@/features/site-selection';
import { SegmentedControl } from '@/shared/ui/segmented-control';
import {
  COMPACT_HEIGHT,
  ForecastChart,
  ForecastEmpty,
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

  return (
    <div className="space-y-3">
      <Panel
        eyebrow={`${forecast.modelLabel} · ${site.name}`}
        title={
          showAll
            ? `TOC · TN · TP · 향후 ${FORECAST_HORIZON_HOURS}시간 예측`
            : `${forecast.targetLabel} · 향후 ${FORECAST_HORIZON_HOURS}시간 예측`
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
          <ForecastStack summaries={allForecasts} />
        ) : (
          <ForecastChart summary={forecast} nowIso={DEMO_NOW_ISO} />
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
        </dl>
      </Panel>

      <div className="grid gap-3 lg:grid-cols-3">
        {forecast.trends.map((trend) => (
          <TrendCard
            key={trend.code}
            trend={trend}
            selected={trend.code === view}
            onSelect={() => setView(trend.code)}
          />
        ))}
      </div>

      <Panel eyebrow="Soft Sensing" title="추정 대상과 계측 대상">
        <p className="max-w-[86ch] text-[12px] leading-relaxed text-fg-muted">
          TOC는 센서로 직접 계측하면서 동시에 예측하고,{' '}
          <strong className="text-fg">TN·TP는 계측 센서가 없어 AI 추정만 존재한다</strong>(발표자료
          p.17). 세 항목의 경향은 어느 항목을 보고 있든 함께 표시하며, 값은 각 항목의 예측 마지막
          지점에서 가져온다. 통신이 두절되면 추정도 중단되며 마지막 산출 시각만 남는다 — 값을 임의로
          이어 붙이지 않는다(E3).
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
function ForecastStack({ summaries }: { summaries: ForecastSummary[] }) {
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
        label={`TOC · TN · TP 실측과 향후 ${FORECAST_HORIZON_HOURS}시간 AI 예측, 시각 축 공유, KST 기준`}
        rows={summaries[0]?.points ?? []}
        sampleEvery={6}
        columns={[
          { header: '시각(KST)', cell: (r) => formatClock(r.t) },
          ...summaries.flatMap((summary, i) => [
            {
              header: `${code(i)} 실측(${summary.unit})`,
              cell: (r: ForecastPoint) => valueAt(summaries[i]!, r.t, 'actual'),
            },
            {
              header: `${code(i)} AI 예측(${summary.unit})`,
              cell: (r: ForecastPoint) => valueAt(summaries[i]!, r.t, 'forecast'),
            },
          ]),
        ]}
      >
        <div className="divide-y divide-border">
          {summaries.map((summary, i) => {
            const latest =
              [...summary.points].reverse().find((p) => p.actual !== null)?.actual ?? null;

            return (
              <div key={summary.targetLabel} className={i === 0 ? 'pb-2' : 'py-2 last:pb-0'}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <p className="text-[12px] font-medium text-fg">{summary.targetLabel}</p>
                  <p className="text-[11px] text-fg-subtle">
                    현재{' '}
                    <span className="num text-fg-muted">
                      {latest === null ? '—' : latest.toFixed(summary.decimals)}
                    </span>{' '}
                    {summary.unit} · R²{' '}
                    <span className="num">{formatR2(FORECAST_TARGETS[code(i)].r2)}</span>
                  </p>
                </div>
                {/* 시각 라벨은 맨 아래 단에만, `현재` 라벨은 첫 단에만 — 세 단이 같은 축을 쓴다 */}
                <ForecastChart
                  summary={summary}
                  nowIso={DEMO_NOW_ISO}
                  compact
                  showTimeAxis={i === lastIndex}
                  showNowLabel={i === 0}
                />
              </div>
            );
          })}
        </div>
      </ChartFigure>

      <ForecastLegend />
      {/* 세 항목 모두 같은 이유로 기준이 없다 — 단마다 적지 않는다 */}
      <ForecastLimitNote code={code(0)} />
    </>
  );
}

const code = (index: number): ForecastTargetCode => FORECAST_TARGET_CODES[index]!;

/**
 * 세 항목이 같은 시각 축을 쓰지만 표는 시각으로 맞춰 읽는다 — 배열 순서에 기대지 않는다.
 * 값이 없으면 `—`다. 0으로 채우면 없는 계측을 만든다(E4).
 */
function valueAt(
  summary: ForecastSummary,
  iso: string,
  key: 'actual' | 'forecast',
): string {
  const value = summary.points.find((p) => p.t === iso)?.[key] ?? null;
  return value === null ? '—' : value.toFixed(summary.decimals);
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-fg-subtle">{label}</dt>
      <dd className={mono ? 'num mt-0.5 text-fg-muted' : 'mt-0.5 text-fg-muted'}>{value}</dd>
    </div>
  );
}

function TrendCard({
  trend,
  selected,
  onSelect,
}: {
  trend: TrendEstimate;
  selected: boolean;
  onSelect: () => void;
}) {
  const rising = trend.trend === 'rising';
  const ink = rising ? statusInk(STATUS_VISUAL.warning) : 'var(--fg-muted)';

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
        <p className="num text-[28px] font-semibold leading-none tracking-tight text-fg">
          {/* 두절이면 값 자체가 없다 — 별도 플래그로 가리지 않는다 */}
          {trend.value === null ? '—' : trend.value.toFixed(trend.decimals)}
          <span className="ml-1.5 text-[11px] font-normal text-fg-subtle">{trend.unit}</span>
        </p>
        <p className="text-[12px]" style={{ color: ink }}>
          <span aria-hidden className="mr-1">
            {rising ? '▲' : trend.trend === 'falling' ? '▼' : '—'}
          </span>
          {TREND_LABELS[trend.trend]}
        </p>
      </div>
      <p className="num mt-2 text-[11px] text-fg-subtle">R² {formatR2(trend.r2)} · AI 추정값</p>
    </Panel>
  );
}
