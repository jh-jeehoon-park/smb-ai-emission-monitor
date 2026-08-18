import type { RibbonState } from '../lib/build-ribbon';

/**
 * 상태별 채움.
 *
 * **새 색을 만들지 않는다.** 가동·방류·수신은 실측 계열색(`--actual`), 모름은 결측색
 * (`--missing`), 꺼짐은 중립면이다. 상태 등급 색(정상·주의·경고·위험)은 이 띠에 쓰지
 * 않는다 — 이 축은 등급이 아니라 켜짐/꺼짐이고, 섞으면 색이 뜻을 잃는다
 * (`design-system` §2). 등급 색은 이상 점수 행의 **배경 밴드**가 맡는다.
 */
export const RIBBON_FILL: Record<RibbonState, string> = {
  on: 'var(--actual)',
  off: 'var(--surface-3)',
  unknown: 'var(--missing)',
};

/** 상태 띠 세 줄이 공유하는 범례. 행마다 다른 말(정지·중단·결측)은 hover 판독줄이 맡는다 */
export const RIBBON_LEGEND = [
  { state: 'on', label: '가동·방류 중' },
  { state: 'off', label: '정지·중단' },
  { state: 'unknown', label: '모름(결측)' },
] as const satisfies readonly { state: RibbonState; label: string }[];

/** 행마다 '꺼짐'의 뜻이 다르다 — 커서 판독줄에서 쓴다 */
export const RIBBON_OFF_LABELS = {
  running: '정지',
  discharging: '중단',
  receiving: '결측',
} as const;

/**
 * 행 높이(px).
 *
 * **이상 점수 하나에만 무게를 준다.** 네 행이 같은 높이면 어디를 먼저 볼지 정해지지
 * 않아 덩어리로 읽힌다(루트 `CLAUDE.md` — 대담함은 한 곳에). 가동·방류·수신은
 * 읽히기만 하면 되는 상태 띠다.
 */
export const RIBBON_SCORE_HEIGHT = 96;
export const RIBBON_STRIP_HEIGHT = 14;

/**
 * 격자 행 높이.
 *
 * **행을 명시적으로 정의해야 오버레이가 전 행을 덮는다.**
 *
 * `grid-row: 1 / -1`의 `-1`은 **명시 격자**의 마지막 선을 가리킨다. `grid-template-rows`가
 * 없으면 명시 격자에 행 선이 하나뿐이라 `-1`이 1번 선으로 풀리고, 시작과 끝이 같아져
 * `span 1`로 떨어진다 — 오버레이가 첫 행만 덮어 격자선·커서·마우스가 상태 띠에 닿지
 * 않았다. 클래스는 생성돼 있었고 값도 맞았다. 격자 정의가 없던 것이 원인이다.
 *
 * 눈금 줄은 뺀다 — 격자선과 커서가 시간 눈금 위까지 내려올 이유가 없다.
 */
const TRACK_ROWS = [
  `${RIBBON_SCORE_HEIGHT}px`,
  'auto', // 분석값과 상태 띠를 가르는 선
  `${RIBBON_STRIP_HEIGHT}px`,
  `${RIBBON_STRIP_HEIGHT}px`,
  `${RIBBON_STRIP_HEIGHT}px`,
] as const;

export const RIBBON_GRID_ROWS = [...TRACK_ROWS, 'auto'].join(' ');

/**
 * 행 사이 간격.
 *
 * **0이면 12px 띠 세 줄이 한 덩어리로 보인다** — 실제로 그렇게 붙어 라벨까지 뭉쳤다.
 * 띠마다 경계가 보여야 "가동은 이어지고 방류만 끊겼다"가 읽힌다.
 */
export const RIBBON_ROW_GAP = 4;

/** 오버레이가 덮는 행 범위. 행을 더하거나 빼면 `TRACK_ROWS` 하나만 고치면 된다 */
export const RIBBON_OVERLAY_ROW = `1 / ${TRACK_ROWS.length + 1}`;

/** 이상 점수 행 좌측에 적는 눈금. 구간 경계에서 파생시킨다 */
export const RIBBON_SCORE_TICKS = [100, 80, 70, 50, 0] as const;

/**
 * 커서 툴팁을 트랙 가장자리에서 뒤집는 지점(%).
 *
 * 가운데 정렬만 하면 양 끝에서 툴팁이 트랙 밖으로 나간다. 왼쪽 끝에서는 왼쪽 맞춤,
 * 오른쪽 끝에서는 오른쪽 맞춤으로 바꾼다 — 지도 핀 툴팁과 같은 처리다.
 */
export const RIBBON_TOOLTIP_EDGE_PERCENT = 18;

/** 세로 격자·눈금 간격 */
export const RIBBON_TICK_HOURS = 6;

/** 라벨 칸 폭. 가장 긴 라벨 `이상 점수`(11px 한글 4자 + 공백)가 들어가야 한다 */
export const RIBBON_LABEL_WIDTH = 64;
