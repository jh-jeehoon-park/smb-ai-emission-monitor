'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  PROVISIONAL_ANOMALY_BANDS,
  PROVISIONAL_ANOMALY_TICKS,
  PROVISIONAL_STATUS_LABELS,
} from '@/shared/config/provisional';
import {
  AI_HEX,
  AXIS_TEXT_HEX,
  GRID_HEX,
  AI_BAND,
  OUTAGE_BAND,
  STATUS_BAND,
  STATUS_VISUAL,
} from '@/shared/config/status-visual';
import { formatClock } from '@/shared/lib/format';
import { ChartFigure } from '@/shared/ui/chart-figure';
import { ChartTooltipRow, ChartTooltipShell } from '@/shared/ui/chart-tooltip';
import type { AnomalyPoint } from '@/entities/anomaly';

interface AnomalyTimelineProps {
  data: AnomalyPoint[];
  outage: { fromIso: string; toIso: string } | null;
}

/**
 * 단일 계열이라 범례를 두지 않는다(제목이 계열을 이름 짓는다).
 * 등급은 선 색이 아니라 배경 밴드가 전달한다 — 선 색은 'AI가 산출한 값'을 뜻하는 보라로 고정된다.
 */
export function AnomalyTimeline({ data, outage }: AnomalyTimelineProps) {
  return (
    <ChartFigure
      label="이상 점수 타임라인 — 최근 24시간, 5분 주기, KST 기준"
      rows={data}
      sampleEvery={12}
      columns={[
        { header: '시각(KST)', cell: (r) => formatClock(r.t) },
        { header: '이상 점수', cell: (r) => (r.score === null ? '수신 없음' : String(r.score)) },
      ]}
    >
    <ResponsiveContainer width="100%" height={190}>
      {/* 포커스로 툴팁이 고정되는 것을 막는다 — 근거는 `water-quality-grid.tsx` */}
      <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} accessibilityLayer={false}>
        {PROVISIONAL_ANOMALY_BANDS.map((band) => (
          <ReferenceArea
            key={band.level}
            y1={band.min}
            y2={band.max + 1}
            fill={STATUS_BAND[band.level]}
            stroke="none"
          />
        ))}

        {/* 통신 두절 구간을 눈에 보이게 남긴다. 값이 없다는 사실 자체가 정보다(E4). */}
        {outage && (
          <ReferenceArea x1={outage.fromIso} x2={outage.toIso} fill={OUTAGE_BAND} stroke="none" />
        )}

        <CartesianGrid stroke={GRID_HEX} strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="t"
          tickFormatter={formatClock}
          minTickGap={56}
          tick={{ fill: AXIS_TEXT_HEX, fontSize: 11 }}
          axisLine={{ stroke: GRID_HEX }}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          ticks={PROVISIONAL_ANOMALY_TICKS}
          tick={{ fill: AXIS_TEXT_HEX, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const score = payload[0]?.value as number | null;
            const band = PROVISIONAL_ANOMALY_BANDS.find(
              (b) => score !== null && score !== undefined && score >= b.min && score <= b.max,
            );
            return (
              <ChartTooltipShell label={`${formatClock(String(label))} KST`}>
                {score === null || score === undefined ? (
                  <ChartTooltipRow color="var(--missing)" name="수신 없음" value="—" />
                ) : (
                  <>
                    <ChartTooltipRow color={AI_HEX} name="이상 점수" value={String(score)} />
                    {band && (
                      <ChartTooltipRow
                        color={STATUS_VISUAL[band.level].hex}
                        name="등급"
                        value={PROVISIONAL_STATUS_LABELS[band.level]}
                      />
                    )}
                  </>
                )}
              </ChartTooltipShell>
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="score"
          stroke={AI_HEX}
          strokeWidth={2}
          fill={AI_BAND}
          connectNulls={false}
          dot={false}
          activeDot={{ r: 3, strokeWidth: 0, fill: AI_HEX }}
          isAnimationActive={false}
        />
      </AreaChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
}
