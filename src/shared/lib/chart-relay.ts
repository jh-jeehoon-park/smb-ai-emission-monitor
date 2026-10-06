/** 차트 상자의 화면 위 자리. `DOMRect`에서 필요한 넷만 받는다 */
export interface ChartBox {
  left: number;
  right: number;
  top: number;
  height: number;
}

/** 상자에서 플롯을 뺀 여백. Recharts `<AreaChart margin>`과 **같은 값이어야 한다** */
export interface ChartMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface RelayPoint {
  clientX: number;
  clientY: number;
}

/**
 * 카드 위 포인터를 **플롯 안의 한 점으로 옮긴다.**
 *
 * Recharts는 포인터가 플롯 안에 있을 때만 축 툴팁을 켠다(`isInCartesianRange`). 계측 격자의
 * 스파크라인은 40px이고 카드는 140px이라, 툴팁이 뜨는 자리가 카드의 **29%**뿐이었다 —
 * 값·라벨·기준을 읽다가 얇은 띠에 조준해야 했다 `[사용자 지적 2026-09-07]`.
 *
 * 그래서 **가로만 카드에서 받고 세로는 플롯 한가운데로 박는다.** 어느 시점을 보는지는 x가
 * 정하고 y는 뜻이 없다(계열이 하나다).
 *
 * **상자가 아니라 플롯으로 자른다.** 처음에는 상자 기준으로 잘랐는데, 여백만큼(각 2px)이
 * 플롯 밖이라 거기 떨어진 포인터가 **툴팁을 끄는 쪽으로** 갔다 — 범위를 벗어나면 미들웨어가
 * `mouseLeaveChart()`를 부르기 때문에 «아무 일도 없음»이 아니라 «꺼짐»이다. 카드가 차트보다
 * 넓어(여백 12px, 차트가 `-mx-1`) **양쪽 8px씩을 늘 지나므로** 실제로 자주 밟혔다.
 *
 * 경계는 **닫힌 구간**이다 — 실측으로 폭 200·여백 2에서 `x=2`와 `x=198`이 켜지고 `1`·`199`가
 * 꺼졌다(`isInCartesianRange`가 `<=`로 비교한다).
 *
 * 플롯이 남지 않으면(`null`) 아직 그려지지 않은 것이다 — 그때는 옮길 자리가 없다.
 */
export function chartRelayPoint(
  clientX: number,
  box: ChartBox,
  margin: ChartMargin,
): RelayPoint | null {
  const left = box.left + margin.left;
  const right = box.right - margin.right;
  const top = box.top + margin.top;
  const bottom = box.top + box.height - margin.bottom;

  if (right <= left || bottom <= top) return null;

  return {
    clientX: Math.min(Math.max(clientX, left), right),
    clientY: (top + bottom) / 2,
  };
}
