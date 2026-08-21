'use client';

import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ACTUAL_HEX, AI_HEX, AXIS_TEXT_HEX, GRID_HEX } from '@/shared/config/status-visual';
import { formatClock } from '@/shared/lib/format';
import { ChartFigure } from '@/shared/ui/chart-figure';
import { ChartTooltipRow, ChartTooltipShell } from '@/shared/ui/chart-tooltip';
import {
  DISCHARGE_LIMITS,
  UNRESOLVED_LIMIT_TEXT,
  type DischargeLimitTable,
} from '@/shared/config/discharge-limits';
import {
  hasPlottableValues,
  type ForecastSeriesCode,
  type ForecastSummary,
  SERIES_ORIGIN_LABELS,
  type SeriesOrigin,
} from '@/entities/prediction';
import { COMPACT_HEIGHT, FULL_HEIGHT } from '../config/constants';

interface ForecastChartProps {
  summary: ForecastSummary;
  nowIso: string;
  /**
   * 3단 보기에서 쓰는 낮은 변형.
   *
   * **차트 규약은 그대로다** — 계열 색, `현재` 경계선, 툴팁이 같다. 같은 값을 두 변형이
   * 다르게 보이면 안 된다. 줄이는 것은 높이와 눈금 밀도이고, 표·범례는 스택이 하나만
   * 갖는다(단마다 반복되면 잡음이다).
   */
  compact?: boolean;
  /**
   * 시간축 라벨을 그릴지. 3단 보기에서는 **마지막 단만** 그린다 — 세 단이 같은 축을
   * 쓰는 것이 설계 의도인데 라벨을 세 번 그리면 축이 셋인 것처럼 보인다.
   */
  showTimeAxis?: boolean;
  /** `현재` 경계 라벨. 3단 보기에서는 **첫 단만** 그린다 — 경계선은 세 단에서 같은 시각이다 */
  showNowLabel?: boolean;
  /**
   * 사용자가 설정한 기준표.
   *
   * **밑줄 문구가 이것을 봐야 한다.** 정적 표를 직접 읽던 동안, 사용자가 기준치를 넣어도
   * 차트 밑에는 `기준값 미확정`이 남아 카드는 `기준보다 높음`이라 말하는데 같은 화면이
   * 그것을 반박했다.
   */
  limits?: DischargeLimitTable;
}

/**
 * 최근 6시간 계열.
 *
 * **예측선과 신뢰구간이 없다** `[회의 2026-08-20]` `[INC-109]`. TN·TP로 6시간을 예측하는
 * 것이 아니고 6시간 예측의 대상은 아직 정해지지 않았다(`[TBD-52]`) — 없는 데이터로 곡선을
 * 그리면 산출된 예측처럼 읽힌다(E3).
 *
 * 계열의 색은 **값의 출처**를 따른다 — TN·TP는 소프트 센싱 추정이라 계측과 같은 색으로
 * 그리지 않는다. 색만으로 가르지 않고 범례와 표가 함께 적는다.
 */
