import { PROVISIONAL_ANOMALY_BANDS } from '@/shared/config/provisional';

/**
 * **상태 띠 셋(가동·방류·수신)이 걷혔다** `[사용자 요청 2026-09-08]`.
 *
 * 이 파일이 갖고 있던 값의 절반이 그 띠의 것이었다 — 채움(`RIBBON_FILL`·`RIBBON_STRIP_FILL`),
 * 행 높이·격자 행·오버레이 범위(`RIBBON_GRID_ROWS`·`RIBBON_OVERLAY_ROW`), 라벨 칸 폭, 손으로
 * 짠 커서의 툴팁 간격. 행이 하나가 되면서 그 전부가 필요 없어졌고 차트는 Recharts로 옮겼다
 * (**P9**) — 남은 것은 **계열을 어떻게 솎고 어떻게 그리는가**뿐이다.
 *
 * 지운 값을 여기 주석으로 남기지 않는다. git이 갖고 있고, 되살릴 근거는
 * `docs/specs/screens/SCR-AD-003-자사현황.md` §3.1이 뒤집힌 이유와 함께 적어 두었다.
 */

/**
 * 점수 계열을 솎는 **버킷 길이(분)** `[사용자 지적 2026-09-08]`.
 *
 * **표본 수가 아니라 분으로 적는다**(`[INC-111]`의 교훈) — 수집 주기가 바뀌면 박아 둔
 * 표본 수가 조용히 다른 시간을 뜻하게 된다. 6분이면 1440점이 240점이 되어 970px에서
 * 점당 4px이다: 잡음이 사라지면서 봉우리 하나하나는 그대로 남는 지점이다.
 */
export const RIBBON_SCORE_BUCKET_MINUTES = 6;

/**
 * 대체 표 한 행이 담는 구간(분).
 *
 * 24시간을 1시간마다 한 행으로 접으면 24행이다 — 이상 탐지 타임라인이 쓰는 것과 같은 값이고
 * 같은 이유다(「288행을 읽히면 안 된다」). **여기도 분으로 적는다**(`[INC-111]`).
 */
export const RIBBON_TABLE_ROW_MINUTES = 60;

/**
 * 차트 높이(px).
 *
 * 96px이던 것을 올렸다 `[사용자 요청 2026-09-08]`. 그 값은 **네 행이 한 카드에 들어가야
 * 했을 때**의 것이다 — 점수에 무게를 주면서도 아래 띠 셋의 자리를 남겨야 해서 눌러 둔
 * 높이였고, 0~100 눈금을 다 적을 수 없어 끝값 둘만 적었다. 행이 하나가 된 지금은 이 그림이
 * 카드의 주인공이라 구간 경계가 눈금으로 읽힐 만큼 열어 준다.
 */
export const RIBBON_CHART_HEIGHT = 220;

/**
 * 배경에서 **선으로 내린 구간 경계.**
 *
 * `PROVISIONAL_ANOMALY_BANDS`에서 파생시킨다 — 화면에 숫자를 박으면 경계를 바꿀 때 한쪽만
 * 바뀌어 조용히 어긋난다. 첫 구간의 하한(0)은 축의 바닥이라 뺀다.
 */
export const RIBBON_THRESHOLD_LINES = PROVISIONAL_ANOMALY_BANDS.map((band) => band.min).filter(
  (min) => min > 0,
);

/**
 * 위험 구간을 덮는 농도 `[사용자 요청 2026-09-08: 기존 룩을 청산]`.
 *
 * **넷을 다 깔던 것을 하나로 줄였다.** 96px에 파스텔 네 줄을 깔면 점수가 20~40에 사는 하루
 * 에서도 면적의 대부분이 색인데, 그 색은 데이터가 가 본 적 없는 높이를 칠한다 — 선과 면이
 * 그 위에 잠겼다. 지금은 경계를 파선으로만 긋고 **위험 구간만** 덮어 «저 위로 올라가면 안
 * 된다»가 형태로 남는다.
 *
 * 토큰(`--band-critical`)을 그대로 쓰지 않고 더 누른다 — 그 값은 배경 위 단독으로 쓰일 때의
 * 농도이고, 여기서는 곡선·면·파선이 같은 자리를 지난다.
 */
export const DANGER_ZONE_OPACITY = 0.4;

/**
 * SVG `<defs>`의 id. 문서 전역이라 한 화면에 리본이 하나뿐임을 전제한다 —
 * 사업장 상세는 리본을 한 장만 그린다(여러 장이 생기면 `useId`로 바꾼다).
 */
export const RIBBON_AREA_GRADIENT_ID = 'ribbon-score-area';
export const OUTAGE_PATTERN_ID = 'ribbon-outage-hatch';
