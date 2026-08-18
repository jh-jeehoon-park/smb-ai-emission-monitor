/**
 * 상시 라벨을 다는 시도.
 *
 * 도형에 내접하는 가장 큰 원의 지름이 라벨 글자 폭보다 넉넉한 곳만 골랐다.
 * 광역시 8곳(서울·부산·대구·인천·광주·대전·울산·세종)은 도형이 글자보다 작아
 * 라벨을 얹으면 반드시 이웃 위로 넘친다 — 이들은 hover 했을 때만 이름을 보인다.
 *
 * 기하로 고른 결과가 행정 구분(도 9곳)과 정확히 일치했다.
 */
export const ALWAYS_LABELED_PROVINCES = new Set([
  '강원도',
  '경기도',
  '충청남도',
  '전라북도',
  '전라남도',
  '경상남도',
  '경상북도',
  '제주특별자치도',
  '충청북도',
]);

/**
 * 시도 라벨 크기(뷰박스 단위).
 *
 * 지도 위 글자의 **읽기 하한**을 정하는 값이다 — 지도 높이 하한 400px에서 8px로
 * 그려지고, 그 아래로는 읽히지 않는다(site-map.tsx의 높이 주석). 툴팁도 이 값을 넘겨야
 * 한다: 툴팁이 라벨보다 작으면 지도에서 가장 중요한 글자가 가장 작아진다.
 */
export const MAP_LABEL_FONT_SIZE = 11;

/**
 * 핀 툴팁 치수 — 단위는 **뷰박스 좌표**다.
 *
 * 툴팁을 확대 변환 그룹 밖에 그리므로 배율로 나눌 필요가 없다. 대신 뷰박스가 화면에
 * 맞춰지는 비율(`meet`)만큼은 함께 작아진다 — 지도 높이가 400px까지 줄면 배율이
 * 0.73배가 된다.
 *
 * **그래서 상세 줄을 시도 라벨(11)보다 작게 잡지 않는다.** 1366x768에서 10.5로 두면
 * 8.6px로 그려져, 이미 읽기 한계로 잡아 둔 라벨(9.0px)보다 작아진다.
 */
export const TOOLTIP_TITLE_SIZE = 13;
export const TOOLTIP_DETAIL_SIZE = MAP_LABEL_FONT_SIZE;
export const TOOLTIP_PADDING_X = 9;
export const TOOLTIP_PADDING_Y = 8;
export const TOOLTIP_LINE_GAP = 5;
/**
 * 핀에서 띄우는 거리.
 *
 * 변환 뒤 좌표로 재면 핀은 배율과 무관하게 늘 같은 크기다 — 반지름과 강조 링이
 * 모두 `1/k`로 그려지기 때문이다. 가장 큰 상태(선택 9 + hover 2 + 링 5 = 16)를
 * 기준으로 3만큼 더 띄운다.
 */
export const TOOLTIP_PIN_GAP = 19;
/** 뷰박스 가장자리에서 남기는 여백 */
export const TOOLTIP_EDGE_PADDING = 4;
