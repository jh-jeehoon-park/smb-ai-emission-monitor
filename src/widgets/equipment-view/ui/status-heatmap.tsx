'use client';

import { useRef, useState } from 'react';
import {
  OPERATING_ANOMALY_GRADIENT,
  OPERATING_CELL_HIGHLIGHT,
  OPERATING_FILL,
  OPERATING_GRADIENT,
} from '@/shared/config/operating-visual';
import { MISSING_HEX, STATUS_VISUAL } from '@/shared/config/status-visual';
import { DISPLAY_TIMEZONE, formatClock } from '@/shared/lib/format';
import { ChartTooltipRow, ChartTooltipShell } from '@/shared/ui/chart-tooltip';
import {
  EQUIPMENT_SIGNAL_LABELS,
  STATUS_TIMELINE_HOURS,
  getRunTimeline,
  type Equipment,
  type EquipmentRunCell,
} from '@/entities/equipment';
import {
  HEATMAP_CELL_MIN_PX,
  HEATMAP_LABEL_PX,
  HEATMAP_TICK_HOURS,
  HEATMAP_TOOLTIP_OFFSET_PX,
  HEATMAP_TOOLTIP_WIDTH_PX,
} from '../config/constants';

/** 값이 없는 시간을 여백과 구분해 드러낸다 — 빈 칸으로 두면 "여기 아무 일 없었다"로 읽힌다 */
const MISSING_FILL = `repeating-linear-gradient(45deg, ${MISSING_HEX} 0 2px, transparent 2px 5px)`;

const RUN_LABEL = { on: '가동', off: '정지', unknown: '모름' } as const;

type RunState = keyof typeof RUN_LABEL;

const runStateOf = (running: boolean | null): RunState =>
  running === null ? 'unknown' : running ? 'on' : 'off';

interface HoverTarget {
  /** 어느 설비 행인가 */
  rowKey: string;
  column: number;
  iso: string;
  equipmentName: string;
  body: React.ReactNode;
  /** 격자 바깥 기준면에서의 좌표(px) */
  x: number;
  y: number;
  /** 오른쪽 끝이라 커서 왼편에 그려야 하는가 */
  flip: boolean;
}

/**
 * 설비 × 시간 **가동 격자**.
 *
 * `[원문 발표 p.18 그림]`의 설비별 Heatmap 형태를 따른다 — 행이 설비, 열이 00~24시.
 * **칸이 말하는 것은 등급이 아니라 가동 여부다** `[회의 2026-08-20]` `[INC-107]`. 회의가
 * 확인 가능하다고 정리한 것이 on/off와 이상 알림 둘이라 격자도 그 둘만 담는다.
 *
 * 색은 가동/정지/모름이고 **이상은 위험색 칸으로** 드러낸다. 등급 색을 가동 채움에 쓰지 않는
 * 이유는 켜짐/꺼짐이 등급이 아니기 때문이다(`design-system §2`: 색은 상태를 뜻할 때만 쓴다).
 *
 * **행은 설비뿐이다** `[사용자 요청 2026-09-08]`. 사업장 단위 축인 `방지시설 가동` 줄이
 * 아래에 붙어 있었는데, 그 사실이 뜻을 갖는 곳은 방류 여부와 나란히 놓이는 이상 탐지의
 * `방지시설 미가동 중 방류 의심`(REQ-AD-032)이다 — 이 화면에는 함께 읽을 축이 없어
 * 구분선·별도 범례·별도 툴팁 이름을 치르고도 닿는 결론이 없었다.
 *
 * `<table>`로 짠다. 격자를 `div`로 그리면 스크린리더에 96개의 색만 남는다. 표는 행·열
 * 머리글을 함께 읽어 주므로 "폭기 블로워 #1, 14시, 가동, 진동 이상"이 그대로 전달된다.
 */
