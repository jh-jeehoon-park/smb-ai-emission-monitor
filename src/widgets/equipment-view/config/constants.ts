/** 정렬 기준을 URL에 남긴다 — 링크를 열면 같은 순서로 보인다 */
export const SORT_QUERY_KEY = 'sort';

/** 40대 전부를 늘어놓으면 우선순위가 아니라 목록이 된다. 위에서부터 볼 만큼만 남긴다 */
export const CROSS_SITE_RANK_LIMIT = 8;

/** 모달 안에 들어가는 차트다. 본문 차트와 같은 높이를 쓰면 모달이 화면을 넘긴다 */
export const RUL_CHART_HEIGHT = 168;

/** 대체 표에 300행을 담으면 아무도 끝까지 읽지 않는다. 주 단위로 솎는다 */
export const RUL_TABLE_SAMPLE_EVERY = 7;

/** 격자 한 칸의 최소 너비(px). 24칸 × 이 값보다 좁아지면 가로 스크롤로 넘긴다 */
export const HEATMAP_CELL_MIN_PX = 22;

/** 격자 왼쪽 설비명 열의 너비(px). 최소 너비 계산과 열 폭이 같은 값을 봐야 어긋나지 않는다 */
export const HEATMAP_LABEL_PX = 112;

/** 눈금 간격(시간). 24칸에 다 달면 겹치고, 6시간마다면 어느 칸인지 짚기 어렵다 */
export const HEATMAP_TICK_HOURS = 3;

/**
 * 툴팁을 커서에서 얼마나 비켜 놓을지(px).
 *
 * 커서 위에 겹쳐 그리면 짚고 있는 칸을 툴팁이 가린다. 시계열 차트(Recharts)가 쓰는 방식과
 * 같다 — 커서 옆에 띄우고, 오른쪽 끝에서만 반대편으로 뒤집는다.
 */
export const HEATMAP_TOOLTIP_OFFSET_PX = 14;

/**
 * 뒤집을지 판단할 때 쓰는 툴팁 폭 어림값(px).
 *
 * 실제로 재지 않는다 — 재려면 그린 뒤 위치를 고쳐야 해서 한 프레임 깜빡인다. 껍데기의
 * 최소 폭(140px)에 여백과 가장 긴 문구를 더한 값이며, 넘쳐도 뒤집는 시점만 조금 이를 뿐이다.
 */
export const HEATMAP_TOOLTIP_WIDTH_PX = 190;
