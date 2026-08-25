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

/**
 * 격자 칸의 채움 — **같은 색의 그라데이션, 투명도로 눌러서** `[사용자 지시 2026-08-24]`.
 *
 * 위아래 농도가 갈리면 칸이 면 위에 얹힌 조각으로 읽힌다(단색 120칸은 색종이처럼 납작했다).
 * 다만 계열색을 **그대로 쓰면 너무 쨍하다** — 진한 파란 칸 120개가 격자를 색벽으로 만들어
 * 그 위의 이상 글리프와 아래 방지시설 줄이 묻혔다.
 *
 * 그래서 **끝점을 `transparent`로 두고 농도를 48%→26%까지 내렸다** `[사용자 지시 2026-08-25:
 * 좀 더 빼도 좋다]`. 투명이라 홈 면(`--surface-2`)이 비쳐 색이 가라앉고, 어떤 면 위에 놓든
 * 그 면과 섞인다 — `--surface`로 섞던 값은 홈 위에서 실제보다 밝게 어긋났다.
 *
 * **연하게 가면서 무엇을 내주는지 적어 둔다.** 홈 위에서 가동 위쪽 2.35:1 · 아래쪽 1.54:1이고
 * 미가동(1.09:1)과는 2.16:1 / 1.41:1이다 — 칸의 **위쪽 절반**이 구분을 맡고 아래쪽은 장식이다.
 * 20px 높이에서는 위쪽 띠가 먼저 읽히므로 성립한다. 세 번에 걸쳐 내린 값이며(100→72→58→48)
 * 여기가 하한이다: 더 내리면 위쪽마저 2:1 밑으로 떨어져 칸이 홈과 붙는다.
 *
 * **일간 운전 리본의 상태 띠도 이 값을 쓴다** `[사용자 지시 2026-08-25]` — 같은 운전 상태
 * 축이라 한쪽만 진한 단색이면 두 화면이 같은 사실을 다르게 말한다. 단색(`OPERATING_FILL`)은
 * **범례 점과 판독줄**이 계속 쓴다 — 2px 점에 그라데이션을 주면 그냥 흐린 점이 된다.
 */
export const OPERATING_GRADIENT: Record<OperatingState, string> = {
  on: 'linear-gradient(to bottom, color-mix(in srgb, var(--actual) 48%, transparent), color-mix(in srgb, var(--actual) 26%, transparent))',
  off: 'linear-gradient(to bottom, color-mix(in srgb, var(--surface-3) 86%, transparent), color-mix(in srgb, var(--surface-3) 52%, transparent))',
  unknown:
    'linear-gradient(to bottom, color-mix(in srgb, var(--missing) 46%, transparent), color-mix(in srgb, var(--missing) 26%, transparent))',
};

/**
 * **이상 신호가 걸린 칸은 상태 위험색으로 칠한다** `[사용자 지시 2026-08-24]`.
 *
 * 예전에는 가동색 칸 위에 도형(▲)을 얹었다. 8px 글리프는 20px 칸에서 거의 보이지 않았고,
 * 폰트마다 크기·기준선이 달라 칸마다 다른 자리에 앉았다.
 *
 * **색이 유일한 축이 된다는 것을 알고 쓴다.** 이 격자는 칸에 라벨을 넣을 자리가 없어(E2의
 * 기록된 예외) 도형이 두 번째 축이었는데, 그것을 걷으면 남는 것은 툴팁·스크린리더 문구·범례다.
 * 가동색(블루)과 위험색은 **명도가 아니라 색상으로 갈린다**(옅게 내린 뒤 명도차는 1.1:1까지
 * 좁아졌다). 파랑과 빨강은 적록색약에서도 서로 다른 쪽으로 보이지만, **라벨을 지우고 색만
 * 남기는 방향**임을 여기 적어 둔다 — 되돌릴 근거가 필요하면 이 주석이 그 자리다.
 */
export const OPERATING_ANOMALY_GRADIENT =
  'linear-gradient(to bottom, color-mix(in srgb, var(--critical) 56%, transparent), color-mix(in srgb, var(--critical) 30%, transparent))';

/**
 * 칸 위쪽의 얇은 하이라이트. 조각의 윗면이 빛을 받는 것처럼 보인다.
 * 칸이 옅어진 만큼 함께 내렸다(38%→28%) — 옅은 칸에 센 하이라이트를 얹으면 위쪽만 하얗게 뜬다.
 */
export const OPERATING_CELL_HIGHLIGHT =
  'inset 0 1px 0 color-mix(in srgb, var(--surface) 28%, transparent)';

/** 모름은 옅게 둔다 — 아는 값과 같은 무게로 칠하면 공백이 사실처럼 읽힌다(E4) */
export const OPERATING_UNKNOWN_OPACITY = 0.45;
