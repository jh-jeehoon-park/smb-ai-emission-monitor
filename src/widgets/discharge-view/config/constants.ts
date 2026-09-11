import { MEASUREMENT_ITEMS } from '@/shared/config/measurement';

/**
 * 누적 배출량의 표시 자릿수 — **`shared/config`로 올라갔다.**
 *
 * `현황판`(`SCR-AD-006`)이 같은 값을 적기 시작하면서 소비처가 둘이 됐다. 위젯끼리는 서로
 * import 할 수 없으므로(FSD §8) 복제하거나 올리거나 둘 중 하나였고, 같은 물의 양이 화면마다
 * 다른 자릿수로 보이는 것을 **E1**이 막는다. 이유는 올라간 자리에 그대로 적혀 있다.
 *
 * 여기서 다시 내보내는 이유는 이 위젯의 소비처들이 `../config/constants` 한 곳만 보게
 * 두기 위해서다 — 같은 파일에서 오던 값이 갑자기 두 경로로 갈리지 않는다.
 */
export { VOLUME_DECIMALS } from '@/shared/config/constants';

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
