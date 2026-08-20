/** 켜짐/꺼짐/모름 — 등급이 아니라 **운전 상태**의 축 */
export type OperatingState = 'on' | 'off' | 'unknown';

/**
 * 운전 상태별 채움.
 *
 * **새 색을 만들지 않는다.** 켜짐은 실측 계열색(`--actual`), 모름은 결측색(`--missing`),
 * 꺼짐은 중립면(`--surface-3`)이다.
 *
 * **상태 등급 색(정상·주의·경고·위험)은 이 축에 쓰지 않는다.** 이 축은 등급이 아니라
 * 켜짐/꺼짐이고, 섞으면 색이 뜻을 잃는다 — `design-system §2`가 "색은 상태를 뜻할 때만
 * 쓴다"로 시작하는 이유다. 초록으로 칠한 `가동`은 화면에서 `정상 등급`으로 읽힌다.
 *
 * 일간 운전 리본(SCR-AD-003)과 설비 상태 격자(SCR-OP-005)가 같은 값을 쓴다.
 */
export const OPERATING_FILL: Record<OperatingState, string> = {
  on: 'var(--actual)',
  off: 'var(--surface-3)',
  unknown: 'var(--missing)',
};

/** 모름은 옅게 둔다 — 아는 값과 같은 무게로 칠하면 공백이 사실처럼 읽힌다(E4) */
export const OPERATING_UNKNOWN_OPACITY = 0.45;
