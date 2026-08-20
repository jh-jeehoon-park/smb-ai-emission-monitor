'use client';

import {
  Area,
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
import { DISCHARGE_LIMITS } from '@/shared/config/discharge-limits';
import {
  hasPlottableValues,
  type ForecastSeriesCode,
  type ForecastSummary,
} from '@/entities/prediction';
import { COMPACT_HEIGHT, FULL_HEIGHT } from '../config/constants';

interface ForecastChartProps {
  summary: ForecastSummary;
  nowIso: string;
  /**
   * 3단 보기에서 쓰는 낮은 변형.
   *
   * **차트 규약은 그대로다** — 실선/파선 구분, 신뢰구간 밴드, `현재` 경계선, 색·툴팁이
   * 같다. 같은 값을 두 변형이 다르게 보이면 안 된다. 줄이는 것은 높이와 눈금 밀도이고,
   * 표·범례는 스택이 하나만 갖는다(단마다 반복되면 잡음이다).
   */
  compact?: boolean;
  /**
   * 시간축 라벨을 그릴지. 3단 보기에서는 **마지막 단만** 그린다 — 세 단이 같은 축을
   * 쓰는 것이 설계 의도인데 라벨을 세 번 그리면 축이 셋인 것처럼 보인다.
   */
  showTimeAxis?: boolean;
  /** `현재` 경계 라벨. 3단 보기에서는 **첫 단만** 그린다 — 경계선은 세 단에서 같은 시각이다 */
  showNowLabel?: boolean;
}

/**
 * 실측과 예측을 색만으로 구분하지 않는다 — 실선/파선으로도 나뉜다.
 * 신뢰구간은 두 경계선을 채운 밴드로 그린다(Recharts는 Area 두 겹으로 표현).
 */
export function ForecastChart({
  summary,
  nowIso,
  compact = false,
  showTimeAxis = true,
  showNowLabel = true,
}: ForecastChartProps) {
  const data = summary.points.map((p) => ({
    ...p,
    band: p.lower !== null && p.upper !== null ? [p.lower, p.upper] : null,
  }));
  const show = (v: number) => v.toFixed(summary.decimals);
  const height = compact ? COMPACT_HEIGHT : FULL_HEIGHT;

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

        <Area
          dataKey="band"
          stroke="none"
          fill={AI_HEX}
          fillOpacity={0.16}
          connectNulls={false}
          isAnimationActive={false}
          activeDot={false}
        />
        <Line
          type="monotone"
          dataKey="actual"
          stroke={ACTUAL_HEX}
          strokeWidth={2}
          dot={false}
          connectNulls={false}
          isAnimationActive={false}
          activeDot={{ r: 3, strokeWidth: 0, fill: ACTUAL_HEX }}
        />
        <Line
          type="monotone"
          dataKey="forecast"
          stroke={AI_HEX}
          strokeWidth={2}
          strokeDasharray="5 4"
          dot={false}
          connectNulls={false}
          isAnimationActive={false}
          activeDot={{ r: 3, strokeWidth: 0, fill: AI_HEX }}
        />

        <Tooltip
          cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const row = payload[0]?.payload as (typeof data)[number] | undefined;
            if (!row) return null;
            return (
              <ChartTooltipShell label={`${formatClock(String(label))} KST`}>
                {row.actual !== null && (
                  <ChartTooltipRow
                    color={ACTUAL_HEX}
                    name="실측"
                    value={`${show(row.actual)} ${summary.unit}`}
                  />
                )}
                {row.forecast !== null && (
                  <>
                    <ChartTooltipRow
                      color={AI_HEX}
                      name="AI 예측"
                      value={`${show(row.forecast)} ${summary.unit}`}
                      dashed
                    />
                    {row.lower !== null && row.upper !== null && (
                      <ChartTooltipRow
                        color={AI_HEX}
                        name="신뢰구간"
                        value={`${show(row.lower)} – ${show(row.upper)}`}
                      />
                    )}
                  </>
                )}
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
        label={`${summary.targetLabel} 실측과 향후 ${summary.horizonHours}시간 AI 예측(신뢰구간 포함), KST 기준`}
        rows={data}
        sampleEvery={6}
        columns={[
          { header: '시각(KST)', cell: (r) => formatClock(r.t) },
          { header: `실측(${summary.unit})`, cell: (r) => (r.actual === null ? '—' : show(r.actual)) },
          { header: `AI 예측(${summary.unit})`, cell: (r) => (r.forecast === null ? '—' : show(r.forecast)) },
          {
            header: '신뢰구간',
            cell: (r) => (r.lower === null || r.upper === null ? '—' : `${show(r.lower)} – ${show(r.upper)}`),
          },
        ]}
      >
        {chart}
      </ChartFigure>

      <ForecastLegend />
      <ForecastLimitNote code={summary.code} />
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
 * 기준이 확정되면 `discharge-limits.ts`에 값을 넣는 것만으로 이 문구가 사라진다.
 */
export function ForecastLimitNote({ code }: { code: ForecastSeriesCode }) {
  const limit = DISCHARGE_LIMITS[code];
  if (!limit) return null;
  if (limit.unavailableReason === null) return null;

  return (
    <p className="mt-1.5 px-1 text-[11px] text-fg-subtle">
      배출허용기준 미확정 [TBD-45] — 초과 가능성은 판정하지 않는다
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

/** 3단 보기는 이 범례를 스택 전체에 하나만 둔다 — 계열 규약이 세 단에서 같기 때문이다 */
export function ForecastLegend() {
  return (
    <ul className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1">
      <LegendItem color={ACTUAL_HEX} label="실측" />
      <LegendItem color={AI_HEX} label="AI 예측" dashed />
      <LegendItem color={AI_HEX} label="신뢰구간" swatch />
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
