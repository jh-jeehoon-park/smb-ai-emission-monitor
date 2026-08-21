'use client';

import { useRef, useState } from 'react';
import { OPERATING_FILL, OPERATING_UNKNOWN_OPACITY } from '@/shared/config/operating-visual';
import { MISSING_HEX, STATUS_VISUAL } from '@/shared/config/status-visual';
import { DISPLAY_TIMEZONE, formatClock } from '@/shared/lib/format';
import { ChartTooltipRow, ChartTooltipShell } from '@/shared/ui/chart-tooltip';
import {
  EQUIPMENT_SIGNAL_LABELS,
  STATUS_TIMELINE_HOURS,
  getRunTimeline,
  getTreatmentTimeline,
  type Equipment,
  type EquipmentRunCell,
  type TreatmentCell,
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

/** 방지시설 줄은 설비가 아니라 별도 축이라 행 키를 따로 든다 */
const TREATMENT_ROW_KEY = 'treatment';

/** 이상이 걸린 칸에 얹는 형태 부호. 색만으로 가르지 않는다 */
const ANOMALY_GLYPH = '▲';

const RUN_LABEL = { on: '가동', off: '정지', unknown: '모름' } as const;
const TREATMENT_LABEL = { on: '가동', off: '미가동', unknown: '모름' } as const;

type RunState = keyof typeof RUN_LABEL;

const runStateOf = (running: boolean | null): RunState =>
  running === null ? 'unknown' : running ? 'on' : 'off';

interface HoverTarget {
  /** 어느 행인가 — 설비 id 또는 `treatment` */
  rowKey: string;
  column: number;
  iso: string;
  /** 설비 행이면 설비명, 방지시설 줄이면 `null` */
  equipmentName: string | null;
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
 * 색은 가동/정지/모름이고 **이상은 글리프로** 얹는다. 등급 색을 채움에 쓰지 않는 이유는
 * 켜짐/꺼짐이 등급이 아니기 때문이다(`design-system §2`: 색은 상태를 뜻할 때만 쓴다) —
 * 방지시설 줄이 이미 같은 규칙을 쓴다.
 *
 * `<table>`로 짠다. 격자를 `div`로 그리면 스크린리더에 120개의 색만 남는다. 표는 행·열
 * 머리글을 함께 읽어 주므로 "폭기 블로워 #1, 14시, 가동, 진동 이상"이 그대로 전달된다.
 */
export function StatusHeatmap({ siteId, items }: { siteId: string; items: Equipment[] }) {
  const rows = items.map((equipment) => ({
    equipment,
    cells: getRunTimeline(siteId, equipment),
  }));
  const treatment = getTreatmentTimeline(siteId);
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

  return (
    <div className="space-y-2">
      <div className="relative" ref={frame} onMouseLeave={() => setHover(null)}>
        <div className="overflow-x-auto">
          <table
            className="w-full table-fixed border-separate border-spacing-[1px]"
            style={{ minWidth: STATUS_TIMELINE_HOURS * HEATMAP_CELL_MIN_PX + HEATMAP_LABEL_PX }}
          >
            <caption className="sr-only">
              설비별 24시간 가동 상태. 행은 설비, 열은 시각, 칸은 그 시간의 가동 여부와 이상
              신호다. 마지막 행은 방지시설 가동 여부다.
            </caption>

            <thead>
              <tr>
                <th
                  scope="col"
                  className="pb-1 text-left text-[11px] font-normal text-fg-subtle"
                  style={{ width: HEATMAP_LABEL_PX }}
                >
                  설비
                </th>
                {treatment.map((cell) => (
                  <th
                    key={cell.hourOffset}
                    scope="col"
                    className="num pb-1 text-[10px] font-normal text-fg-subtle"
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
                    className="truncate pr-2 text-left text-[11px] font-normal text-fg-muted"
                  >
                    {equipment.name}
                  </th>
                  {cells.map((cell) => (
                    <RunCell
                      key={cell.hourOffset}
                      cell={cell}
                      level={equipment.status}
                      active={hover?.rowKey === equipment.id && hover.column === cell.hourOffset}
                      onMove={(e) => track(e, (x, y) => runHover(equipment, cell, x, y))}
                    />
                  ))}
                </tr>
              ))}

              {/* 설비 넷과 다른 축이라는 것이 선으로도 드러나야 한다 */}
              <tr aria-hidden>
                <td colSpan={STATUS_TIMELINE_HOURS + 1} className="h-2 border-b border-border" />
              </tr>

              {/*
               * 방지시설은 사업장 단위 사실이라 설비 칸에 섞지 않는다 — 방지시설은 멈췄는데
               * 방류 펌프는 돌았다는 것이 무단방류 의심의 요지다(TBD-46). 겹치면 그 구분이 사라진다.
               */}
              <tr>
                <th
                  scope="row"
                  className="truncate pr-2 pt-2 text-left text-[11px] font-normal text-fg-subtle"
                >
                  방지시설 가동
                </th>
                {treatment.map((cell) => (
                  <TreatmentCellView
                    key={cell.hourOffset}
                    cell={cell}
                    active={hover?.rowKey === TREATMENT_ROW_KEY && hover.column === cell.hourOffset}
                    onMove={(e) => track(e, (x, y) => treatmentHover(cell, x, y))}
                  />
                ))}
              </tr>
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
  level,
  active,
  onMove,
}: {
  cell: EquipmentRunCell;
  /** 이상 글리프에 쓸 등급 색. 채움에는 쓰지 않는다 */
  level: Equipment['status'];
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
        className="h-5 rounded-[2px]"
        style={{ backgroundImage: MISSING_FILL, outline: active ? OUTLINE : undefined }}
      >
        <span className="sr-only">{hour} 수신 없음</span>
      </td>
    );
  }

  return (
    <td
      onMouseMove={onMove}
      className="h-5 rounded-[2px] text-center align-middle"
      style={{
        backgroundColor: OPERATING_FILL[state],
        outline: active ? OUTLINE : undefined,
      }}
    >
      {anomaly && (
        <span
          aria-hidden
          className="text-[8px] leading-none"
          style={{ color: STATUS_VISUAL[level].hex }}
        >
          {ANOMALY_GLYPH}
        </span>
      )}
      <span className="sr-only">
        {hour} {RUN_LABEL[state]}
        {anomaly && ` · ${cell.signals.map((s) => EQUIPMENT_SIGNAL_LABELS[s]).join(' · ')}`}
      </span>
    </td>
  );
}

/**
 * 방지시설 가동 줄.
 *
 * **등급 색을 쓰지 않는다** — 이 축은 등급이 아니라 켜짐/꺼짐이고, 초록으로 칠한 `가동`은
 * 화면에서 `정상 등급`으로 읽힌다(`design-system §2`: 색은 상태를 뜻할 때만 쓴다).
 * 일간 운전 리본과 같은 `OPERATING_FILL`을 쓴다.
 *
 * 띠를 `td`가 아니라 안쪽 `span`에 그린다. `td`는 같은 행의 글자 높이만큼 늘어나 설비 행과
 * 구분되지 않는다 — 다섯 번째 설비처럼 읽힌다.
 */
function TreatmentCellView({
  cell,
  active,
  onMove,
}: {
  cell: TreatmentCell;
  active: boolean;
  onMove: (event: React.MouseEvent) => void;
}) {
  const state = cell.idle === null ? 'unknown' : cell.idle ? 'off' : 'on';

  return (
    <td
      onMouseMove={onMove}
      className="pt-2 align-middle"
      style={{ outline: active ? OUTLINE : undefined }}
    >
      {/*
       * **칸 간격을 덮어 연속된 띠로 만든다.** 이 줄은 시각이 아니라 **구간**의 축이고,
       * 끊긴 자리가 곧 미가동이다. 1px 간격이 남으면 띠가 이미 잘게 쪼개져 있어 진짜 끊김이
       * 간격과 구분되지 않는다 — 다크에서 실제로 미가동 구간이 묻혔다(라이트는 보였다).
       */}
      <span
        aria-hidden
        className="-mx-px block h-2.5 w-[calc(100%+2px)]"
        style={
          /*
           * 모름은 격자와 **같은 빗금**이다. 리본은 옅은 채움으로 표시하지만 이 줄은 8px라
           * 옅게 깐 `모름`과 중립면인 `미가동`이 구분되지 않는다 — 실제로 두 칸이 같아 보였다.
           * 빗금이면 결측 열이 격자 위아래로 한 줄기로 이어져 세로로 훑을 때 바로 읽힌다.
           */
          state === 'unknown'
            ? { backgroundImage: MISSING_FILL, opacity: OPERATING_UNKNOWN_OPACITY }
            : { backgroundColor: OPERATING_FILL[state] }
        }
      />
      <span className="sr-only">
        {formatClock(cell.iso)} {TREATMENT_LABEL[state]}
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
        {hover.equipmentName && <p className="text-[11px] text-fg-muted">{hover.equipmentName}</p>}
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

function treatmentHover(cell: TreatmentCell, x: number, y: number): HoverTarget {
  const state = cell.idle === null ? 'unknown' : cell.idle ? 'off' : 'on';
  return {
    rowKey: TREATMENT_ROW_KEY,
    column: cell.hourOffset,
    iso: cell.iso,
    equipmentName: null,
    x,
    y,
    flip: false,
    body: (
      <ChartTooltipRow
        color={OPERATING_FILL[state]}
        name="방지시설"
        value={TREATMENT_LABEL[state]}
      />
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
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-2 text-[11px] text-fg-subtle">
      <li className="flex items-center gap-1">
        <span
          aria-hidden
          className="h-2.5 w-3.5 rounded-[1px]"
          style={{ backgroundColor: OPERATING_FILL.on }}
        />
        가동
      </li>
      <li className="flex items-center gap-1">
        <span
          aria-hidden
          className="h-2.5 w-3.5 rounded-[1px]"
          style={{ backgroundColor: OPERATING_FILL.off }}
        />
        정지
      </li>

      {/* 일어나지 않은 상태의 범례는 잡음이다. 격자에 있을 때만 설명한다 */}
      {hasAnomaly && (
        <li className="flex items-center gap-1">
          <span
            aria-hidden
            className="flex h-2.5 w-3.5 items-center justify-center text-[7px] leading-none"
            style={{ color: STATUS_VISUAL.warning.hex }}
          >
            {ANOMALY_GLYPH}
          </span>
          이상 신호
        </li>
      )}

      {hasMissing && (
        <li className="flex items-center gap-1">
          <span
            aria-hidden
            className="h-2.5 w-3.5 rounded-[1px]"
            style={{ backgroundImage: MISSING_FILL }}
          />
          수신 없음
        </li>
      )}

      <li className="ml-auto flex items-center gap-1">
        <span
          aria-hidden
          className="h-2 w-3.5 rounded-[1px]"
          style={{ backgroundColor: OPERATING_FILL.on }}
        />
        방지시설 가동
        <span
          aria-hidden
          className="ml-1.5 h-2 w-3.5 rounded-[1px]"
          style={{ backgroundColor: OPERATING_FILL.off }}
        />
        미가동
      </li>
    </ul>
  );
}
