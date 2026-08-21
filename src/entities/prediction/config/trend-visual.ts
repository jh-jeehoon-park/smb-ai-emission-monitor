import type { Trend } from '../model/types';

/**
 * 경향의 색·배경·형태.
 *
 * **색은 한 방향에만 쓴다.** 오염물질이 오르는 것은 나빠지는 것이니 상승에 상태색을 줄 근거가
 * 있지만, 하락에 `정상` 색을 주면 **한 카드가 두 상태를 동시에 주장**한다 — 기준을 넘긴 채
 * 내려오는 중이면 헤드라인은 `기준보다 높음`(critical)이고 칩은 초록이 되어 초록이 "괜찮다"로
 * 읽힌다. `design-system §2`가 방지시설 가동 줄에서 되돌린 것과 같은 구조다(그 줄은 등급이
 * 아니라 켜짐/꺼짐인데 초록으로 칠하니 정상 등급으로 읽혔다). 경향도 등급이 아니라 **방향**이다.
 *
 * `optimization-view`의 `증가=경고 / 감소=정상`을 선례로 끌어오지 않는다 — 그쪽은 **우리가
 * 권하는 조정량**이라 값 자체가 좋음/나쁨이고, 오염도 하락은 **관측**이며 그 값이 아직 기준
 * 위일 수 있다.
 *
 * **읽히지 않던 원인은 색이 아니라 형태였다.** 예전에는 배경 없는 12px 맨 텍스트였다
 * `[사용자 요청 2026-08-21]`. 셋 다 배경·테두리·글리프를 갖는 칩으로 만들면 색을 한 방향에만
 * 써도 세 상태가 갈린다.
 *
 * **`--warning`이 아니라 `--caution`을 쓴다.** 이 대시보드에서 `--warning`은 이상 점수 70–79
 * `경고` 등급을 뜻하고(`PROVISIONAL_ANOMALY_BANDS`) `STATUS_VISUAL.warning.glyph`가 `▲`라
 * 화살표와 글리프 체계가 겹친다.
 *
 * **글리프는 화살표다.** `●◆▲■`는 상태 등급과 알람 우선순위가 이미 쓰고 있어 겹쳐 쓰면
 * 경향 `▲`가 등급으로 읽힌다.
 *
 * **글자색은 `-ink`, 배경은 `chip`.** 마크 색(`hex`)을 글자에 쓰면 다크에서 대비가 모자라다 —
 * 알람 칩과 사이드바 배지가 실제로 3.79:1까지 떨어진 적이 있다. 알람 `PRIORITY_STYLE`과
 * 같은 형식이다.
 */
export const TREND_VISUAL: Record<Trend, { text: string; chip: string; glyph: string }> = {
  rising: {
    text: 'text-caution-ink',
    chip: 'bg-chip-caution border-caution/40',
    glyph: '↑',
  },
  /* 변화가 없다는 것은 상태가 아니다 — 가장 흐린 중립면에 둔다 */
  steady: {
    text: 'text-fg-muted',
    chip: 'bg-surface-3 border-border',
    glyph: '→',
  },
  /*
   * 하락은 상태색 없이 **진한 중립**으로 둔다. `--actual`은 차트의 실측 계열 색이라 등급
   * 팔레트에 속하지 않으면서 `유지`(`--fg-muted`)보다 진해 셋이 명도로도 갈린다.
   */
  falling: {
    text: 'text-actual',
    chip: 'bg-surface-3 border-border-strong',
    glyph: '↓',
  },
};
