'use client';

import { Droplets, Filter, Gauge, Layers, ShieldCheck, Wind } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  PROVISIONAL_MEASUREMENT_GRADE_DASH,
  PROVISIONAL_MEASUREMENT_GRADE_LABELS,
  type MeasurementGrade,
} from '@/shared/config/provisional';
import { MEASUREMENT_ITEMS } from '@/shared/config/measurement';
import { ACTUAL_HEX, AI_HEX, MISSING_HEX } from '@/shared/config/status-visual';
import { formatValue } from '@/shared/lib/format';
import type { ProcessStage } from '@/entities/process';
import type { ResolvedStage } from '@/features/process-settings';
import {
  BASIN_FLOOR,
  DIAGRAM_HEIGHT,
  NODE_HEIGHT,
  NODE_TOP,
  NODE_WIDTH,
  diagramWidth,
  nodeCenterY,
  nodeX,
} from '../config/layout';
import { stageReadings, type StageReading } from '../lib/stage-readings';

/**
 * 계측 등급 색. **상태 등급 색이 아니다** — `status-visual.ts`가 실측·추정·결측을 가르는
 * 계열색을 이미 갖고 있고, E3가 "실측과 추정을 구분하라"고 요구한다.
 */
const GRADE_HEX: Record<MeasurementGrade, string> = {
  actual: ACTUAL_HEX,
  estimated: AI_HEX,
  none: MISSING_HEX,
};

const TYPE_LABELS: Record<ProcessStage['type'], string> = {
  physical: '물리',
  biological: '생물',
  chemical: '화학',
  monitoring: '측정',
};

/** 단계가 하는 일을 한 눈에 — 거름·침전·폭기·분리·소독·계측 */
const STAGE_ICONS: Record<string, LucideIcon> = {
  intake: Filter,
  primary: Layers,
  biological: Wind,
  secondary: Droplets,
  advanced: Gauge,
};

/** 아이콘이 없는 플러스 알파 단계의 기본값. 목록이 오면 위 표에 넣는다 `[TBD-53]` */
const FALLBACK_ICON = ShieldCheck;

/**
 * 노드 하나에 적는 계측값의 최대 개수.
 *
 * 140px 안에 두 줄이 들어간다. 넘치면 `+n`으로 접는다 — 다 적으면 글자가 노드를 넘고,
 * 접은 것을 감추면 몇 개가 더 있는지 알 수 없다.
 */
const MAX_READINGS = 4;

interface Props {
  /** **켠 단계만** 온다. 무엇을 켤지는 `features/process-settings`가 정한다 */
  stages: readonly ResolvedStage[];
  siteId: string;
  selectedId: string;
  onSelect: (id: string) => void;
}

export function ProcessDiagram({ stages, siteId, selectedId, onSelect }: Props) {
  const width = diagramWidth(stages.length);

  return (
    <svg
      viewBox={`0 0 ${width} ${DIAGRAM_HEIGHT}`}
      className="w-full min-w-[900px]"
      role="group"
      aria-label="폐수처리 공정 흐름"
    >
      <defs>
        {/* 계측 화면의 눈금 질감. 값을 뜻하지 않는 배경이다 */}
        <pattern id="process-grid" width="22" height="22" patternUnits="userSpaceOnUse">
          <path d="M22 0 L0 0 0 22" fill="none" stroke="var(--border)" strokeWidth="0.6" />
        </pattern>
        <linearGradient id="process-grid-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id="process-grid-mask">
          <rect width={width} height={DIAGRAM_HEIGHT} fill="url(#process-grid-fade)" />
        </mask>
      </defs>

      <rect
        width={width}
        height={DIAGRAM_HEIGHT}
        fill="url(#process-grid)"
        mask="url(#process-grid-mask)"
      />

      {stages.slice(0, -1).map((resolved, index) => (
        <Pipe key={resolved.stage.id} index={index} />
      ))}

      {stages.map((resolved, index) => (
        <BasinNode
          key={resolved.stage.id}
          stage={resolved.stage}
          index={index}
          readings={stageReadings(siteId, resolved)}
          selected={resolved.stage.id === selectedId}
          onSelect={onSelect}
        />
      ))}

      <EstimateBranch count={stages.length} />
    </svg>
  );
}

