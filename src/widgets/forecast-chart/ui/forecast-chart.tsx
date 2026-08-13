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
import type { ForecastSummary } from '@/entities/prediction';

interface ForecastChartProps {
  summary: ForecastSummary;
  nowIso: string;
}

/**
 * 실측과 예측을 색만으로 구분하지 않는다 — 실선/파선으로도 나뉜다.
 * 신뢰구간은 두 경계선을 채운 밴드로 그린다(Recharts는 Area 두 겹으로 표현).
 */
export function ForecastChart({ summary, nowIso }: ForecastChartProps) {
  const data = summary.points.map((p) => ({
    ...p,
    band: p.lower !== null && p.upper !== null ? [p.lower, p.upper] : null,
  }));
  const show = (v: number) => v.toFixed(summary.decimals);

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
      <ResponsiveContainer width="100%" height={210}>
        <ComposedChart data={data} margin={{ top: 6, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID_HEX} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="t"
            tickFormatter={formatClock}
            minTickGap={52}
            tick={{ fill: AXIS_TEXT_HEX, fontSize: 11 }}
            axisLine={{ stroke: GRID_HEX }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: AXIS_TEXT_HEX, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={44}
            domain={['dataMin - 4', 'dataMax + 4']}
          />

          <ReferenceLine
            x={nowIso}
            stroke="var(--border-strong)"
            strokeDasharray="3 3"
            label={{
              value: '현재',
              position: 'insideTopRight',
              fill: AXIS_TEXT_HEX,
              fontSize: 11,
            }}
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
      </ChartFigure>

      <ul className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1">
        <LegendItem color={ACTUAL_HEX} label="실측" />
        <LegendItem color={AI_HEX} label="AI 예측" dashed />
        <LegendItem color={AI_HEX} label="신뢰구간" swatch />
      </ul>
    </div>
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
