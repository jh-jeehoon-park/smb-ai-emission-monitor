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
  OUTAGE_BAND,
  STATUS_BAND,
  STATUS_VISUAL,
} from '@/shared/config/status-visual';
import { formatClock } from '@/shared/lib/format';
import { ChartFigure } from '@/shared/ui/chart-figure';
import { ChartTooltipRow, ChartTooltipShell } from '@/shared/ui/chart-tooltip';
import type { AnomalyPoint } from '@/entities/anomaly';
import { useChartHover } from '@/shared/lib/use-chart-hover';

interface AnomalyTimelineProps {
  data: AnomalyPoint[];
  outage: { fromIso: string; toIso: string } | null;
}

/**
 * 단일 계열이라 범례를 두지 않는다(제목이 계열을 이름 짓는다).
 * 등급은 선 색이 아니라 배경 밴드가 전달한다 — 선 색은 'AI가 산출한 값'을 뜻하는 보라로 고정된다.
 */
export function AnomalyTimeline({ data, outage }: AnomalyTimelineProps) {
  const { hoverProps, tooltipActive } = useChartHover();

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
    <div className="h-[190px] w-full" {...hoverProps}>
      <ResponsiveContainer width="100%" height="100%">
      {/* 포커스로 툴팁이 고정되는 것을 막는다 — 근거는 `water-quality-grid.tsx` */}
      <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} accessibilityLayer={false}>
        {/*
         * **면을 그라데이션으로 깐다** `[사용자 지시 2026-08-25: 첨부 이미지]` — 선 아래가
         * 진하게 시작해 바닥에서 사라진다. 평면 밴드는 값의 높낮이와 무관하게 같은 농도라
         * 선이 그 위에 얹힌 띠처럼 보였다.
         */}
        <defs>
          <linearGradient id="anomaly-area" x1="0" y1="0" x2="0" y2="1">
            {/*
             * 다른 차트(24~26%)보다 한 단 진하다 — 이 차트만 **뒤에 4구간 밴드가 깔려 있어**
             * 같은 농도로는 면이 밴드에 묻힌다 `[사용자 지시 2026-08-25]`.
             */}
            <stop offset="0%" stopColor={AI_HEX} stopOpacity={0.34} />
            <stop offset="60%" stopColor={AI_HEX} stopOpacity={0.1} />
            <stop offset="100%" stopColor={AI_HEX} stopOpacity={0} />
          </linearGradient>
        </defs>
        {PROVISIONAL_ANOMALY_BANDS.map((band) => (
          <ReferenceArea
            key={band.level}
            y1={band.min}
            y2={band.max + 1}
            fill={STATUS_BAND[band.level]}
            stroke="none"
            /*
             * 밴드는 **배경**이다 `[사용자 지시 2026-08-25]` — 구간 경계를 읽히게만 하고
             * 선·면보다 앞에 서면 안 된다. 토큰(13~20%)을 그대로 쓰면 이 차트에서만 배경이
             * 진해 선이 잠겼다. 토큰을 바꾸지 않고 여기서만 낮추는 이유: 같은 밴드를 쓰는
             * 게이지·리본은 배경 위 단독이라 지금 농도가 맞다.
             */
            fillOpacity={0.55}
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
          /* 포인터가 밖이면 끈다 — 근거는 `shared/lib/use-chart-hover.ts` */
          active={tooltipActive}
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
          strokeLinecap="round"
          strokeLinejoin="round"
          dataKey="score"
          stroke={AI_HEX}
          strokeWidth={2.5}
          fill="url(#anomaly-area)"
          connectNulls={false}
          dot={false}
          /* 짚은 점은 흰 테를 둘러 면 위에 떠 보인다 — 래퍼런스의 끝점과 같은 표기다 */
          activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)', fill: AI_HEX }}
          isAnimationActive={false}
        />
      </AreaChart>
      </ResponsiveContainer>
    </div>
    </ChartFigure>
  );
}
