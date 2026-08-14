'use client';

import { Droplets, Filter, Gauge, Layers, ShieldCheck, Wind } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  PROVISIONAL_MEASUREMENT_GRADE_DASH,
  PROVISIONAL_MEASUREMENT_GRADE_LABELS,
  type MeasurementGrade,
} from '@/shared/config/provisional';
import { ACTUAL_HEX, AI_HEX, MISSING_HEX } from '@/shared/config/status-visual';
import type { ProcessStage } from '@/entities/process';
import {
  BASIN_FLOOR,
  DIAGRAM_HEIGHT,
  DIAGRAM_WIDTH,
  NODE_HEIGHT,
  NODE_TOP,
  NODE_WIDTH,
  nodeCenterY,
  nodeX,
} from '../config/layout';

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
  advanced: ShieldCheck,
  discharge: Gauge,
};

interface Props {
  stages: readonly ProcessStage[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function ProcessDiagram({ stages, selectedId, onSelect }: Props) {
  return (
    <svg
      viewBox={`0 0 ${DIAGRAM_WIDTH} ${DIAGRAM_HEIGHT}`}
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
          <rect width={DIAGRAM_WIDTH} height={DIAGRAM_HEIGHT} fill="url(#process-grid-fade)" />
        </mask>
      </defs>

      <rect
        width={DIAGRAM_WIDTH}
        height={DIAGRAM_HEIGHT}
        fill="url(#process-grid)"
        mask="url(#process-grid-mask)"
      />

      {stages.slice(0, -1).map((stage) => (
        <Pipe key={stage.id} order={stage.order} />
      ))}

      {stages.map((stage) => (
        <BasinNode
          key={stage.id}
          stage={stage}
          selected={stage.id === selectedId}
          onSelect={onSelect}
        />
      ))}

      <EstimateBranch stages={stages} />
    </svg>
  );
}

/** 수조 사이를 잇는 관. 굵은 관 안쪽으로 물이 흐른다 */
function Pipe({ order }: { order: number }) {
  // 노드 안쪽까지 6px 물린다. 파이프를 먼저 그리므로 겹친 부분은 노드가 덮는다
  const x1 = nodeX(order) + NODE_WIDTH - 6;
  const x2 = nodeX(order + 1) + 6;
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
  selected,
  onSelect,
}: {
  stage: ProcessStage;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const x = nodeX(stage.order);
  const hex = GRADE_HEX[stage.grade];
  const floorY = NODE_TOP + NODE_HEIGHT - BASIN_FLOOR;
  const Icon = STAGE_ICONS[stage.id] ?? Filter;
  const measured = stage.grade === 'actual';

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
 * 마지막 단계에서 갈라져 나오는 AI 추정. **직접 재지 않는 항목이라 선을 나눈다** —
 * 같은 관에 이어 그리면 프로브가 TN·TP도 재는 것처럼 읽힌다(E3).
 */
function EstimateBranch({ stages }: { stages: readonly ProcessStage[] }) {
  const last = stages[stages.length - 1];
  if (!last) return null;

  const x = nodeX(last.order) + NODE_WIDTH / 2;
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