export function ForecastChart({
  summary,
  nowIso,
  compact = false,
  showTimeAxis = true,
  showNowLabel = true,
  limits,
}: ForecastChartProps) {
  const data = summary.points;
  const show = (v: number) => v.toFixed(summary.decimals);
  const height = compact ? COMPACT_HEIGHT : FULL_HEIGHT;
  /* 추정 계열은 계측과 다른 색을 쓴다 — 한 화면에서 둘이 섞이면 추정이 계측으로 읽힌다(E3) */
  const stroke = summary.origin === 'measured' ? ACTUAL_HEX : AI_HEX;
  const originLabel = SERIES_ORIGIN_LABELS[summary.origin];

  /*
   * 그릴 값이 하나도 없으면 차트를 그리지 않는다.
   *
   * 눈금도 선도 없는 빈 격자는 "값이 0에 가깝다"로 오독된다. 두절 구간을 밴드로 칠해
   * 보려 했지만 y 범위 자체가 없어 밴드가 렌더되지 않았다 — 왜 비었는지는 글로 적는다(R19·E4).
   * `online`이 아니라 **그릴 값의 유무**로 판단한다. 일부만 결측인 사업장은 그대로 그린다.
   */
  if (!hasPlottableValues(summary)) {
    return <ForecastEmpty height={height} />;
  }

  const chart = (
    <ResponsiveContainer width="100%" height={height}>
      {/* 포커스로 툴팁이 고정되는 것을 막는다 — 근거는 `water-quality-grid.tsx` */}
      <ComposedChart data={data} margin={{ top: 6, right: 10, bottom: 0, left: 0 }} accessibilityLayer={false}>
        <CartesianGrid stroke={GRID_HEX} strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="t"
          tickFormatter={formatClock}
          minTickGap={52}
          tick={showTimeAxis ? { fill: AXIS_TEXT_HEX, fontSize: 11 } : false}
          height={showTimeAxis ? 30 : 4}
          axisLine={{ stroke: GRID_HEX }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: AXIS_TEXT_HEX, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={compact ? 48 : 44}
          /*
           * 항목마다 규모가 달라(TOC 39 · TN 22 · TP 1.9 mg/L) 고정 여유폭을 못 쓴다.
           * 경계를 직접 계산하면 그 값이 그대로 맨 위 눈금이 되어 48.4·36.1처럼 읽히므로,
           * 범위를 Recharts에 맡겨 반올림된 눈금을 받는다(E1 — 자릿수는 tickFormatter가 고정).
           */
          domain={['auto', 'auto']}
          tickCount={compact ? 4 : 5}
          tickFormatter={show}
        />

        <ReferenceLine
          x={nowIso}
          stroke="var(--border-strong)"
          strokeDasharray="3 3"
          label={
            showNowLabel
              ? { value: '현재', position: 'insideTopRight', fill: AXIS_TEXT_HEX, fontSize: 11 }
              : undefined
          }
        />

        {/*
         * 계열 하나뿐이다. `connectNulls={false}`로 결측 구간을 **끊는다** — 이어 그리면
         * 수신하지 못한 시간에도 값이 있었던 것처럼 보인다(E4).
         */}
        <Line
          type="monotone"
          dataKey="value"
          stroke={stroke}
          strokeWidth={2}
          dot={false}
          connectNulls={false}
          isAnimationActive={false}
          activeDot={{ r: 3, strokeWidth: 0, fill: stroke }}
        />

        <Tooltip
          cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const row = payload[0]?.payload as (typeof data)[number] | undefined;
            if (!row) return null;
            return (
              <ChartTooltipShell label={`${formatClock(String(label))} KST`}>
                <ChartTooltipRow
                  color={stroke}
                  name={originLabel}
                  value={row.value === null ? '수신 없음' : `${show(row.value)} ${summary.unit}`}
                />
              </ChartTooltipShell>
            );
          }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );

  if (compact) return chart;

  return (
    <div>
      <ChartFigure
        label={`${summary.targetLabel} 최근 6시간 ${originLabel}, KST 기준`}
        rows={data}
        sampleEvery={6}
        columns={[
          { header: '시각(KST)', cell: (r) => formatClock(r.t) },
          {
            header: `${originLabel}(${summary.unit})`,
            cell: (r) => (r.value === null ? '수신 없음' : show(r.value)),
          },
        ]}
      >
        {chart}
      </ChartFigure>

      <ForecastLegend origin={summary.origin} />
      <ForecastHorizonNote />
      <ForecastLimitNote code={summary.code} limits={limits} />
    </div>
  );
}

