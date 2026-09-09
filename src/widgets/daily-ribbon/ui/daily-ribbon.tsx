'use client';

import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { COLLECTION_INTERVAL_MINUTES, HISTORY_WINDOW_HOURS } from '@/shared/config/measurement';
import {
  PROVISIONAL_ANOMALY_TICKS,
  PROVISIONAL_STATUS_LABELS,
  toStatusLevel,
} from '@/shared/config/provisional';
import {
  AI_HEX,
  AXIS_TEXT_HEX,
  GRID_HEX,
  STATUS_BAND,
  STATUS_VISUAL,
  statusInk,
} from '@/shared/config/status-visual';
import { DISPLAY_TIMEZONE, formatClock } from '@/shared/lib/format';
import { useChartHover } from '@/shared/lib/use-chart-hover';
import { ChartFigure } from '@/shared/ui/chart-figure';
import { ChartTooltipRow, ChartTooltipShell } from '@/shared/ui/chart-tooltip';
import { CountUp } from '@/shared/ui/motion';
import { StatusBadge } from '@/shared/ui/status-badge';
import { VALUE_LG } from '@/shared/ui/type-scale';
import { RibbonLegend } from './ribbon-legend';
import {
  DANGER_ZONE_OPACITY,
  OUTAGE_PATTERN_ID,
  RIBBON_AREA_GRADIENT_ID,
  RIBBON_CHART_HEIGHT,
  RIBBON_SCORE_BUCKET_MINUTES,
  RIBBON_TABLE_ROW_MINUTES,
  RIBBON_THRESHOLD_LINES,
} from '../config/constants';
import { countOnSamples, type RibbonRun } from '../lib/build-ribbon';
import { buildDayView, DANGER_FROM, type DayPoint, type Peak } from '../lib/day-view';
import type { RibbonData } from '../lib/ribbon-rows';

const SAMPLES_PER_HOUR = 60 / COLLECTION_INTERVAL_MINUTES;

/**
 * 하루의 **이상 점수 한 장** — 이 화면의 시그니처.
 *
 * **상태 띠 셋(가동·방류·수신)을 걷고 룩을 새로 세웠다** `[사용자 요청 2026-09-08]`.
 * 앞선 판본은 «네 축이 같은 x를 같은 시각으로 쓴다»가 존재 이유였고, 그래서 격자·오버레이·
 * 좌표 원점을 손으로 짜야 했다(SVG 직접 그리기 + 마우스 좌표 관측). **행이 하나가 되면서 그
 * 제약이 사라져** Recharts로 옮겼다(**P9** 단일 차트 라이브러리) — 딸려 오는 것이 셋이다:
 * `useChartHover`의 툴팁 규율 · `ChartFigure`의 **`표로 보기`**(SVG 선은 스크린리더에 아무것도
 * 주지 못한다 — 앞선 판본에는 이 대체 경로가 **없었다**) · 축·툴팁 어휘의 공유.
 *
 * **읽는 순서를 세로로 세웠다.** 하루를 보는 사람이 묻는 것은 «오늘 최악이 언제, 얼마였나»라
 * 그 답을 **맨 위에 크게** 두고(`ui-ux-pro-max`가 이상 탐지 차트에 권한 *"text annotation per
 * anomaly event"*), 곡선은 그 답이 어디서 왔는지를 보인다.
 *
 * **배경 4구간을 걷고 «넘으면 안 되는 선»만 남겼다.** 96px에 파스텔 넷을 깔면 점수가 20~40에
 * 사는 하루에서도 면적의 대부분이 색인데, 그 색은 데이터가 가 본 적 없는 높이를 칠한다.
 * 지금은 경계를 옅은 파선으로 긋고 **위험 구간만** 아주 옅게 덮는다 — 같은 근거
 * (`PROVISIONAL_ANOMALY_BANDS`)를 다른 형태로 말하는 것이라 *무엇을* 보여주는가는 그대로다.
 */
