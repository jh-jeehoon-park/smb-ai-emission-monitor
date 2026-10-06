'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { chartRelayPoint, type ChartMargin } from './chart-relay';

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

/** Recharts가 포인터 이벤트를 받는 요소. 이 클래스는 라이브러리가 붙인다 */
const CHART_WRAPPER = '.recharts-wrapper';

/**
 * **카드 전체를 그 차트의 hover 면으로 삼는다** `[사용자 지적 2026-09-07]`.
 *
 * `useChartHover`는 «차트를 감싼 상자» 안에서만 툴팁을 살리는데, 계측 격자에서는 그 상자가
 * 40px 스파크라인이고 카드는 140px이다 — **툴팁을 보려면 얇은 선에 조준해야 했다.**
 * Recharts는 포인터가 플롯 안에 있을 때만 축 툴팁을 켜므로(`chart-relay.ts`) 상자를 넓히지
 * 않는 한 그 조준은 사라지지 않는다.
 *
 * **포인터를 차트로 중계한다.** 카드에서 받은 x를 플롯 한가운데 y와 묶어 차트 요소에
 * `mousemove`로 그대로 흘려보낸다 — Recharts가 평소처럼 커서선·활성 점·툴팁을 그리므로
 * **보이는 것은 하나도 달라지지 않고 조준만 없어진다.**
 *
 * 네이티브 이벤트를 만들어 보내는 것은 우회다. 그러나 대안이 없다 —
 * `<Tooltip defaultIndex>`는 **마우스가 플롯에 한 번이라도 들어간 뒤에는 무시되고**
 * (`combineTooltipInteractionState`가 `hasBeenActivePreviously`를 먼저 본다) 그때부터
 * 직전 위치에 얼어붙는다. 확인하고 접었다.
 *
 * 떠날 때는 중계하지 않는다. `mouseleave`는 React가 `mouseout`에서 합성하는 것이라 그대로
 * 보내도 닿지 않고, 그 일은 `active={false}`가 이미 확실하게 한다(위 `useChartHover`).
 *
 * **한 프레임에 한 번만 보낸다.** Recharts의 기본 `throttleDelay`가 `'raf'`라, 들어온
 * `mousemove`마다 **앞서 예약해 둔 rAF를 취소하고 다시 예약한다**(`mouseEventsMiddleware`).
 * `pointermove`를 그대로 흘려보내면 프레임 경계가 지나기 전에 다음 취소가 와서 콜백이
 * 영영 돌지 못한다 — 툴팁이 **뜨문뜨문** 뜨던 원인이 그것이다 `[사용자 지적 2026-09-07]`.
 * 차트 쪽 스로틀도 함께 끈다(`throttledEvents={[]}`): 우리가 이미 프레임당 하나로 줄였으므로
 * 두 겹으로 미룰 이유가 없고, 미루는 쪽이 바로 위 경합을 만든다.
 *
 * @param margin 차트의 `margin`과 **같은 값**이어야 한다. 갈리면 중계가 플롯 밖을 가리켜
 *   툴팁을 끄는 쪽으로 떨어진다 — 그래서 부르는 쪽이 상수 하나를 둘에 함께 넘긴다
 *   (`SPARK_MARGIN`). 렌더마다 새 객체를 넘기면 `useCallback`이 헛돈다.
 */
export function useChartSurface(margin: ChartMargin) {
  const [inside, setInside] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const pointerX = useRef(0);

  const send = useCallback(() => {
    frame.current = null;

    const wrapper = chartRef.current?.querySelector(CHART_WRAPPER);
    if (!(wrapper instanceof HTMLElement)) return;

    const point = chartRelayPoint(pointerX.current, wrapper.getBoundingClientRect(), margin);
    if (point === null) return;

    wrapper.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, ...point }));
  }, [margin]);

  const relay = useCallback(
    (event: ReactPointerEvent) => {
      setInside(true);
      pointerX.current = event.clientX;
      /* 이미 예약돼 있으면 자리만 갱신한다 — 취소·재예약이 곧 위 경합이다 */
      if (frame.current === null) frame.current = requestAnimationFrame(send);
    },
    [send],
  );

  const leave = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    setInside(false);
  }, []);

  /* 떼어낸 뒤에 예약이 돌면 사라진 상자를 뒤진다. 일찍 돌아오긴 하지만 돌 이유가 없다 */
  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  return {
    /** **카드 루트**에 펼친다 — 차트 상자가 아니다 */
    surfaceProps: {
      onPointerEnter: relay,
      onPointerMove: relay,
      onPointerLeave: leave,
      onPointerCancel: leave,
    },
    /** 차트를 감싼 요소에 건다. 중계할 자리를 여기서 찾는다 */
    chartRef,
    /** `<Tooltip active={...}>`에 그대로 넘긴다 */
    tooltipActive: inside ? undefined : (false as const),
  };
}
