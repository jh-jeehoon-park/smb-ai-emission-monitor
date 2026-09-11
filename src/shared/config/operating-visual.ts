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
 * 같은 축의 **글자**. 색과 한 파일에 두어 한쪽만 바뀌지 않게 한다(`code-organization` §3 #5).
 *
 * **`모름`을 `정지`라 적지 않는다** — 통신이 끊긴 것과 설비가 멈춘 것은 다른 사실이고,
 * 섞으면 없는 정지를 주장하게 된다(**E4**).
 */
export const OPERATING_LABELS: Record<OperatingState, string> = {
  on: '가동',
  off: '정지',
  unknown: '모름',
};

/** `Equipment.running`을 이 축의 키로. `null`은 정지가 아니라 모름이다(E4) */
export function operatingStateOf(running: boolean | null): OperatingState {
  if (running === null) return 'unknown';
  return running ? 'on' : 'off';
}

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
  /*
   * **`--surface-3`에서 `--border-strong`으로 올렸다** `[사용자 지적 2026-09-08]`.
   *
   * 어느 면 위에 놓아도 **1.09:1**이라(위 주석이 스스로 적어 둔 값) «아는 꺼짐»이 **빈 자리**로
   * 보였다 — 계측 서버가 하루 종일 전류 0을 보내는 사업장(S-09)에서 일간 운전의 가동 행이
   * 통째로 비어 «값이 없다»로 읽혔다. **정지는 결측이 아니다**(**E4**): 결측은 빗금이고
   * 정지는 채움이어야 하는데, 그 채움이 안 보이면 둘의 구분이 화면에서 사라진다.
   *
   * 면 색(`--surface-*`)을 쓰던 것이 원인이다 — 면 위에 면을 얹으면 같은 계열끼리 붙는다.
   * `--border-strong`은 **선**의 색이라 면과 갈리도록 만들어진 값이고, 그만큼 올라온다.
   * 상태 등급 색은 여전히 쓰지 않는다(이 축은 등급이 아니다).
   */
  off: 'linear-gradient(to bottom, color-mix(in srgb, var(--border-strong) 100%, transparent), color-mix(in srgb, var(--border-strong) 68%, transparent))',
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

/**
 * **모른다는 것을 형태로 말한다** — 45도 빗금.
 *
 * 채움 농도만으로 가르면 «옅은 파랑»과 «옅은 회색»이 되어 색맹·인쇄·작은 높이에서 붙는다.
 * 빗금은 색이 아니라 **질감**이라 그 셋 어디서도 살아남고, 결측 구간이 여러 줄에 걸쳐 있을 때
 * 세로로 한 줄기로 이어져 «그 시각은 전부 몰랐다»가 한눈에 읽힌다.
 *
 * 설비 상태 격자(SCR-OP-005)가 먼저 쓰고 일간 운전 리본(SCR-AD-003)이 따라 쓴다 —
 * 두 화면이 같은 «모름»을 다른 표기로 칠하면 같은 사실로 보이지 않는다
 * (`code-organization.rule.md` §3 배치원칙 3).
 */
export const MISSING_HATCH = `repeating-linear-gradient(45deg, var(--missing) 0 2px, transparent 2px 5px)`;

/**
 * **같은 빗금의 SVG 표기.**
 *
 * 위 `MISSING_HATCH`는 `repeating-linear-gradient`라 **DOM 전용**이다 — SVG `fill`은 CSS
 * 그라데이션을 받지 않아 `<pattern>`을 거쳐야 한다. 물의 단면(SCR-AD-005)이 슬러지층·알약
 * 배경을 SVG 안에서 칠하면서 두 번째 표기가 필요해졌다.
 *
 * **기하를 여기 한 곳에 둔다.** 두 표기가 갈리면 같은 «모름»이 화면마다 다른 결로 보인다 —
 * DOM 쪽은 2px/5px 45도인데 SVG 쪽만 3px/6px가 되는 식이다. `operating-visual.test.ts`가
 * 위 문자열에서 숫자를 뽑아 이 값과 대조한다.
 *
 * `<pattern>` 요소 자체는 쓰는 화면의 `<defs>`가 이 값으로 그린다 — 설정 파일에 마크업을
 * 두지 않는다(`code-organization.rule.md` §3).
 */
export const MISSING_HATCH_PATTERN = {
  /** `fill="url(#…)"`가 가리키는 id. 한 문서에 한 번만 그린다 */
  id: 'missing-hatch',
  /** 빗금 한 줄기의 굵기(px) */
  stripe: 2,
  /** 줄기 사이 주기(px) — 타일 한 변의 길이가 된다 */
  period: 5,
  /** 기울기(도) — `patternTransform="rotate(45)"` */
  angleDeg: 45,
} as const;

export const MISSING_HATCH_FILL = `url(#${MISSING_HATCH_PATTERN.id})`;