export function DailyRibbon({ data, dateIso }: { data: RibbonData; dateIso: string }) {
  const { hoverProps, tooltipActive } = useChartHover();
  const view = useMemo(() => buildDayView(data), [data]);

  return (
    <div className="space-y-3">
      <PeakReading peak={view.peak} data={data} dateIso={dateIso} />

      <ChartFigure
        label={summarize(data, dateIso)}
        rows={view.points}
        sampleEvery={RIBBON_TABLE_ROW_MINUTES / RIBBON_SCORE_BUCKET_MINUTES}
        columns={[
          { header: '시각(KST)', cell: (row: DayPoint) => formatClock(row.t) },
          {
            header: '이상 점수',
            /* 없는 값을 0으로 적지 않는다 — 표에서도 결측은 결측이다(**E4**) */
            cell: (row: DayPoint) => (row.score === null ? '수신 없음' : String(row.score)),
          },
        ]}
      >
        <div style={{ height: RIBBON_CHART_HEIGHT }} {...hoverProps}>
          <ResponsiveContainer width="100%" height="100%">
            {/* 포커스로 툴팁이 고정되는 것을 막는다 — 근거는 `chart-figure.tsx` */}
            <AreaChart
              data={view.points}
              margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
              accessibilityLayer={false}
            >
              <defs>
                {/*
                 * 선 아래가 진하게 시작해 바닥에서 사라진다. 평면 채움은 값의 높낮이와
                 * 무관하게 같은 농도라 선이 그 위에 얹힌 띠처럼 보인다.
                 */}
                <linearGradient id={RIBBON_AREA_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={AI_HEX} stopOpacity={0.28} />
                  <stop offset="70%" stopColor={AI_HEX} stopOpacity={0.06} />
                  <stop offset="100%" stopColor={AI_HEX} stopOpacity={0} />
                </linearGradient>

                {/*
                 * **결측은 빗금이다**(`screens.md` §8 `결측`). 면으로 덮으면 «값이 낮았다»로
                 * 읽히고 옅은 회색으로 깔면 배경과 붙는다 — 질감이라 색맹·인쇄에서도 남는다.
                 */}
                <pattern
                  id={OUTAGE_PATTERN_ID}
                  width={6}
                  height={6}
                  patternTransform="rotate(45)"
                  patternUnits="userSpaceOnUse"
                >
                  <line x1={0} y1={0} x2={0} y2={6} stroke="var(--missing)" strokeWidth={2} />
                </pattern>
              </defs>

              {/*
               * **위험 구간만 덮는다.** 넷을 다 깔면 배경이 그림이 되고, 하나만 깔면
               * «저 위로 올라가면 안 된다»가 형태로 남는다.
               */}
              <ReferenceArea
                y1={DANGER_FROM}
                y2={100}
                fill={STATUS_BAND.critical}
                fillOpacity={DANGER_ZONE_OPACITY}
                stroke="none"
              />

              {/* 경계는 선으로만. 숫자와 이름은 왼쪽 눈금과 발치 범례가 함께 적는다 */}
              {RIBBON_THRESHOLD_LINES.map((value) => (
                <ReferenceLine
                  key={value}
                  y={value}
                  stroke={GRID_HEX}
                  strokeDasharray="3 5"
                  strokeWidth={1}
                />
              ))}

              {/* 값이 없다는 사실 자체가 정보다(**E4**) */}
              {view.outages.map((run) => (
                <ReferenceArea
                  key={run.fromIso}
                  x1={run.fromIso}
                  x2={run.toIso}
                  fill={`url(#${OUTAGE_PATTERN_ID})`}
                  fillOpacity={0.5}
                  stroke="none"
                />
              ))}

              {/*
               * **하루가 넘어가는 자리를 짚는다.** 없으면 `02:00`이 어제인지 오늘인지 알 수
               * 없다(**E5**). 눈금에 맡기면 6시간 간격에 걸리기를 기다려야 해서 영영 안 나온다.
               */}
              {view.dayBreakIso && (
                <ReferenceLine
                  x={view.dayBreakIso}
                  stroke="var(--border-strong)"
                  strokeDasharray="2 3"
                  label={{
                    value: view.dayBreakIso.slice(5, 10),
                    position: 'insideTopLeft',
                    fill: AXIS_TEXT_HEX,
                    fontSize: 12,
                  }}
                />
              )}

              <CartesianGrid stroke={GRID_HEX} strokeDasharray="2 4" vertical={false} />
              <XAxis
                dataKey="t"
                tickFormatter={formatClock}
                minTickGap={56}
                tick={{ fill: AXIS_TEXT_HEX, fontSize: 12 }}
                axisLine={{ stroke: GRID_HEX }}
                tickLine={false}
              />
              {/*
               * **경계를 다 적는다**(`interval={0}`). Recharts는 눈금이 가깝다고 판단하면
               * 조용히 빼는데, 그러면 `70`에 파선은 그려지고 라벨만 사라져 **이름 없는 선**이
               * 남는다 — 구간 경계는 이 그림에서 판정의 기준이라 하나라도 빠지면 안 된다.
               */}
              <YAxis
                domain={[0, 100]}
                ticks={PROVISIONAL_ANOMALY_TICKS}
                interval={0}
                tick={{ fill: AXIS_TEXT_HEX, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={34}
              />

              <Tooltip
                /* 포인터가 밖이면 끈다 — 근거는 `shared/lib/use-chart-hover.ts` */
                active={tooltipActive}
                cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const score = payload[0]?.value as number | null | undefined;
                  return (
                    <ChartTooltipShell label={`${formatClock(String(label))} ${DISPLAY_TIMEZONE}`}>
                      {/*
                       * **점수와 등급 둘만 남는다** `[사용자 요청 2026-09-08]` — 가동·방류·수신
                       * 줄을 걷었다. 이상 탐지 타임라인의 툴팁과 같은 구성이라 같은 값을 두
                       * 화면이 다르게 보여 주지 않는다.
                       */}
                      {score === null || score === undefined ? (
                        <ChartTooltipRow color="var(--missing)" name="수신 없음" value="—" />
                      ) : (
                        <>
                          <ChartTooltipRow color={AI_HEX} name="이상 점수" value={String(score)} />
                          <ChartTooltipRow
                            color={STATUS_VISUAL[toStatusLevel(score)].hex}
                            name="등급"
                            value={PROVISIONAL_STATUS_LABELS[toStatusLevel(score)]}
                          />
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
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill={`url(#${RIBBON_AREA_GRADIENT_ID})`}
                /* 결측 구간을 끊는다 — 이어 그으면 못 받은 시간에도 값이 있었던 것처럼 보인다 */
                connectNulls={false}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)', fill: AI_HEX }}
                isAnimationActive={false}
              />

              {/*
               * **최고점을 형태로 짚는다** — `ui-ux-pro-max`가 이상 탐지 차트에 권한
               * *"Use shape marker (not color only) for anomaly points"*. 값과 시각은 위
               * 판독줄이 글로 적으므로 여기서는 «어디»만 말한다(라벨을 곡선에 붙이면
               * 100 근처에서 잘린다). 색은 그 점의 **등급**이라 판독줄의 숫자와 같은 잉크다.
               */}
              {view.peak && (
                <ReferenceDot
                  x={view.peak.x}
                  y={view.peak.score}
                  r={5}
                  fill={statusInk(STATUS_VISUAL[view.peak.level])}
                  stroke="var(--surface)"
                  strokeWidth={2}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartFigure>

      <RibbonLegend />
    </div>
  );
}

/**
 * **오늘의 답을 맨 위에 크게 둔다** `[사용자 요청 2026-09-08]`.
 *
 * 하루를 보는 사람이 묻는 것은 «오늘 최악이 언제, 얼마였나»인데 앞선 판본은 그 답을
 * **대체 텍스트에만** 갖고 있었다(`aria-label`) — 눈으로 보는 사람은 곡선에서 눈짐작으로
 * 찾아야 했다. 점수는 AI 산출값이라 **산출 시각을 함께 적는다**(**E3**).
 *
 * 크기는 `VALUE_LG`(22px)다. 히어로라고 더 키우지 않는다 — 그 단은 *"카드에 값이 하나일 때"*
 * 로 정의돼 있고(`type-scale.ts`), 새 단을 만들면 그 파일이 정리한 «17·18·19·22·26·30·32px이
 * 섞여 있었다»가 다시 시작된다.
 */
function PeakReading({
  peak,
  data,
  dateIso,
}: {
  peak: Peak | null;
  data: RibbonData;
  dateIso: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div>
        <p className="text-[12px] text-fg-subtle">최고 이상 점수</p>
        {peak === null ? (
          /* 하루 내내 결측이면 0이 아니라 «산출 없음»이다 — 없는 사실을 적지 않는다(**E4**) */
          <p className="mt-0.5 text-[13px] text-fg-muted">
            통신이 두절되어 <strong className="text-fg">산출된 점수가 없습니다.</strong>
          </p>
        ) : (
          <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span
              className={`num ${VALUE_LG}`}
              style={{ color: statusInk(STATUS_VISUAL[peak.level]) }}
            >
              <CountUp value={peak.score} />
            </span>
            <StatusBadge level={peak.level} />
            <span className="num text-[12px] text-fg-subtle">
              {formatClock(peak.iso)} {DISPLAY_TIMEZONE}
            </span>
          </div>
        )}
      </div>

      {/* 조회 조건과 하루 요약. 값이 아니라 곁의 사실이라 오른쪽으로 물린다 */}
      <p className="text-[12px] text-fg-subtle">
        {dateIso.slice(0, 10)} · {HISTORY_WINDOW_HOURS}시간 · {COLLECTION_INTERVAL_MINUTES}분 주기
        · 방류 <span className="num text-fg-muted">{dischargeHoursText(data)}</span> · 알람{' '}
        <span className="num text-fg-muted">{data.alarms.length}</span>건
      </p>
    </div>
  );
}

/** 하루 내내 모름이면 '0시간'이 아니라 '모름'이다 — 없는 사실을 적지 않는다(E4) */
function dischargeHoursText(data: RibbonData): string {
  const samples = countOnSamples(data.discharging);
  return samples === null ? '모름' : `${Math.floor(samples / SAMPLES_PER_HOUR)}시간`;
}

/** 점 하나하나가 아니라 이 그림이 말하는 결론을 전한다 */
function summarize(data: RibbonData, dateIso: string): string {
  const scores = data.scores.filter((s): s is number => s !== null);
  const peak = scores.length > 0 ? Math.max(...scores) : null;
  const missing = data.receiving.filter((run: RibbonRun) => run.state !== 'on').length;

  return [
    `일간 이상 점수 ${dateIso.slice(0, 10)}`,
    `${HISTORY_WINDOW_HOURS}시간 · ${COLLECTION_INTERVAL_MINUTES}분 주기 · ${DISPLAY_TIMEZONE}`,
    peak === null
      ? '이상 점수 산출 없음'
      : `최고 ${peak} ${PROVISIONAL_STATUS_LABELS[toStatusLevel(peak)]}`,
    `방류 ${dischargeHoursText(data)}`,
    `알람 ${data.alarms.length}건`,
    missing > 0 ? `결측 ${missing}구간` : '결측 없음',
  ].join(' · ');
}
