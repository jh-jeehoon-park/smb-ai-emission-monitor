import { TIMELINE_POINT_COUNT } from '@/shared/lib/timeline';
import { CHART_TOOLTIP_MIN_WIDTH_PX } from '@/shared/ui/chart-tooltip';
import { RIBBON_TOOLTIP_GAP_PX } from '../config/constants';

/** 커서를 기준으로 툴팁이 앉는 쪽 */
export type TooltipSide = 'right' | 'left';

/**
 * 툴팁을 커서의 **어느 쪽**에 둘 것인가.
 *
 * **커서를 덮지 않는 것이 목적이다** `[사용자 지적 2026-09-07]`. 예전에는 `translateX(-50%)`로
 * 커서에 정중앙 정렬해 두어, 상자가 **마우스 포인터와 그 자리의 값을 함께 가렸다** —
 * 값을 보려고 올렸는데 그 값이 상자 밑에 들어갔다.
 *
 * 기본은 **오른쪽**이다. 읽는 방향과 같아 커서에서 눈이 자연스럽게 넘어간다.
 * 오른쪽에 상자가 들어갈 자리가 없으면 왼쪽으로 뒤집는다 — 트랙 밖으로 나가면 카드에 잘린다.
 *
 * **퍼센트로 어림잡지 않고 px로 잰다.** 한때 «가장자리 18% 안이면 뒤집는다»는 상수를 썼는데,
 * 그 임계는 트랙이 넓을 때와 좁을 때 뜻이 달라진다(140px이 1500px 트랙에서는 9%, 600px에서는
 * 23%다). 마우스를 재는 자리가 이미 트랙 폭을 손에 들고 있으므로 그것을 그대로 쓴다.
 */
export function tooltipSideAt(index: number, trackWidth: number): TooltipSide {
  const cursorX = (index / TIMELINE_POINT_COUNT) * trackWidth;
  const roomRight = trackWidth - cursorX;

  return roomRight >= CHART_TOOLTIP_MIN_WIDTH_PX + RIBBON_TOOLTIP_GAP_PX ? 'right' : 'left';
}

/**
 * 그쪽에 앉히는 `transform`.
 *
 * 커서 자리(`left`)에서 간격만큼 밀거나, 상자 폭 + 간격만큼 당긴다. 상자 폭을 모르는 채로
 * 당길 수 있는 것은 `translateX`의 `%`가 **자기 폭 기준**이기 때문이다.
 */
export function tooltipTransform(side: TooltipSide): string {
  return side === 'right'
    ? `translateX(${RIBBON_TOOLTIP_GAP_PX}px)`
    : `translateX(calc(-100% - ${RIBBON_TOOLTIP_GAP_PX}px))`;
}
