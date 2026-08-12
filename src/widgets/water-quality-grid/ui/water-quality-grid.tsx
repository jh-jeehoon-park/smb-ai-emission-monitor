'use client';

import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import { MEASUREMENT_ITEMS } from '@/shared/config/measurement';
import { ACTUAL_HEX, GRID_HEX, MISSING_HEX } from '@/shared/config/status-visual';
import { formatClock, formatValue } from '@/shared/lib/format';
import { ChartFigure } from '@/shared/ui/chart-figure';
import { ChartTooltipRow, ChartTooltipShell } from '@/shared/ui/chart-tooltip';
import { RiseItem, StaggerGroup } from '@/shared/ui/motion';
import type { MeasurementPoint, SeriesCode } from '@/entities/measurement';

interface WaterQualityGridProps {
  data: MeasurementPoint[];
  codes: SeriesCode[];
}

/**
 * 단위가 다른 항목을 한 축에 겹치지 않는다 — pH 0~14와 EC 0~20,000을 같은 y축에 두면
 * 둘 다 읽을 수 없게 된다. 항목마다 자기 축을 가진 작은 차트로 나눈다(small multiples).
 */
export function WaterQualityGrid({ data, codes }: WaterQualityGridProps) {
  /**
   * 열 수는 뷰포트가 아니라 **이 그리드가 실제로 받은 폭**을 따라야 한다.
   * 같은 위젯이 통합 관제(지도 옆 좁은 열)와 시계열 화면(전폭)에 함께 쓰인다 —
   * 뷰포트로 나누면 한쪽이 반드시 어긋나고, 단위 표기가 값에 가려진다.
   */
  return (
    <div className="@container">
      <StaggerGroup className="grid grid-cols-2 gap-px bg-border @[560px]:grid-cols-4">
        {codes.map((code) => (
          <RiseItem key={code}>
            <MiniSeries code={code} data={data} />
          </RiseItem>
        ))}
      </StaggerGroup>
    </div>
  );
}

function MiniSeries({ code, data }: { code: SeriesCode; data: MeasurementPoint[] }) {
  const item = MEASUREMENT_ITEMS[code];
  const values = data.map((p) => p[code]);
  const latest = [...values].reverse().find((v) => v !== null) ?? null;
  const isMissingNow = values[values.length - 1] === null;

  return (
    <div className="group bg-surface p-3 transition-colors duration-200 hover:bg-surface-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-display text-[11px] tracking-[0.08em] text-fg-subtle">
          {item.symbol}
        </span>
        {isMissingNow && (
          <span className="rounded-[3px] bg-missing/20 px-1 py-px text-[11px] text-fg-subtle">
            수신 없음
          </span>
        )}
      </div>

      <div className="mt-1 flex items-baseline gap-1">
        <span className="num text-[19px] font-medium leading-none text-fg">
          {formatValue(code, latest)}
        </span>
        {item.unit && <span className="text-[11px] text-fg-subtle">{item.unit}</span>}
      </div>

      <p className="mt-0.5 truncate text-[11px] text-fg-muted">{item.label}</p>

      {/* 작은 차트는 현재값이 이미 위에 텍스트로 있다. 항목마다 표를 또 두면 소음이다 */}
      <ChartFigure
        label={`${item.label}(${item.symbol}) 최근 24시간 추이${
          item.unit ? `, 단위 ${item.unit}` : ''
        }, KST 기준. 현재값 ${formatValue(code, latest)}`}
      >
        <div className="-mx-1 mt-2 h-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
              <defs>
                <linearGradient id={`fill-${code}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACTUAL_HEX} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={ACTUAL_HEX} stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis hide domain={['dataMin', 'dataMax']} />
              <Tooltip
                cursor={{ stroke: GRID_HEX, strokeWidth: 1 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0]?.payload as MeasurementPoint | undefined;
                  if (!row) return null;
                  const v = row[code];
                  return (
                    <ChartTooltipShell label={`${formatClock(row.t)} KST`}>
                      <ChartTooltipRow
                        color={v === null ? MISSING_HEX : ACTUAL_HEX}
                        name={item.label}
                        value={
                          v === null ? '수신 없음' : `${formatValue(code, v)} ${item.unit}`.trim()
                        }
                      />
                    </ChartTooltipShell>
                  );
                }}
              />
              {/* 결측은 이어 그리지 않는다 — 끊긴 자리가 통신 두절을 말해 준다(E4) */}
              <Area
                type="monotone"
                dataKey={code}
                stroke={ACTUAL_HEX}
                strokeWidth={1.4}
                fill={`url(#fill-${code})`}
                connectNulls={false}
                dot={false}
                activeDot={{ r: 2.5, strokeWidth: 0, fill: ACTUAL_HEX }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartFigure>
    </div>
  );
}