/** 수조 사이를 잇는 관. 굵은 관 안쪽으로 물이 흐른다 */
function Pipe({ index }: { index: number }) {
  // 노드 안쪽까지 6px 물린다. 파이프를 먼저 그리므로 겹친 부분은 노드가 덮는다
  const x1 = nodeX(index) + NODE_WIDTH - 6;
  const x2 = nodeX(index + 1) + 6;
  const y = nodeCenterY();

  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke="var(--surface-3)" strokeWidth={13} strokeLinecap="butt" />
      <line x1={x1} y1={y - 6} x2={x2} y2={y - 6} stroke="var(--border-strong)" strokeWidth={1} />
      <line x1={x1} y1={y + 6} x2={x2} y2={y + 6} stroke="var(--border-strong)" strokeWidth={1} />
      {/* 흐르는 물. 감속 설정에서는 globals.css 전역 규칙이 멈춘다 */}
      <line
        x1={x1}
        y1={y}
        x2={x2}
        y2={y}
        stroke={ACTUAL_HEX}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray="4 7"
        opacity={0.9}
        className="process-flow"
      />
    </g>
  );
}

function BasinNode({
  stage,
  index,
  readings,
  selected,
  onSelect,
}: {
  stage: ProcessStage;
  index: number;
  readings: StageReading[];
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const x = nodeX(index);
  const hex = GRADE_HEX[stage.grade];
  const floorY = NODE_TOP + NODE_HEIGHT - BASIN_FLOOR;
  const Icon = STAGE_ICONS[stage.id] ?? FALLBACK_ICON;
  /* 설정된 항목이 있으면 그것이 곧 계측 지점이다 — 등급 상수보다 사용자 설정이 먼저다 */
  const measured = readings.length > 0 || stage.grade === 'actual';

  return (
    <g
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${stage.order}. ${stage.name} — ${PROVISIONAL_MEASUREMENT_GRADE_LABELS[stage.grade]}`}
      className="cursor-pointer outline-none"
      onClick={() => onSelect(stage.id)}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        onSelect(stage.id);
      }}
    >
      {/* 수조 몸통 */}
      <rect
        x={x}
        y={NODE_TOP}
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx={8}
        fill={selected ? 'var(--surface-2)' : 'var(--surface)'}
        stroke={hex}
        strokeWidth={selected ? 2 : 1.2}
        strokeDasharray={PROVISIONAL_MEASUREMENT_GRADE_DASH[stage.grade]}
      />

      {/* 바닥에 물이 담긴다는 것만 전한다. 높이가 값을 뜻하지 않는다 */}
      <path
        d={`M${x + 1} ${floorY} h${NODE_WIDTH - 2} v${BASIN_FLOOR - 8} a8 8 0 0 1 -8 8 h${-(NODE_WIDTH - 18)} a8 8 0 0 1 -8 -8 z`}
        fill="var(--surface-3)"
      />
      <path
        d={`M${x + 1} ${floorY} q17 -5 34 0 t34 0 t34 0 t34 0`}
        fill="none"
        stroke={ACTUAL_HEX}
        strokeWidth={1.2}
        opacity={0.5}
      />

      {/* 큰 번호를 배경에 깔아 위계를 만든다 */}
      <text
        x={x + NODE_WIDTH - 12}
        y={NODE_TOP + 40}
        textAnchor="end"
        className="fill-fg text-[34px] font-bold"
        opacity={0.07}
      >
        {stage.order}
      </text>

      <Icon x={x + 12} y={NODE_TOP + 12} width={17} height={17} stroke={hex} strokeWidth={1.8} />

      <text x={x + 12} y={NODE_TOP + 48} className="fill-fg-subtle text-[10px]">
        {TYPE_LABELS[stage.type]}
      </text>
      <text x={x + 12} y={NODE_TOP + 68} className="fill-fg text-[13px] font-semibold">
        {stage.name}
      </text>
      <text x={x + 12} y={NODE_TOP + 86} className="text-[10px]" style={{ fill: hex }}>
        {PROVISIONAL_MEASUREMENT_GRADE_LABELS[stage.grade]}
      </text>

      {/*
       * **그 지점의 지금 값.** 회의가 요구한 것이 이것이다 — HMI가 공정마다 값을 띄우는
       * 것처럼 노드에 적는다 `[회의 2026-08-20]`. 설정하지 않은 단계는 비운다 —
       * 지어내면 없는 계측을 주장한다(`[TBD-53]`).
       */}
      <Readings x={x} readings={readings} />

      {/* 실측 지점은 센서가 실제로 꽂혀 있다는 표시를 준다 */}
      {measured && (
        <g>
          <line x1={x + NODE_WIDTH - 26} y1={NODE_TOP - 10} x2={x + NODE_WIDTH - 26} y2={NODE_TOP + 6} stroke={hex} strokeWidth={1.6} />
          <circle cx={x + NODE_WIDTH - 26} cy={NODE_TOP - 13} r={4} fill="var(--surface)" stroke={hex} strokeWidth={1.6} />
        </g>
      )}
    </g>
  );
}

/**
 * 단계마다 적는 계측값.
 *
 * **값이 없으면 `수신 없음`이다** — 0으로 채우면 그 지점이 0을 재고 있다는 뜻이 된다(E4).
 * 넘치는 것은 `+n`으로 접는다. 다 적으면 글자가 노드를 넘는다.
 */
function Readings({ x, readings }: { x: number; readings: StageReading[] }) {
  if (readings.length === 0) return null;

  const shown = readings.slice(0, MAX_READINGS);
  const rest = readings.length - shown.length;
  /* 두 개씩 두 줄. 한 줄에 넷을 넣으면 140px에서 잘린다 */
  const lines = [shown.slice(0, 2), shown.slice(2)].filter((line) => line.length > 0);

  return (
    <g>
      {lines.map((line, row) => (
        <text
          key={row}
          x={x + 12}
          y={NODE_TOP + 104 + row * 14}
          className="fill-fg text-[10px]"
        >
          {line
            .map(
              (reading) =>
                `${MEASUREMENT_ITEMS[reading.code].symbol} ${
                  reading.latest === null ? '—' : formatValue(reading.code, reading.latest)
                }`,
            )
            .join('  ')}
          {row === lines.length - 1 && rest > 0 && (
            <tspan className="fill-fg-subtle">{`  +${rest}`}</tspan>
          )}
        </text>
      ))}
    </g>
  );
}

/**
 * 마지막 단계에서 갈라져 나오는 AI 추정. **직접 재지 않는 항목이라 선을 나눈다** —
 * 같은 관에 이어 그리면 프로브가 TN·TP도 재는 것처럼 읽힌다(E3).
 */
function EstimateBranch({ count }: { count: number }) {
  if (count === 0) return null;

  const x = nodeX(count - 1) + NODE_WIDTH / 2;
  const y1 = NODE_TOP + NODE_HEIGHT;
  const y2 = y1 + 30;

  return (
    <g>
      <line x1={x} y1={y1} x2={x} y2={y2} stroke={AI_HEX} strokeWidth={1.4} strokeDasharray="5 3" />
      <circle cx={x} cy={y2} r={3} fill={AI_HEX} />
      <text x={x} y={y2 + 20} textAnchor="middle" className="text-[12px] font-semibold" style={{ fill: AI_HEX }}>
        AI 추정 · T-N · T-P
      </text>
      <text x={x} y={y2 + 36} textAnchor="middle" className="fill-fg-subtle text-[10px]">
        직접 재지 않는다
      </text>
    </g>
  );
}
