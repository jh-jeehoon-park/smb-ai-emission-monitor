'use client';

import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DischargeLimitTable } from '@/shared/config/discharge-limits';
import { ACTUAL_HEX, AI_HEX, AXIS_TEXT_HEX, GRID_HEX } from '@/shared/config/status-visual';
import { formatClock } from '@/shared/lib/format';
import { useChartHover } from '@/shared/lib/use-chart-hover';
import { ChartFigure } from '@/shared/ui/chart-figure';
import { ChartTooltipRow, ChartTooltipShell } from '@/shared/ui/chart-tooltip';
import {
  LIMIT_BASE_PERCENT,
  SERIES_ORIGIN_LABELS,
  buildOverlayRows,
  hasPlottableValues,
  type ForecastSummary,
  type OverlayRow,
} from '@/entities/prediction';
import { PROVISIONAL_DISPLAY_DECIMALS } from '@/shared/config/provisional';
import { FULL_HEIGHT } from '../config/constants';

/**
 * **항목은 선 질감이 가른다.** 색은 유래(계측/추정)를 맡고 있어 항목에 쓸 수 없다 —
 * `그래프 색` 규칙이 계열을 블루 한 계열로 묶었기 때문이다(`screens.md` §8).
 *
 * 그래서 셋이 겹칠 때 색만으로는 갈리지 않는다. 질감을 뚜렷이 벌린다 — TN·TP가 둘 다
 * `--ai` 색이라 파선과 점선의 간격이 비슷하면 같은 선으로 보인다.
 */
const DASH: Record<string, string | undefined> = {
  TOC: undefined,
  TN: '7 4',
  TP: '2 3',
  inflow: undefined,
  flow: '7 4',
};

interface ForecastOverlayProps {
  summaries: ForecastSummary[];
  nowIso: string;
  /** 주면 **기준 대비 %**로 그린다. 없으면 원값 그대로(수량이 그렇다) */
  limits?: DischargeLimitTable;
  unit: string;
  /** 그림 대체 텍스트에 쓰는 이름 */
  label: string;
}

/**
 * 여러 계열을 **한 축에 겹친다.**
 *
 * 예전에는 3단으로 쌓았다. 기각 사유가 *"TOC 25.5 · TN 16 · TP 1.5로 17배 차이라 겹치면
 * TP가 바닥에 눕는다"* 였는데, **기준 대비로 정규화하면 셋 다 100 언저리로 모인다** —
 * 회의가 TN·TP의 농도를 감추라 한 제약이 겹침을 가능하게 만들었다.
 *
 * 겹쳐서 얻는 것: 같은 시각의 세 항목이 세로로 정렬되고, **어느 항목이 기준에 가장
 * 가까운가**가 한눈에 보인다 — 이 화면이 묻는 것이 그것이다. 3단에서는 축이 각자라
 * 그 비교가 성립하지 않았다.
 */
