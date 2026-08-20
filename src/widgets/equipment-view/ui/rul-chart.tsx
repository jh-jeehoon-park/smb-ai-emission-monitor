'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ACTUAL_HEX, AI_HEX, AXIS_TEXT_HEX, GRID_HEX } from '@/shared/config/status-visual';
import { ChartFigure } from '@/shared/ui/chart-figure';
import { ChartTooltipRow, ChartTooltipShell } from '@/shared/ui/chart-tooltip';
import {
  daysUntilDepleted,
  getRulSeries,
  type Equipment,
  type RulSeriesPoint,
} from '@/entities/equipment';
import { RUL_CHART_HEIGHT, RUL_TABLE_SAMPLE_EVERY } from '../config/constants';

/**
 * 잔여 수명 추이와 0에 닿는 예상 시점.
 *
 * `[원문 발표 p.18 그림]`의 **RUL 예측 그래프**를 따른다 — 세로축 RUL(일), 가로축 경과일,
 * 우하향 곡선. 원문 예시가 함께 찍는 **실제 고장 시점**은 그리지 않는다. 시연 설비는 고장 난
 * 적이 없고, 없는 사건을 표시하면 그 자리가 "여기서 고장났다"로 읽힌다(E3·E4).
 *
 * 지나온 값은 실선, 앞날은 파선이다. 색만 다르면 인쇄·색각 이상에서 구분이 사라진다.
 */
export function RulChart({ siteId, equipment }: { siteId: string; equipment: Equipment }) {
  const data = getRulSeries(siteId, equipment);
  const depleted = daysUntilDepleted(equipment);

  return (
    <ChartFigure
      label={`${equipment.name} 잔여 수명 추이. 오늘 ${equipment.remainingUsefulLifeDays}일, 0 도달 예상 ${depleted}일 후`}
      rows={data}
      columns={RUL_TABLE_COLUMNS}
      sampleEvery={RUL_TABLE_SAMPLE_EVERY}
    >
      <ResponsiveContainer width="100%" height={RUL_CHART_HEIGHT}>
        {/* 포커스로 툴팁이 고정되는 것을 막는다 — 근거는 `water-quality-grid.tsx` */}
        <LineChart data={data} margin={{ top: 6, right: 26, bottom: 0, left: 0 }} accessibilityLayer={false}>
          <CartesianGrid stroke={GRID_HEX} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="day"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={formatDay}
            tick={{ fill: AXIS_TEXT_HEX, fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
          />
          <YAxis
            width={38}
            domain={[0, 'dataMax']}
            tick={{ fill: AXIS_TEXT_HEX, fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            unit="일"
          />

          <ReferenceLine y={0} stroke={AXIS_TEXT_HEX} strokeDasharray="3 3" />
          <ReferenceLine
            x={0}
            stroke={AXIS_TEXT_HEX}
            strokeDasharray="3 3"
            label={{ value: '오늘', position: 'insideTopLeft', fill: AXIS_TEXT_HEX, fontSize: 10 }}
          />
          {/*
           * 어디서 바닥에 닿는지가 이 그래프의 요지인데, 남은 수명이 며칠뿐인 설비는 외삽 구간이
           * 90일 눈금 옆에서 뭉개진다. 축척과 무관하게 지점이 보이도록 짚어 둔다.
           *
           * 숫자는 달지 않는다 — 바로 위 제목줄이 이미 `0 도달 예상 n일 후`를 적고 있고, 축 눈금과
           * 겹쳐 둘 다 못 읽게 된다.
           */}
          <ReferenceDot x={depleted} y={0} r={3} fill={AI_HEX} stroke="none" />

          <Tooltip content={<RulTooltip />} cursor={{ stroke: GRID_HEX }} />

          <Line
            type="monotone"
            dataKey="actual"
            name="지나온 값"
            stroke={ACTUAL_HEX}
            strokeWidth={1.6}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="projected"
            name="추세 외삽"
            stroke={AI_HEX}
            strokeWidth={1.6}
            strokeDasharray="4 3"
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
}

function formatDay(day: number): string {
  if (day === 0) return '오늘';
  return day < 0 ? `${-day}일 전` : `+${day}일`;
}

const RUL_TABLE_COLUMNS = [
  { header: '시점', cell: (row: RulSeriesPoint) => formatDay(row.day) },
  { header: '날짜', cell: (row: RulSeriesPoint) => row.iso },
  {
    header: '잔여 수명',
    cell: (row: RulSeriesPoint) =>
      row.actual !== null ? `${row.actual}일` : `${row.projected}일 (외삽)`,
  },
];

function RulTooltip({ active, payload }: { active?: boolean; payload?: { payload: RulSeriesPoint }[] }) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  return (
    <ChartTooltipShell label={`${formatDay(point.day)} · ${point.iso}`}>
      {point.actual !== null && (
        <ChartTooltipRow name="지나온 값" value={`${point.actual}일`} color={ACTUAL_HEX} />
      )}
      {point.day > 0 && (
        <ChartTooltipRow name="추세 외삽" value={`${point.projected}일`} color={AI_HEX} dashed />
      )}
    </ChartTooltipShell>
  );
}
