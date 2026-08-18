'use client';

import { useMemo, useState } from 'react';
import { COLLECTION_INTERVAL_MINUTES, HISTORY_WINDOW_HOURS } from '@/shared/config/measurement';
import {
  PROVISIONAL_ANOMALY_BANDS,
  PROVISIONAL_STATUS_LABELS,
  toStatusLevel,
} from '@/shared/config/provisional';
import {
  AI_HEX,
  GRID_HEX,
  OUTAGE_BAND,
  STATUS_BAND,
  STATUS_VISUAL,
} from '@/shared/config/status-visual';
import { cn } from '@/shared/lib/cn';
import { DISPLAY_TIMEZONE, formatClock } from '@/shared/lib/format';
import { TIMELINE_POINT_COUNT, timelineIsoAt } from '@/shared/lib/timeline';
import { AnomalyBandLegend } from '@/shared/ui/anomaly-band-legend';
import { ChartTooltipRow, ChartTooltipShell } from '@/shared/ui/chart-tooltip';
import {
  RIBBON_FILL,
  RIBBON_GRID_ROWS,
  RIBBON_LABEL_WIDTH,
  RIBBON_OVERLAY_ROW,
  RIBBON_ROW_GAP,
  RIBBON_LEGEND,
  RIBBON_OFF_LABELS,
  RIBBON_SCORE_HEIGHT,
  RIBBON_SCORE_TICKS,
  RIBBON_STRIP_HEIGHT,
  RIBBON_TICK_HOURS,
  RIBBON_TOOLTIP_EDGE_PERCENT,
} from '../config/constants';
import { countOnSamples, type RibbonRun, type RibbonState } from '../lib/build-ribbon';
import type { RibbonData } from '../lib/ribbon-rows';
import { toScorePath } from '../lib/score-path';
import { buildTicks } from '../lib/ticks';

const SAMPLES_PER_HOUR = 60 / COLLECTION_INTERVAL_MINUTES;

const STRIPS = [
  { key: 'running', label: '가동' },
  { key: 'discharging', label: '방류' },
  { key: 'receiving', label: '수신' },
] as const;

/** 이상 점수 다음이 구분선, 그 아래 상태 띠, 마지막이 눈금 줄 */
const SEPARATOR_ROW = 2;
const TICKS_ROW = SEPARATOR_ROW + STRIPS.length + 1;

/**
 * 하루를 한 장으로 본다.
 *
 * 운영자의 지도가 *공간*을 한눈에 보여준다면 이 리본은 *하루*를 한눈에 보여준다.
 * 네 축이 **같은 x를 같은 시각으로** 쓰는 것이 전부다 — 세로로 훑으면 "그때 무슨
 * 일이 동시에 있었나"가 읽힌다.
 *
 * **좌표 기준을 트랙 열 하나로 못박는다.** 예전에는 라벨 칸과 트랙이 한 flex 행에 있어
 * 마우스를 재는 박스(라벨 포함)와 막대가 그려지는 박스(라벨 제외)가 달랐다 —
 * 커서 판독이 2.4시간 어긋났다. 이제 오버레이가 트랙 열만 덮고, **그 오버레이가
 * 마우스 대상이자 격자·커서의 좌표 원점**이라 어긋날 자리가 없다.
 */
