import type { StatusLevel } from './provisional';

/**
 * 등급의 라벨·색·정렬 순서를 한 세트로 묶는다.
 * 값과 색이 따로 흩어지면 한쪽만 바뀌어 조용히 어긋난다.
 */
export interface StatusVisual {
  token: 'normal' | 'caution' | 'warning' | 'critical';
  /** Tailwind 클래스 — 테마 전환은 CSS 변수가 알아서 처리한다 */
  text: string;
  bg: string;
  border: string;
  /**
   * 차트 마크에 쓰는 색. Recharts는 CSS 클래스를 받지 않지만 SVG는 CSS 변수를 받는다.
   * 리터럴 hex를 넣으면 테마를 바꿔도 차트만 그대로 남는다.
   */
  hex: string;
  /** 글자에 쓸 색. 마크는 3:1이면 되지만 글자는 4.5:1이 필요해 따로 둔다 */
  ink: string;
  /** 이 색을 **배경으로** 깔았을 때 그 위에 올릴 글자색 */
  on: string;
  /** 색에만 의존하지 않도록 형태로도 등급을 구분한다 */
  glyph: string;
}

/**
 * 실제 색값은 globals.css의 CSS 변수에 있다. 라이트/다크 두 조합 모두
 * dataviz의 validate_palette.js를 통과한 값이며, 서로의 반전이 아니다.
 */
export const STATUS_VISUAL: Record<StatusLevel, StatusVisual> = {
  normal: {
    token: 'normal',
    text: 'text-normal-ink',
    bg: 'bg-normal/10',
    border: 'border-normal/30',
    hex: 'var(--normal)',
    ink: 'var(--normal-ink)',
    on: 'var(--normal-on)',
    glyph: '●',
  },
  caution: {
    token: 'caution',
    text: 'text-caution-ink',
    bg: 'bg-caution/10',
    border: 'border-caution/35',
    hex: 'var(--caution)',
    ink: 'var(--caution-ink)',
    on: 'var(--caution-on)',
    glyph: '◆',
  },
  warning: {
    token: 'warning',
    text: 'text-warning-ink',
    bg: 'bg-warning/12',
    border: 'border-warning/35',
    hex: 'var(--warning)',
    ink: 'var(--warning-ink)',
    on: 'var(--warning-on)',
    glyph: '▲',
  },
  critical: {
    token: 'critical',
    text: 'text-critical-ink',
    bg: 'bg-critical/14',
    border: 'border-critical/45',
    hex: 'var(--critical)',
    ink: 'var(--critical-ink)',
    on: 'var(--critical-on)',
    glyph: '■',
  },
};

/** 글자에는 이 값을, 마크에는 hex를 쓴다. */
export function statusInk(visual: StatusVisual): string {
  return visual.ink;
}

/**
 * 차트 배경 밴드 색. 테마마다 투명도가 다르게 잡혀 있다 —
 * 다크 기준 투명도를 라이트에 그대로 쓰면 밴드가 흰 배경에 묻혀 보이지 않는다.
 */
export const STATUS_BAND: Record<StatusLevel, string> = {
  normal: 'var(--band-normal)',
  caution: 'var(--band-caution)',
  warning: 'var(--band-warning)',
  critical: 'var(--band-critical)',
};

export const OUTAGE_BAND = 'var(--band-outage)';

/** AI 산출값 전용 색. 상태 색과 섞지 않는다 — 실측과 추정을 구분해야 한다(E3) */
export const AI_HEX = 'var(--ai)';
/** AI 계열 면 채움. 보라 그래디언트는 AI 상투 패턴으로 검출되므로 평면으로 쓴다 */
export const AI_BAND = 'var(--band-ai)';
/** 실측 계열용 중립 잉크. 색을 쓰지 않아 상태 색과 경쟁하지 않는다 */
export const ACTUAL_HEX = 'var(--actual)';
export const MISSING_HEX = 'var(--missing)';
export const GRID_HEX = 'var(--grid)';
export const AXIS_TEXT_HEX = 'var(--axis-text)';