export function StatusHeatmap({ siteId, items }: { siteId: string; items: Equipment[] }) {
  const rows = items.map((equipment) => ({
    equipment,
    cells: getRunTimeline(siteId, equipment),
  }));
  const [hover, setHover] = useState<HoverTarget | null>(null);
  const frame = useRef<HTMLDivElement>(null);

  /*
   * 좌표를 **마우스에서** 받는다.
   *
   * 칸 위치로 계산하면 가로 스크롤이 생기는 폭에서 어긋난다. 그리고 툴팁은 스크롤 상자
   * **바깥** 기준면에 그린다 — `overflow-x-auto`는 세로도 함께 자르므로(CSS 규정) 안에
   * 두면 격자 아래로 나가는 순간 잘려 아예 보이지 않는다. 실제로 그렇게 안 보였다.
   */
  const track = (event: React.MouseEvent, build: (x: number, y: number) => HoverTarget) => {
    const box = frame.current?.getBoundingClientRect();
    if (!box) return;
    const x = event.clientX - box.left;
    const target = build(x, event.clientY - box.top);
    /* 오른쪽 끝에서 커서 옆에 그대로 두면 패널 밖으로 나간다 */
    target.flip = x + HEATMAP_TOOLTIP_OFFSET_PX + HEATMAP_TOOLTIP_WIDTH_PX > box.width;
    setHover(target);
  };

  /*
   * 아는 칸이 하나도 없으면 격자를 그리지 않는다. 120칸을 전부 빗금으로 채우면 정보가 아니라
   * 잡음이고, 같은 화면의 다른 패널은 이미 글로 비어 있음을 말한다(R19).
   */
  if (!rows.some((row) => row.cells.some((cell) => cell.running !== null))) {
    return (
      <p className="py-8 text-center text-[12px] text-fg-subtle">
        통신이 두절된 사업장입니다. 수신한 시간이 없어 가동 격자를 그리지 않습니다.
      </p>
    );
  }

  const hasMissing = rows.some((row) => row.cells.some((cell) => cell.running === null));
  const hasAnomaly = rows.some((row) => row.cells.some((cell) => cell.signals.length > 0));
  /* 모든 행이 같은 시간 축이다(`getRunTimeline`) — 눈금은 아무 행에서나 읽어도 같다 */
  const ticks = rows[0]!.cells;

  return (
    <div className="space-y-2">
      <div className="relative" ref={frame} onMouseLeave={() => setHover(null)}>
        {/*
         * 격자를 **홈 안에 앉힌다** `[사용자 지시 2026-08-24]` — 옅은 면 + 안쪽 그림자
         * (`--track-inset`, 막대·게이지 트랙과 같은 값)라 칸들이 파인 자리에 놓인 것으로 읽힌다.
         * 홈이 없던 판본은 120칸이 카드 면 위에 떠 있어 어디까지가 격자인지 경계가 없었다.
         */}
        <div className="overflow-x-auto rounded-nested bg-surface-2 p-2.5 shadow-track">
          <table
            className="w-full table-fixed border-separate border-spacing-[1px] text-center"
            style={{ minWidth: STATUS_TIMELINE_HOURS * HEATMAP_CELL_MIN_PX + HEATMAP_LABEL_PX }}
          >
            <caption className="sr-only">
              설비별 24시간 가동 상태. 행은 설비, 열은 시각, 칸은 그 시간의 가동 여부와 이상
              신호다.
            </caption>

            <thead>
              <tr>
                <th
                  scope="col"
                  className="pb-1 text-left text-[12px] font-normal text-fg-subtle"
                  style={{ width: HEATMAP_LABEL_PX }}
                >
                  설비
                </th>
                {ticks.map((cell) => (
                  <th
                    key={cell.hourOffset}
                    scope="col"
                    className="num pb-1 text-[12px] font-normal text-fg-subtle"
                  >
                    {/* 24칸에 눈금을 다 달면 겹친다. 눈으로는 3시간마다, 스크린리더에는 전부 */}
                    <span aria-hidden>
                      {cell.hourOffset % HEATMAP_TICK_HOURS === 0 ? formatClock(cell.iso) : ''}
                    </span>
                    <span className="sr-only">{formatClock(cell.iso)}</span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map(({ equipment, cells }) => (
                <tr key={equipment.id}>
                  <th
                    scope="row"
                    className="truncate pr-2 text-left text-[12px] font-normal text-fg-muted"
                  >
                    {equipment.name}
                  </th>
                  {cells.map((cell) => (
                    <RunCell
                      key={cell.hourOffset}
                      cell={cell}
                      active={hover?.rowKey === equipment.id && hover.column === cell.hourOffset}
                      onMove={(e) => track(e, (x, y) => runHover(equipment, cell, x, y))}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {hover && <HeatmapTooltip hover={hover} />}
      </div>

      <HeatmapLegend hasMissing={hasMissing} hasAnomaly={hasAnomaly} />
    </div>
  );
}

/**
 * 가동 칸.
 *
 * 채움은 가동/정지/모름이고 **이상이 걸린 칸에만** 글리프를 얹는다. 96칸 전부에 찍으면
 * 색각 보조가 아니라 잡음이 되고, `dataviz`의 "never a number on every point"에 걸린다 —
 * 예외를 표시하는 것이 요점이다.
 */
function RunCell({
  cell,
  active,
  onMove,
}: {
  cell: EquipmentRunCell;
  active: boolean;
  onMove: (event: React.MouseEvent) => void;
}) {
  const hour = formatClock(cell.iso);
  const state = runStateOf(cell.running);
  const anomaly = cell.signals.length > 0;

  /* 수신하지 못한 시간을 가동으로도 정지로도 칠하지 않는다(E4) */
  if (state === 'unknown') {
    return (
      <td
        onMouseMove={onMove}
        className="h-5 rounded-[3px]"
        style={{ backgroundImage: MISSING_FILL, outline: active ? OUTLINE : undefined }}
      >
        <span className="sr-only">{hour} 수신 없음</span>
      </td>
    );
  }

  return (
    <td
      onMouseMove={onMove}
      className="h-5 rounded-[3px] text-center align-middle"
      style={{
        /*
         * 같은 색의 위아래 농도 차 + 윗면 하이라이트 — 칸이 면에 얹힌 조각으로 읽힌다.
         * **이상 신호가 걸린 칸은 위험색으로 칠한다** `[사용자 지시 2026-08-24: 세모는 지워라]` —
         * 8px 도형은 20px 칸에서 거의 보이지 않았다. 무엇이 걸렸는지는 툴팁과 아래 숨은 문구가 말한다.
         */
        backgroundImage: anomaly ? OPERATING_ANOMALY_GRADIENT : OPERATING_GRADIENT[state],
        boxShadow: OPERATING_CELL_HIGHLIGHT,
        outline: active ? OUTLINE : undefined,
      }}
    >
      <span className="sr-only">
        {hour} {RUN_LABEL[state]}
        {anomaly && ` · ${cell.signals.map((s) => EQUIPMENT_SIGNAL_LABELS[s]).join(' · ')}`}
      </span>
    </td>
  );
}

/**
 * 판독 툴팁.
 *
 * **다른 차트와 같은 껍데기를 쓴다**(`ChartTooltipShell`) — 화면마다 다른 툴팁을 만들지
 * 않는다는 규칙 그대로다(P9). 세로로 훑는 격자라 시각·설비·상태를 세로로 쌓는다.
 */
function HeatmapTooltip({ hover }: { hover: HoverTarget }) {
  return (
    /*
     * 보조기술에는 숨긴다. 같은 사실이 이미 칸의 `sr-only` 텍스트로 표에 실려 있어
     * 여기서 또 읽으면 같은 말을 두 번 듣는다. 툴팁은 마우스 사용자를 위한 덧layer다.
     */
    <div
      aria-hidden
      data-heat-tooltip
      className="pointer-events-none absolute z-10"
      style={{
        left: hover.x + (hover.flip ? -HEATMAP_TOOLTIP_OFFSET_PX : HEATMAP_TOOLTIP_OFFSET_PX),
        top: hover.y,
        transform: `translate(${hover.flip ? '-100%' : '0'}, -50%)`,
      }}
    >
      <ChartTooltipShell label={`${formatClock(hover.iso)} ${DISPLAY_TIMEZONE}`}>
        <p className="text-[12px] text-fg-muted">{hover.equipmentName}</p>
        {hover.body}
      </ChartTooltipShell>
    </div>
  );
}

function runHover(equipment: Equipment, cell: EquipmentRunCell, x: number, y: number): HoverTarget {
  const state = runStateOf(cell.running);
  return {
    rowKey: equipment.id,
    column: cell.hourOffset,
    iso: cell.iso,
    equipmentName: equipment.name,
    x,
    y,
    flip: false,
    body:
      state === 'unknown' ? (
        <ChartTooltipRow color={MISSING_HEX} name="수신 없음" value="—" />
      ) : (
        <>
          {/* 행 이름과 값이 둘 다 `가동`이면 무엇이 이름인지 읽히지 않는다 */}
          <ChartTooltipRow
            color={OPERATING_FILL[state]}
            name="가동 상태"
            value={RUN_LABEL[state]}
          />
          {/* 이상이 없는 칸에 `없음` 행을 달지 않는다 — 96칸 툴팁마다 같은 말이 붙는다 */}
          {cell.signals.map((signal) => (
            <ChartTooltipRow
              key={signal}
              color={STATUS_VISUAL[equipment.status].hex}
              name="이상"
              value={EQUIPMENT_SIGNAL_LABELS[signal]}
            />
          ))}
        </>
      ),
  };
}

/** 짚은 **그 칸만** 응답한다는 것을 보인다(`dataviz` — the hovered mark lifts) */
const OUTLINE = '1px solid var(--border-strong)';

function HeatmapLegend({
  hasMissing,
  hasAnomaly,
}: {
  hasMissing: boolean;
  hasAnomaly: boolean;
}) {
  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-2 text-[12px] text-fg-subtle">
      <li className="flex items-center gap-1">
        <span
          aria-hidden
          className="h-2.5 w-3.5 rounded-[2px]"
          style={{ backgroundColor: OPERATING_FILL.on }}
        />
        가동
      </li>
      <li className="flex items-center gap-1">
        <span
          aria-hidden
          className="h-2.5 w-3.5 rounded-[2px]"
          style={{ backgroundColor: OPERATING_FILL.off }}
        />
        정지
      </li>

      {/* 일어나지 않은 상태의 범례는 잡음이다. 격자에 있을 때만 설명한다 */}
      {hasAnomaly && (
        <li className="flex items-center gap-1">
          {/* 칸과 같은 채움을 축소해 보인다 — 범례와 격자가 다른 표기를 쓰면 범례가 거짓이 된다 */}
          <span
            aria-hidden
            className="h-2.5 w-3.5 rounded-[2px]"
            style={{ backgroundImage: OPERATING_ANOMALY_GRADIENT }}
          />
          이상 신호
        </li>
      )}

      {hasMissing && (
        <li className="flex items-center gap-1">
          <span
            aria-hidden
            className="h-2.5 w-3.5 rounded-[2px]"
            style={{ backgroundImage: MISSING_FILL }}
          />
          수신 없음
        </li>
      )}
    </ul>
  );
}
