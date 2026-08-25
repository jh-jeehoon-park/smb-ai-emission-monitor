'use client';

import { useState } from 'react';

/**
 * 차트 툴팁을 **포인터가 차트 안에 있을 때만** 살려 둔다 `[사용자 지시 2026-08-24]`.
 *
 * Recharts는 마우스가 차트를 벗어나면 hover 플래그를 지우지만, 그 하나로는 툴팁이 남는
 * 경로가 있다 — 포커스·클릭·터치로 켜진 상태는 `mouseleave`가 지우지 않고(`tooltipSlice`의
 * `mouseLeaveChart`가 hover 플래그만 지운다), 포인터가 창 밖이나 겹친 요소로 빠지면
 * 이벤트 자체가 오지 않는다. 실제로 그래프 밖으로 나와도 툴팁이 떠 있었다.
 *
 * `<Tooltip active={false}>`는 **어떤 내부 상태와도 무관하게** 툴팁을 끈다. 그래서 우리가
 * 포인터 위치를 들고 있고, 밖이면 그것을 넘긴다. `undefined`를 넘기면 Recharts 기본 동작이다.
 *
 * `pointer*` 이벤트를 쓰는 이유: 마우스·펜·터치를 한 벌로 받고 `pointercancel`까지 잡는다.
 */
export function useChartHover() {
  const [inside, setInside] = useState(false);

  return {
    /** 차트를 감싼 요소에 펼친다 */
    hoverProps: {
      onPointerEnter: () => setInside(true),
      onPointerMove: () => setInside(true),
      onPointerLeave: () => setInside(false),
      onPointerCancel: () => setInside(false),
    },
    /** `<Tooltip active={...}>`에 그대로 넘긴다 */
    tooltipActive: inside ? undefined : (false as const),
  };
}
