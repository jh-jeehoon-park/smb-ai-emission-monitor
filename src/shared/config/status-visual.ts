import type { MeasurementGrade, StatusLevel } from './provisional';

/**
 * 등급의 라벨·색·정렬 순서를 한 세트로 묶는다.
 * 값과 색이 따로 흩어지면 한쪽만 바뀌어 조용히 어긋난다.
 */
export interface StatusVisual {
  token: 'normal' | 'caution' | 'warning' | 'critical';
  /** Tailwind 클래스 — 테마 전환은 CSS 변수가 알아서 처리한다 */
  text: string;
  bg: string;
  /**
   * 차트 마크에 쓰는 색. Recharts는 CSS 클래스를 받지 않지만 SVG는 CSS 변수를 받는다.
   * 리터럴 hex를 넣으면 테마를 바꿔도 차트만 그대로 남는다.
   */
  hex: string;
  /** 글자에 쓸 색. 마크는 3:1이면 되지만 글자는 4.5:1이 필요해 따로 둔다 */
  ink: string;
}

/**
 * 실제 색값은 globals.css의 CSS 변수에 있다. 라이트/다크 두 조합 모두
 * dataviz의 validate_palette.js를 통과한 값이며, 서로의 반전이 아니다.
 */
export const STATUS_VISUAL: Record<StatusLevel, StatusVisual> = {
  normal: {
    token: 'normal',
    text: 'text-normal-ink',
    bg: 'bg-chip-normal',
    hex: 'var(--normal)',
    ink: 'var(--normal-ink)',
  },
  caution: {
    token: 'caution',
    text: 'text-caution-ink',
    bg: 'bg-chip-caution',
    hex: 'var(--caution)',
    ink: 'var(--caution-ink)',
  },
  warning: {
    token: 'warning',
    text: 'text-warning-ink',
    bg: 'bg-chip-warning',
    hex: 'var(--warning)',
    ink: 'var(--warning-ink)',
  },
  critical: {
    token: 'critical',
    text: 'text-critical-ink',
    bg: 'bg-chip-critical',
    hex: 'var(--critical)',
    ink: 'var(--critical-ink)',
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

/**
 * **방류를 멈춘 구간**의 배경 밴드 `[사용자 요청 2026-08-28]`.
 *
 * 두절 밴드를 빌려 쓰지 않는다 — 그쪽은 *값을 못 받았다*이고 이쪽은 *받은 값이 0이다*라,
 * 같은 색을 쓰면 화면이 두절이라 거짓말한다(**E4**). 그래서 더 옅다.
 */
export const IDLE_BAND = 'var(--band-idle)';

/**
 * 격자 칸의 `정상` 채움.
 *
 * 마크 색과 배경 밴드 사이의 단이다. 히트맵은 대부분이 정상이라 마크 색으로 전부 칠하면
 * 예외가 묻히고, 밴드로 칠하면 칸 자체가 사라진다. 값과 근거는 `design-system §2`.
 */
export const CELL_NORMAL = 'var(--cell-normal)';

/** AI 산출값 전용 색. 상태 색과 섞지 않는다 — 실측과 추정을 구분해야 한다(E3) */
export const AI_HEX = 'var(--ai)';

/** 실측 계열 색. 짙은 남색이라 상태 색과 색상이 겹치지 않는다 */
export const ACTUAL_HEX = 'var(--actual)';
export const MISSING_HEX = 'var(--missing)';
export const GRID_HEX = 'var(--grid)';
export const AXIS_TEXT_HEX = 'var(--axis-text)';

/**
 * **계측 등급의 색.** `MeasurementGrade`(실측·추정·없음)를 계열색으로 옮긴다.
 *
 * **상태 등급 색이 아니다** — E3가 "실측과 추정을 구분하라"고 요구하고, 그 축은 정상·주의·
 * 경고·위험과 직교한다. 실측인 값이 위험일 수 있고 추정인 값이 정상일 수 있다.
 *
 * `provisional.ts`에 두지 않는 이유: 등급 **라벨**은 임시값이지만(`PROVISIONAL_MEASUREMENT_
 * GRADE_LABELS`) 그 색은 이미 확정된 계열색 셋을 가리키는 것뿐이라 확정될 값이 없다.
 *
 * 공정도(SCR-AD-002)가 사적으로 갖고 있던 것을 두 번째 소비처(SCR-AD-005 물의 단면)가
 * 생기면서 올렸다 — 같은 축을 두 화면이 다른 색으로 칠하면 같은 사실로 보이지 않는다.
 */
export const MEASUREMENT_GRADE_HEX: Record<MeasurementGrade, string> = {
  actual: ACTUAL_HEX,
  estimated: AI_HEX,
  none: MISSING_HEX,
};
