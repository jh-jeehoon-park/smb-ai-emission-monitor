'use client';

import { Area, AreaChart, ReferenceArea, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import { DISCHARGE_LIMITS } from '@/shared/config/discharge-limits';
import { MEASUREMENT_ITEMS } from '@/shared/config/measurement';
import { ACTUAL_HEX, GRID_HEX, MISSING_HEX, STATUS_BAND } from '@/shared/config/status-visual';
import { formatClock, formatValue } from '@/shared/lib/format';
import { ChartFigure } from '@/shared/ui/chart-figure';
import { ChartTooltipRow, ChartTooltipShell } from '@/shared/ui/chart-tooltip';
import { RiseItem, StaggerGroup } from '@/shared/ui/motion';
import { countOverLimit, type MeasurementPoint, type SeriesCode } from '@/entities/measurement';
import { limitZone, type LimitZone } from '../lib/limit-zone';

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
  const zone = limitZone(code, values);
  const overCount = countOverLimit(data, code);

  return (
    <div className="group bg-surface p-3 transition-colors duration-200 hover:bg-surface-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-medium tracking-[0.08em] text-fg-subtle">
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

      {/* 기준을 아는 항목인지, 안다면 넘었는지 — 두 사실을 구분해 적는다 */}
      <LimitNote code={code} zone={zone} overCount={overCount} decimals={item.decimals} />

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
              <YAxis hide domain={zone ? zone.domain : ['dataMin', 'dataMax']} />

              {/*
               * 기준을 벗어난 영역을 칠한다 — 선이 그 안에 들어가면 초과다.
               * 허용 범위를 칠하지 않는 이유: 값이 대개 그 안이라 화면 전체가 색이 된다.
               */}
              {zone && (
                <>
                  <ReferenceArea
                    y1={zone.domain[0]}
                    y2={zone.min}
                    fill={STATUS_BAND.critical}
                    stroke="none"
                  />
                  <ReferenceArea
                    y1={zone.max}
                    y2={zone.domain[1]}
                    fill={STATUS_BAND.critical}
                    stroke="none"
                  />
                </>
              )}
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

/**
 * `null`은 "초과가 없다"가 아니라 "판정할 기준표가 없다"는 뜻이다 — 두 문장을 다르게 적는다.
 * 기준값이 있는 항목도 `통상` 범위라 확정 기준처럼 보이지 않게 출처를 함께 남긴다
 * (`[공정자료 p.11]`: 정확한 적용 구간은 사업장 허가증에서 확인).
 */
function LimitNote({
  code,
  zone,
  overCount,
  decimals,
}: {
  code: SeriesCode;
  zone: LimitZone | null;
  overCount: number | null;
  decimals: number;
}) {
  const limit = DISCHARGE_LIMITS[code];
  if (!limit) return null;

  if (!zone || overCount === null) {
    return <p className="mt-1 truncate text-[11px] text-fg-subtle">기준값 미확정 [TBD-45]</p>;
  }

  return (
    <p className="mt-1 truncate text-[11px] text-fg-subtle" title={limit.source}>
      <span className="num">
        기준 {zone.min.toFixed(decimals)}–{zone.max.toFixed(decimals)}
      </span>{' '}
      · {overCount === 0 ? '초과 없음' : `초과 ${overCount}건`}
    </p>
  );
}
