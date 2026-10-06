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
import { AXIS_TEXT_HEX, GRID_HEX } from '@/shared/config/status-visual';
import { formatClock } from '@/shared/lib/format';
import { useChartHover } from '@/shared/lib/use-chart-hover';
import { ChartFigure } from '@/shared/ui/chart-figure';
import { ChartTooltipRow, ChartTooltipShell } from '@/shared/ui/chart-tooltip';
import { LegendItem } from './forecast-chart';
import {
  LIMIT_BASE_PERCENT,
  ORIGIN_DASH,
  SERIES_INK,
  SERIES_ORIGIN_LABELS,
  buildOverlayRows,
  type ForecastSeriesCode,
  type ForecastSummary,
  type OverlayRow,
} from '@/entities/prediction';
import { PROVISIONAL_DISPLAY_DECIMALS } from '@/shared/config/provisional';
import { FULL_HEIGHT, FUTURE_HOURS } from '../config/constants';

/**
 * **색이 항목을, 실선·파선이 출처를 맡는다** `[사용자 요청 2026-09-07]`.
 *
 * 앞선 판본은 그 둘이 뒤바뀌어 있었다 — 색이 출처(계측/AI)라 **TN과 TP가 같은 색**이었고,
 * 항목은 질감으로만 갈렸다. 2px 선에서 `7 4`와 `2 3`은 거의 같아 보여 셋이 한 선처럼 읽혔다.
 * 유입·유출은 둘 다 계측이라 색도 질감도 갈릴 것이 없었다.
 *
 * 바꿔 끼운 것이지 어느 하나를 버린 것이 아니다 — 출처는 질감과 범례·툴팁 글자가 함께
 * 말한다(**E3**). 값과 검증 결과는 `SERIES_INK`·`ORIGIN_DASH`가 갖는다.
 */
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
  const rows = buildOverlayRows(summaries, limits, FUTURE_HOURS);
  /*
   * **변환한 뒤로 판단한다.** `hasPlottableValues`는 원값을 보므로, 기준이 없어 비율이
   * 전부 `null`이 된 계열도 참을 돌려준다 — 그러면 선은 안 보이는데 범례와 표에는
   * 남아 `수신 없음`이라 적힌다. 실제 사유는 `기준 미설정`이라 화면이 거짓을 말한다.
   */
  const drawable = summaries.filter((s) =>
    rows.some((row) => row[s.code] !== null && row[s.code] !== undefined),
  );
  /*
   * **표는 관측 구간만 싣는다.** 차트는 축을 늘리려고 빈 줄을 쓰지만, 표에 그것이 들어가면
   * 열두 줄이 `수신 없음`으로 나온다 — 그 말은 통신 두절을 뜻해서 거짓이 된다(E4).
   * 미래 구간이 있다는 사실은 `ForecastHorizonNote`가 글로 적는다.
   */
  const observed = rows.filter((row) => row.t <= nowIso);

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
      rows={observed}
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
              /* 빈 줄로 늘린 구간이다 — 값이 없어 계열은 여기서 끊긴다 */
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
                stroke={SERIES_INK[s.code]}
                strokeDasharray={ORIGIN_DASH[s.origin]}
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
                        color={SERIES_INK[String(row.dataKey) as ForecastSeriesCode]}
                        dashed={summary !== undefined && ORIGIN_DASH[summary.origin] !== undefined}
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

      <OverlayLegend drawable={drawable} />
    </ChartFigure>
  );
}

/**
 * 겹침 차트의 범례. **세 채널을 다 설명한다** — 색(유래) · 선 질감(항목) · 음영(예측 미정).
 *
 * `ForecastLegend`를 쓰지 않는 이유는 그쪽이 **유래 하나**만 받기 때문이다. 겹침에서는
 * 계측과 추정이 한 차트에 있어서 한 줄만 그리면 나머지 색이 화면 어디에도 설명되지 않는다.
 *
 * 항목 이름을 질감 옆에 적는다 — 질감만으로는 어느 선이 TN인지 알 수 없고, 계열 끝에
 * 라벨을 붙이면 선이 겹치는 구간에서 글자끼리 포개진다.
 */
function OverlayLegend({ drawable }: { drawable: ForecastSummary[] }) {
  return (
    <ul className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1">
      {drawable.map((s) => (
        <LegendItem
          key={s.code}
          color={SERIES_INK[s.code]}
          dashed={ORIGIN_DASH[s.origin] !== undefined}
          label={`${s.code} · ${SERIES_ORIGIN_LABELS[s.origin]}`}
        />
      ))}
      <LegendItem swatch color={AXIS_TEXT_HEX} label="예측 미정" />
    </ul>
  );
}