export function DailyRibbon({ data, dateIso }: { data: RibbonData; dateIso: string }) {
  const [cursor, setCursor] = useState<number | null>(null);
  const ticks = useMemo(() => buildTicks(RIBBON_TICK_HOURS), []);

  const trackCursor = (event: React.MouseEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - box.left) / box.width;
    const index = Math.floor(ratio * TIMELINE_POINT_COUNT);
    setCursor(Math.min(Math.max(index, 0), TIMELINE_POINT_COUNT - 1));
  };

  return (
    <div className="space-y-2">
      <Caption data={data} dateIso={dateIso} />

      <div
        className="grid gap-x-3"
        style={{
          gridTemplateColumns: `${RIBBON_LABEL_WIDTH}px minmax(0, 1fr)`,
          gridTemplateRows: RIBBON_GRID_ROWS,
          rowGap: RIBBON_ROW_GAP,
        }}
        role="img"
        aria-label={summarize(data, dateIso)}
      >
        {/**
         * **모든 칸을 명시적으로 배치한다.** 아래 오버레이가 트랙 열 6행을 확정 배치로
         * 점유하는데, 자동 배치는 점유된 칸을 건너뛴다 — 라벨만 자동으로 두면 트랙이
         * 64px 라벨 칸으로 밀려 들어간다(실제로 그렇게 깨졌다).
         */}
        <ScoreLabel row={1} />
        <Track row={1}>
          <ScoreTrack scores={data.scores} receiving={data.receiving} />
        </Track>

        {/* 분석값과 상태 띠를 가른다 — 위계가 선으로도 드러나야 한다 */}
        <span
          className="my-1.5 border-t border-border"
          style={{ gridRow: SEPARATOR_ROW, gridColumn: '1 / -1' }}
        />

        {STRIPS.map((strip, i) => (
          <Fragment key={strip.key}>
            <Label text={strip.label} row={SEPARATOR_ROW + 1 + i} />
            <Track row={SEPARATOR_ROW + 1 + i}>
              <StatusStrip runs={data[strip.key]} />
            </Track>
          </Fragment>
        ))}

        <Track row={TICKS_ROW}>
          <TickLabels ticks={ticks} />
        </Track>

        {/**
         * 트랙 열 전체를 덮는다 — 여기가 마우스 대상이자 격자·커서의 **유일한 좌표 기준**이다.
         * 마지막에 두어 트랙 위에 그려지게 한다.
         */}
        <div
          className="relative"
          style={{ gridColumn: 2, gridRow: RIBBON_OVERLAY_ROW }}
          onMouseMove={trackCursor}
          onMouseLeave={() => setCursor(null)}
        >
          <GridLines ticks={ticks} />
          {cursor !== null && (
            <>
              {/* 커서 선과 활성 점 모두 이상 탐지 차트(Recharts)의 기본값과 같은 색·크기다 */}
              <span
                className="pointer-events-none absolute inset-y-0 w-px"
                style={{
                  left: `${(cursor / TIMELINE_POINT_COUNT) * 100}%`,
                  backgroundColor: 'var(--border-strong)',
                }}
              />
              <ActiveDot score={data.scores[cursor] ?? null} cursor={cursor} />
              <CursorTooltip data={data} cursor={cursor} />
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border pt-2">
        <ul className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
          {RIBBON_LEGEND.map((item) => (
            <li key={item.state} className="flex items-center gap-1 text-[11px] text-fg-subtle">
              <span
                aria-hidden
                className="inline-block h-2 w-3 rounded-[1px]"
                style={{
                  backgroundColor: RIBBON_FILL[item.state],
                  opacity: item.state === 'unknown' ? 0.45 : 1,
                }}
              />
              {item.label}
            </li>
          ))}
        </ul>
        {/* 좁아지면 눌러 담지 말고 줄을 바꾼다 — 구간 숫자는 줄어들면 못 읽는다 */}
        <AnomalyBandLegend className="shrink-0" />
      </div>
    </div>
  );
}

/** JSX 조각을 묶기만 한다 — 격자 행이 깨지지 않게 래퍼 div를 두지 않는다 */
function Fragment({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

/** 높이는 격자 행이 정한다 — 라벨에 따로 적으면 트랙과 갈릴 자리가 생긴다 */
function Label({ text, row }: { text: string; row: number }) {
  return (
    <span
      className="flex items-center justify-end pr-0.5 text-[11px] text-fg-muted"
      style={{ gridRow: row, gridColumn: 1 }}
    >
      {text}
    </span>
  );
}

/**
 * 점수 행 라벨. 위아래 끝값을 함께 적어 **세로 위치를 보정한다.**
 *
 * 0~100 전체 눈금은 96px에 넣으면 숫자가 겹친다. 끝값 둘만 있으면 "선이 위쪽이면 높다"가
 * 읽히고, 구간 경계는 배경 밴드와 오른쪽 범례가 이미 말한다.
 */
function ScoreLabel({ row }: { row: number }) {
  return (
    <span
      className="flex flex-col items-end justify-between py-px text-[11px]"
      style={{ gridRow: row, gridColumn: 1 }}
    >
      <span className="num text-[10px] leading-none text-fg-subtle">100</span>
      <span className="text-fg-muted">이상 점수</span>
      <span className="num text-[10px] leading-none text-fg-subtle">0</span>
    </span>
  );
}

/** 트랙 칸. 자동 배치에 맡기면 오버레이가 점유한 칸을 피해 라벨 칸으로 밀려 들어간다 */
function Track({ row, children }: { row: number; children: React.ReactNode }) {
  return (
    <div className="min-w-0" style={{ gridRow: row, gridColumn: 2 }}>
      {children}
    </div>
  );
}

/**
 * 이상 점수 — 이 그림의 주인공.
 *
 * **배경이 등급, 계열이 값이다.** 예전에는 표본마다 등급 색으로 칠해 무지개 줄무늬가
 * 됐다. 이 저장소의 규약은 `AnomalyTimeline`(SCR-OP-001·002)이 정해 두었다 —
 * 배경은 `STATUS_BAND`, 계열은 `AI_HEX`. 이상 점수는 AI 산출값이라 실측과 색이
 * 달라야 한다(**E3**). 같은 값을 두 화면이 다른 색으로 그리면 안 된다.
 */
function ScoreTrack({
  scores,
  receiving,
}: {
  scores: (number | null)[];
  receiving: RibbonRun[];
}) {
  const segments = useMemo(() => toScorePath(scores), [scores]);

  return (
    <svg
      viewBox={`0 0 ${TIMELINE_POINT_COUNT} 100`}
      preserveAspectRatio="none"
      className="block w-full"
      style={{ height: RIBBON_SCORE_HEIGHT }}
    >
      {PROVISIONAL_ANOMALY_BANDS.map((band, i) => {
        const end = PROVISIONAL_ANOMALY_BANDS[i + 1]?.min ?? 100;
        return (
          <rect
            key={band.level}
            x={0}
            y={100 - end}
            width={TIMELINE_POINT_COUNT}
            height={end - band.min}
            fill={STATUS_BAND[band.level]}
          />
        );
      })}

      {/* 결측 구간은 배경으로 먼저 알린다 — 면적이 끊긴 것이 데이터 탓임을 보이려는 것이다 */}
      {receiving
        .filter((run) => run.state !== 'on')
        .map((run) => (
          <rect key={run.from} x={run.from} y={0} width={run.length} height={100} fill={OUTAGE_BAND} />
        ))}

      {segments.map((segment, i) => (
        <path key={i} d={segment.area} fill={AI_HEX} fillOpacity={0.22} stroke="none" />
      ))}
      {/* 선은 면적과 **다른 path**다. 면적 path를 그대로 그으면 밑변과 닫는 변까지 그려진다 */}
      {segments.map((segment, i) => (
        <path
          key={`line-${i}`}
          d={segment.line}
          fill="none"
          stroke={AI_HEX}
          strokeWidth={1.5}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {/* 구간 경계. 기준 화면(AnomalyTimeline)과 같은 점선이라 두 화면이 같게 읽힌다 */}
      {RIBBON_SCORE_TICKS.filter((value) => value !== 0 && value !== 100).map((value) => (
        <line
          key={value}
          x1={0}
          x2={TIMELINE_POINT_COUNT}
          y1={100 - value}
          y2={100 - value}
          stroke={GRID_HEX}
          strokeWidth={1}
          strokeDasharray="2 4"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

function StatusStrip({ runs }: { runs: RibbonRun[] }) {
  return (
    <svg
      viewBox={`0 0 ${TIMELINE_POINT_COUNT} 10`}
      preserveAspectRatio="none"
      className="block w-full"
      style={{ height: RIBBON_STRIP_HEIGHT }}
    >
      {runs.map((run) => (
        <rect
          key={run.from}
          x={run.from}
          y={0}
          width={run.length}
          height={10}
          fill={RIBBON_FILL[run.state]}
          opacity={run.state === 'unknown' ? 0.45 : 1}
        />
      ))}
    </svg>
  );
}

/** hover 없이도 '언제'가 읽혀야 한다. 자정은 한 단계 진하게 */
function GridLines({ ticks }: { ticks: ReturnType<typeof buildTicks> }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {ticks.map((tick) => (
        <span
          key={tick.index}
          className={cn('absolute inset-y-0 w-px', tick.isDayBreak ? 'bg-border-strong' : 'bg-border')}
          style={{ left: `${tick.percent}%`, opacity: tick.isDayBreak ? 0.9 : 0.5 }}
        />
      ))}
    </div>
  );
}

function TickLabels({ ticks }: { ticks: ReturnType<typeof buildTicks> }) {
  return (
    <div className="relative h-6 pt-1">
      {ticks.map((tick) => (
        <span
          key={tick.index}
          className={cn(
            'absolute top-1 text-[10px]',
            tick.percent === 0 && 'translate-x-0',
            tick.percent === 100 && '-translate-x-full',
            tick.percent > 0 && tick.percent < 100 && '-translate-x-1/2',
            tick.isDayBreak ? 'text-fg-muted' : 'text-fg-subtle',
          )}
          style={{ left: `${tick.percent}%` }}
        >
          <span className="num whitespace-nowrap">{tick.label}</span>
          {tick.dateLabel && (
            <span className="num block whitespace-nowrap text-fg-subtle">{tick.dateLabel}</span>
          )}
        </span>
      ))}
    </div>
  );
}

/**
 * 하루 요약 — **고정 캡션**이다. hover에 따라 바뀌지 않는다.
 *
 * 예전에는 이 줄이 커서를 따라 바뀌었는데, 값을 보려면 그래프에서 눈을 떼고 위를 봐야 했다.
 * 다른 차트와 읽는 방식도 달랐다 — 이제 커서 값은 툴팁이 그 자리에서 말한다.
 */
function Caption({ data, dateIso }: { data: RibbonData; dateIso: string }) {
  return (
    <p className="text-[11px] text-fg-subtle">
      {dateIso.slice(0, 10)} 기준 {HISTORY_WINDOW_HOURS}시간 · {COLLECTION_INTERVAL_MINUTES}분 주기 ·{' '}
      {DISPLAY_TIMEZONE} — 방류 <span className="num text-fg-muted">{dischargeHoursText(data)}</span>{' '}
      · 알람 <span className="num text-fg-muted">{data.alarms.length}</span>건
    </p>
  );
}

/**
 * 커서 값 툴팁.
 *
 * **다른 차트와 같은 껍데기를 쓴다**(`ChartTooltipShell`) — 화면마다 다른 툴팁을 만들지
 * 않는다는 규칙 그대로다. 한 시각의 네 사실을 세로로 쌓아 세로로 훑는 리본의 읽기
 * 방향과 맞춘다.
 *
 * 양 끝에서는 정렬을 뒤집는다. 가운데 정렬만 하면 트랙 밖으로 나간다.
 */
function CursorTooltip({ data, cursor }: { data: RibbonData; cursor: number }) {
  const percent = (cursor / TIMELINE_POINT_COUNT) * 100;
  const score = data.scores[cursor] ?? null;
  const level = score === null ? null : toStatusLevel(score);

  const align =
    percent < RIBBON_TOOLTIP_EDGE_PERCENT
      ? 'translateX(0)'
      : percent > 100 - RIBBON_TOOLTIP_EDGE_PERCENT
        ? 'translateX(-100%)'
        : 'translateX(-50%)';

  return (
    <div
      className="pointer-events-none absolute top-1 z-10"
      style={{ left: `${percent}%`, transform: align }}
    >
      <ChartTooltipShell label={`${formatClock(timelineIsoAt(cursor))} ${DISPLAY_TIMEZONE}`}>
        {/**
         * **이상 탐지 화면(`AnomalyTimeline`)과 같은 구성이다.** 점수와 등급을 각각의 줄에
         * 두고, 등급 줄은 상태 색을 쓴다. 결측은 `수신 없음 · —`으로 적는다 —
         * 같은 값을 두 화면이 다르게 보여 주면 어느 쪽이 정본인지 알 수 없다.
         */}
        {score === null ? (
          <ChartTooltipRow color="var(--missing)" name="수신 없음" value="—" />
        ) : (
          <>
            <ChartTooltipRow color={AI_HEX} name="이상 점수" value={String(score)} />
            <ChartTooltipRow
              color={STATUS_VISUAL[level!].hex}
              name="등급"
              value={PROVISIONAL_STATUS_LABELS[level!]}
            />
          </>
        )}
        <StateRow label="가동" state={stateAt(data.running, cursor)} off={RIBBON_OFF_LABELS.running} />
        <StateRow
          label="방류"
          state={stateAt(data.discharging, cursor)}
          off={RIBBON_OFF_LABELS.discharging}
        />
        <StateRow
          label="수신"
          state={stateAt(data.receiving, cursor)}
          off={RIBBON_OFF_LABELS.receiving}
        />
      </ChartTooltipShell>
    </div>
  );
}

/**
 * 커서가 짚은 값 위의 점.
 *
 * 이상 탐지 차트의 `activeDot`(r=3, `AI_HEX`)과 같다. SVG 안에 그리지 않는 이유는
 * 점수 트랙이 `preserveAspectRatio="none"`이라 원이 타원으로 늘어나기 때문이다 —
 * 오버레이 위에 HTML로 얹는다.
 */
function ActiveDot({ score, cursor }: { score: number | null; cursor: number }) {
  if (score === null) return null;

  return (
    <span
      className="pointer-events-none absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
      style={{
        left: `${(cursor / TIMELINE_POINT_COUNT) * 100}%`,
        top: ((100 - score) / 100) * RIBBON_SCORE_HEIGHT,
        backgroundColor: AI_HEX,
      }}
    />
  );
}

/** 색은 리본의 그 띠와 같다 — 툴팁에서 다른 색을 쓰면 어느 줄 얘기인지 알 수 없다 */
function StateRow({ label, state, off }: { label: string; state: RibbonState; off: string }) {
  const text = state === 'unknown' ? '모름' : state === 'on' ? '중' : off;
  return <ChartTooltipRow color={RIBBON_FILL[state]} name={label} value={text} />;
}

function stateAt(runs: RibbonRun[], index: number): RibbonState {
  return runs.find((run) => index >= run.from && index < run.from + run.length)?.state ?? 'unknown';
}

/** 하루 내내 모름이면 '0시간'이 아니라 '모름'이다 — 없는 사실을 적지 않는다(E4) */
function dischargeHoursText(data: RibbonData): string {
  const samples = countOnSamples(data.discharging);
  return samples === null ? '모름' : `${Math.floor(samples / SAMPLES_PER_HOUR)}시간`;
}

/** 막대 하나하나가 아니라 이 그림이 말하는 결론을 전한다 */
function summarize(data: RibbonData, dateIso: string): string {
  const scores = data.scores.filter((s): s is number => s !== null);
  const peak = scores.length > 0 ? Math.max(...scores) : null;
  const missing = data.receiving.filter((run) => run.state !== 'on').length;

  return [
    `일간 운전 ${dateIso.slice(0, 10)}`,
    `방류 ${dischargeHoursText(data)}`,
    peak === null
      ? '이상 점수 산출 없음'
      : `최고 이상 점수 ${peak} ${PROVISIONAL_STATUS_LABELS[toStatusLevel(peak)]}`,
    `알람 ${data.alarms.length}건`,
    missing > 0 ? `결측 ${missing}구간` : '결측 없음',
  ].join(' · ');
}
