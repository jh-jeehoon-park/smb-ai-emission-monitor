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
import { Panel } from '@/shared/ui/panel';
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
  peakValue,
  type ForecastTargetCode,
  type TrendEstimate,
} from '@/entities/prediction';
import {
  useDischargeLimits,
  type DischargeLimitsView,
} from '@/features/discharge-limit-settings';
import { useSelectedSiteId } from '@/features/site-selection';
import { SegmentedControl } from '@/shared/ui/segmented-control';
import {
  ForecastChart,
  ForecastHorizonNote,
  ForecastOverlay,
} from '@/widgets/forecast-chart';
import { ALL_TARGETS, TARGET_QUERY_KEY, TARGET_VIEWS, type TargetView } from '../config/constants';
import { TABLE_HEAD_CELL, TABLE_HEAD_ROW, TABLE_ROOT, TABLE_ROW } from '@/shared/ui/table';
import { ACTION_BUTTON_QUIET } from '@/shared/ui/action-button';

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

  /* 전체 보기에서는 세 항목을 모두 만든다. 데이터는 이미 세 벌 다 생성돼 있다 */
  const showAll = view === ALL_TARGETS;
  const showFlow = FLOW_VIEWS.includes(view);
  const single: ForecastTargetCode = showAll || showFlow ? 'TOC' : (view as ForecastTargetCode);
  const forecast = useMemo(
    () => (showFlow ? getFlowForecast(siteId, view as 'flow' | 'inflow') : getForecast(siteId, single)),
    [siteId, single, showFlow, view],
  );
  const allForecasts = useMemo(
    () => (showAll ? FORECAST_TARGET_CODES.map((code) => getForecast(siteId, code)) : []),
    [siteId, showAll],
  );
  /* 수량은 축이 달라 따로 겹친다 — 농도와 부피/시간을 한 눈금에 두면 둘 다 못 읽는다 */
  const flowForecasts = useMemo(
    () =>
      showAll
        ? [getFlowForecast(siteId, 'inflow'), getFlowForecast(siteId, FLOW_FORECAST_CODE)]
        : [],
    [siteId, showAll],
  );
  /* 결정계수는 보고 있는 계열의 것이다 — 유량은 성능 목표 자체가 없다 `[원문 발표 p.26]` */
  const r2 = showFlow ? FLOW_FORECAST.r2 : FORECAST_TARGETS[single].r2;
  const peak = peakValue(forecast);

  return (
    <div className="space-y-6">
      {/*
       * **기준치 모니터링이 맨 위에 온다** `[사용자 결정 2026-08-25]`.
       *
       * 회의가 요구한 것이다 — "어느 지역의 TN 기준치는 몇이고 TP 기준치는 몇인 이러한
       * 사항의 모니터링도 필요" `[회의 2026-08-20]`. 카드가 항목마다 자기 기준치를 적지만
       * **세 항목을 나란히 놓아야** 어느 항목이 아직 비었는지 한눈에 보인다.
       *
       * 자리를 위로 올린 근거가 하나 더 있다 — 아래 계열이 **기준 대비**로 읽히므로
       * 기준치를 모르면 그 차트를 읽을 수 없다. 판정의 축이 먼저 와야 한다.
       */}
      <LimitMonitor trends={forecast.trends} limits={limits} />

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
            <ForecastHorizonNote />
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
            유량 예측은 원문에 정확도 목표가 없다 — AI 성능 목표는 수질 예측에만 있다 [원문 발표
            p.26] · 예측 대상 포함은 [INC-95] 판정
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

      <div className="grid gap-6 lg:grid-cols-3">
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

      <Panel title="추정 대상과 계측 대상">
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
      title="적용 기준치"
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
                  <td className="px-3 py-3.5" style={{ color: verdict.ink }}>
                    {verdict.text}
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
      {/*
       * **수량이 왜 이 표에 없는지 적는다** `[사용자 결정 2026-08-25]`. 배출허용기준은 농도
       * 기준이라 유량에는 기준이 없다 — 그런데 조용히 빠져 있으면 "빠뜨렸나"로 읽힌다.
       */}
      <p className="max-w-[86ch] border-t border-border pt-2 text-[12px] leading-relaxed text-fg-subtle">
        유입 · 유량 · 유출은 <strong className="text-fg-muted">기준 대상이 아닙니다</strong> —
        배출허용기준은 농도 기준입니다.
      </p>
      {/*
       * **문구가 표와 어긋나면 안 된다.** 한때 여기가 *"우리가 값을 채우지 않습니다"* 라고
       * 적는데 바로 위 `출처` 열은 `[시연 기본값]`이라 적고 있었다 — 한 카드가 두 말을 했다.
       *
       * 법정 표(`DISCHARGE_LIMITS`)를 채우지 않는 것은 여전히 사실이다. 다만 시연에서는
       * *"사용자가 이미 넣어 둔 상태"* 를 만들어 두었고(`[PROVISIONAL]`), 그 사실을 여기서
       * 밝힌다 — 값 옆의 `출처`와 같은 말을 해야 한다.
       */}
      <p className="max-w-[86ch] py-2 text-[12px] leading-relaxed text-fg-subtle">
        기준치는 <strong className="text-fg-muted">지역구분 · 1일 폐수배출량 규모 · 항목</strong>으로
        갈립니다 [공정자료 p.11].{' '}
        <strong className="text-fg-muted">법령이 원천이라 우리가 법정 표를 채우지 않습니다</strong> —
        지금 표의 TOC · TN · TP는 <strong className="text-fg-muted">시연 기본값이며 법정 기준이
        아닙니다</strong>. 사업장 허가증(폐수배출시설 설치허가·신고증)의 값을 시스템 설정에 넣으면
        그 값이 덮어씁니다.
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
      title={trend.code}
      className={selected ? 'border-accent/40' : undefined}
      action={
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          /* 켜진 쪽은 **지금 보고 있다는 표시**라 눌리는 버튼처럼 띄우지 않는다 */
          className={
            selected
              ? `${ACTION_BUTTON_QUIET} border-accent/40 bg-accent-weak font-semibold text-accent`
              : ACTION_BUTTON_QUIET
          }
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