export function ForecastOverlay({
  summaries,
  nowIso,
  limits,
  unit,
  label,
}: ForecastOverlayProps) {
  const { hoverProps, tooltipActive } = useChartHover();
  const rows = buildOverlayRows(summaries, limits);
  const drawable = summaries.filter((s) => hasPlottableValues(s));

  /*
   * 그릴 계열이 하나도 없으면 차트를 그리지 않는다. 눈금도 선도 없는 빈 격자는
   * "값이 0에 가깝다"로 오독된다 — 왜 비었는지는 부르는 쪽이 글로 적는다(R19·E4).
   */
  if (rows.length === 0 || drawable.length === 0) return null;

  const lastIso = rows[rows.length - 1]!.t;

  return (
    <ChartFigure
      label={`${label} 겹침 차트 — ${drawable.map((s) => s.code).join(' · ')}, 시각 축 공유, KST 기준`}
      sampleEvery={6}
      rows={rows}
      columns={[
        { header: '시각(KST)', cell: (row: OverlayRow) => formatClock(row.t) },
        ...drawable.map((s) => ({
          header: `${s.code}(${limits ? '%' : unit})`,
          cell: (row: OverlayRow) => {
            const value = row[s.code];
            /* 없는 값을 0으로 적지 않는다 — 표에서도 결측은 결측이다(E4) */
            return typeof value === 'number'
              ? value.toFixed(PROVISIONAL_DISPLAY_DECIMALS.limitPercent)
              : '수신 없음';
          },
        })),
      ]}
    >
      <div style={{ height: FULL_HEIGHT }} {...hoverProps}>
        <ResponsiveContainer width="100%" height="100%">
          {/*
            * `accessibilityLayer={false}`는 **버그 회피이지 접근성 포기가 아니다** — 이 층이
            * 켜져 있으면 차트 표면이 포커스를 가로채 키보드 이동이 갇힌다. 대체 경로는
            * `ChartFigure`의 `표로 보기` 탭이 갖는다.
            */}
          <ComposedChart
            data={rows}
            margin={{ top: 8, right: 12, bottom: 0, left: -8 }}
            accessibilityLayer={false}
          >
            <CartesianGrid stroke={GRID_HEX} strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="t"
              tickFormatter={formatClock}
              tick={{ fill: AXIS_TEXT_HEX, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              minTickGap={52}
            />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fill: AXIS_TEXT_HEX, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(v: number) => (limits ? `${Math.round(v)}%` : String(Math.round(v)))}
            />

            {/*
             * **미래 구간은 자리만 둔다** `[사용자 결정 2026-08-25]`. 6시간 예측의 대상이
             * 정해진 것이 전혀 없어(`[TBD-52]`) 곡선을 그리지 않는다 — 없는 데이터로 선을
             * 그으면 산출된 예측처럼 읽힌다(E3). 축 형태는 `[원문 발표 p.16 그림]`을 따른다.
             *
             * 음영이 **결측 표현과 달라야 한다**(E4) — 결측은 선이 끊기는 것이고 이쪽은
             * 면이 깔린 것이라 형태가 다르다.
             */}
            <ReferenceArea
              x1={nowIso}
              x2={lastIso}
              fill={AXIS_TEXT_HEX}
              fillOpacity={0.06}
              ifOverflow="extendDomain"
              label={{ value: '예측 미정', position: 'insideTop', fontSize: 11, fill: AXIS_TEXT_HEX }}
            />

            <ReferenceLine
              x={nowIso}
              stroke="var(--border-strong)"
              strokeDasharray="3 3"
              label={{ value: '현재', position: 'insideTopLeft', fontSize: 11, fill: AXIS_TEXT_HEX }}
            />

            {/* 기준선은 비율로 그릴 때만 뜻이 있다 — 원값 축에서는 항목마다 자리가 다르다 */}
            {limits && (
              <ReferenceLine
                y={LIMIT_BASE_PERCENT}
                stroke="var(--border-strong)"
                label={{ value: '기준', position: 'right', fontSize: 11, fill: AXIS_TEXT_HEX }}
              />
            )}

            {drawable.map((s) => (
              <Line
                key={s.code}
                dataKey={s.code}
                type="monotone"
                stroke={s.origin === 'measured' ? ACTUAL_HEX : AI_HEX}
                strokeDasharray={DASH[s.code]}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={false}
                /* 결측 구간을 끊는다 — 이어 그리면 수신하지 못한 시간에도 값이 있었던 것처럼 보인다(E4) */
                connectNulls={false}
                isAnimationActive={false}
                activeDot={{ r: 3 }}
              />
            ))}

            <Tooltip
              active={tooltipActive}
              cursor={{ stroke: GRID_HEX }}
              content={({ label: at, payload }) => (
                <ChartTooltipShell label={`${formatClock(String(at))} KST`}>
                  {(payload ?? []).map((row) => {
                    const summary = drawable.find((s) => s.code === row.dataKey);
                    const value = typeof row.value === 'number' ? row.value : null;
                    return (
                      <ChartTooltipRow
                        key={String(row.dataKey)}
                        color={summary?.origin === 'measured' ? ACTUAL_HEX : AI_HEX}
                        dashed={DASH[String(row.dataKey)] !== undefined}
                        name={`${row.dataKey} · ${summary ? SERIES_ORIGIN_LABELS[summary.origin] : ''}`}
                        value={
                          value === null
                            ? '수신 없음'
                            : `${value.toFixed(PROVISIONAL_DISPLAY_DECIMALS.limitPercent)}${
                                limits ? '%' : ` ${unit}`
                              }`
                        }
                      />
                    );
                  })}
                </ChartTooltipShell>
              )}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartFigure>
  );
}
