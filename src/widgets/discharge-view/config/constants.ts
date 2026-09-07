import { MEASUREMENT_ITEMS } from '@/shared/config/measurement';

/**
 * 누적 배출량의 표시 자릿수.
 *
 * 유량이 `m³/day` 정수라 5분치 몫은 소수점 아래에서 쌓인다 — 정수로 반올림하면 이른 아침에
 * `0 m³`이 한참 이어져 **안 내보낸 것으로 읽힌다**. 한 자리면 첫 표본부터 값이 움직인다.
 *
 * 계측 항목이 아니라 파생값이라 `PROVISIONAL_DECIMALS`가 아니라 여기 둔다 — 그쪽은 항목별
 * 센서 정확도에서 온 값이고 이것은 표시 규칙이다.
 */
export const VOLUME_DECIMALS = 1;

/**
 * 차트 높이(px).
 *
 * **스켈레톤·빈 상태·실제 차트 셋이 같은 값을 봐야 한다** `[사용자 지적 2026-09-07]`. 세
 * 자리에 숫자를 박아 두면 한 곳만 바뀌어도 값이 도착할 때 카드 높이가 튄다 — 스켈레톤이
 * 없애려던 바로 그 점프를 스켈레톤이 만든다.
 *
 * 흐름 차트가 더 높은 이유는 전폭이라서다. 아래 둘은 나란히 놓여 각자 절반 폭이다.
 */
export const FLOW_CHART_HEIGHT = 240;
export const SIDE_CHART_HEIGHT = 200;

/**
 * 타일 넷의 제목. **스켈레톤이 이 순서를 그대로 쓴다** — 순서는 읽는 차례이고
 * (내보내고 있나 → 얼마나 → 수조는 → 오늘 합쳐서) 값이 도착할 때 자리가 바뀌면 안 된다.
 *
 * 수위는 **항목 사전에서 읽는다.** 화면이 쓰는 것도 `MEASUREMENT_ITEMS.level.label`이라,
 * 여기 글자로 박으면 사전이 바뀔 때 스켈레톤만 옛 이름을 남긴다(**E1**).
 */
export const TILE_LABELS = [
  '방류 상태',
  '실시간 배출 유량',
  MEASUREMENT_ITEMS.level.label,
  '금일 누적 배출량',
];