/**
 * 기준 초과 **가능성**은 판정하지 않는다.
 *
 * 오염도 3항목(TOC·TN·TP)은 지역구분·배출량 규모별 기준표가 있어야 값이 정해지는데 그 축이
 * 아직 없다 `[공정자료 p.11]`. 기준선을 임의로 그으면 "6시간 뒤 초과"라는 없는 판정을 만든다.
 *
 * **세 상태를 구분한다** — 판정 가능 / 기준표 미확보 / **기준 대상 아님**(유량은 농도 기준의
 * 대상이 아니다). 셋을 뭉뚱그리면 유량 예측에까지 "기준 미확정"이 붙어, 있지도 않은 기준을
 * 기다리는 항목처럼 보인다.
 *
 * 사업장이 기준치를 설정하면 이 문구가 사라진다 `[회의 2026-08-20]`.
 */
export function ForecastLimitNote({
  code,
  limits = DISCHARGE_LIMITS,
}: {
  code: ForecastSeriesCode;
  limits?: DischargeLimitTable;
}) {
  const limit = limits[code];
  if (!limit) return null;
  if (limit.unavailableReason === null) return null;

  return (
    <p className="mt-1.5 px-1 text-[11px] text-fg-subtle">
      {UNRESOLVED_LIMIT_TEXT} — 초과 가능성은 판정하지 않는다
    </p>
  );
}

/**
 * 값이 없을 때 차트 자리에 놓는다. 마지막 산출 시각은 패널 머리말이 이미 적으므로
 * 여기서는 되풀이하지 않는다 — 같은 사실을 두 번 적으면 어느 쪽이 최신인지 헷갈린다.
 */
export function ForecastEmpty({ height }: { height: number }) {
  return (
    <div
      className="flex items-center justify-center border-y border-border text-[12px] text-fg-subtle"
      style={{ height }}
    >
      통신 두절 — 수신·산출 없음
    </div>
  );
}

/**
 * **6시간 예측을 그리지 않는다는 사실을 화면에 적는다.**
 *
 * 원문은 1~6시간 예측을 요구하고(`[원문 p.30·32·65]`) 발표자료가 화면 예시까지 둔다.
 * 없는 것을 조용히 빼면 누락으로 보이므로 왜 없는지를 남긴다 — 있는 것처럼 그리는 것보다
 * 없다고 적는 것이 맞다(E3).
 */
export function ForecastHorizonNote() {
  return (
    <p className="mt-1.5 px-1 text-[11px] leading-relaxed text-fg-subtle">
      향후 6시간 예측은 그리지 않습니다 — 예측 대상 항목과 입력 데이터가 정해지지 않았습니다
      [TBD-52]. TN·TP는 6시간 예측 대상이 아니라 소프트 센싱으로 **지금 값을 추정**하는
      항목입니다 [회의 2026-08-20].
    </p>
  );
}

/** 3단 보기는 이 범례를 스택 전체에 하나만 둔다 — 계열 규약이 세 단에서 같기 때문이다 */
export function ForecastLegend({ origin }: { origin: SeriesOrigin }) {
  return (
    <ul className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1">
      <LegendItem
        color={origin === 'measured' ? ACTUAL_HEX : AI_HEX}
        label={SERIES_ORIGIN_LABELS[origin]}
      />
    </ul>
  );
}

function LegendItem({
  color,
  label,
  dashed,
  swatch,
}: {
  color: string;
  label: string;
  dashed?: boolean;
  swatch?: boolean;
}) {
  return (
    <li className="flex items-center gap-1.5 text-[11px] text-fg-muted">
      {swatch ? (
        <span
          className="inline-block h-2.5 w-3.5 rounded-[2px]"
          style={{ backgroundColor: color, opacity: 0.24 }}
        />
      ) : (
        <span
          className="inline-block h-0.5 w-3.5"
          style={{
            backgroundColor: dashed ? 'transparent' : color,
            backgroundImage: dashed
              ? `repeating-linear-gradient(to right, ${color} 0 4px, transparent 4px 8px)`
              : undefined,
          }}
        />
      )}
      {label}
    </li>
  );
}
