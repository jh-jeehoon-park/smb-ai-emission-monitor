'use client';

import { useEffect, useRef, useState } from 'react';
import type { MapFocus } from '@/shared/lib/map-view';

/** 전환 시간. 320ms는 지도가 튀는 느낌이었고 800ms는 탭을 연달아 누를 때 밀렸다 */
const DURATION_MS = 560;

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** 끝에서 부드럽게 멈춘다(ease-out cubic) — 지도는 '도착'이 읽혀야 한다 */
const easeOut = (t: number) => 1 - (1 - t) ** 3;

const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

/**
 * 지도 축척·이동을 **한 값으로 묶어 보간한다** `[사용자 지시 2026-08-24]`.
 *
 * CSS 전환으로는 부족했다. 그룹의 `transform`만 미끄러지고, 그 배율로 되돌려 그리는
 * 라벨 글자 크기·핀 반지름·툴팁 좌표는 전환 대상이 아니어서 한 프레임에 툭 바뀐다 —
 * 도형은 흐르는데 글자만 점프해 "화면이 확 바뀐다"로 읽혔다.
 *
 * 세 값을 함께 보간해 상태로 내보내면 **모든 파생값이 같은 프레임의 배율**을 쓴다.
 * 프레임마다 렌더가 한 번 돌지만 그리는 것은 시도 17개 + 핀 10개뿐이다.
 *
 * 감속 설정에서는 보간하지 않고 바로 도착한다 — 시간만 0으로 두는 `CountUp`과 같은 방식이며,
 * 마크업은 모두에게 같게 나가므로 hydration이 어긋나지 않는다.
 */
export function useAnimatedFocus(target: MapFocus): MapFocus {
  const [current, setCurrent] = useState(target);

  /*
   * 지금 화면에 있는 값. 전환을 시작할 때 **출발점**으로 쓴다.
   * 렌더 중에 ref를 쓰면 안 되므로(React는 렌더를 순수하게 본다) 커밋된 뒤 effect에서 적는다 —
   * 목표가 바뀌는 시점에는 마지막으로 그린 값이 들어 있다.
   */
  const latest = useRef(target);
  useEffect(() => {
    latest.current = current;
  }, [current]);

  useEffect(() => {
    const from = latest.current;
    if (
      from.scale === target.scale &&
      from.translateX === target.translateX &&
      from.translateY === target.translateY
    ) {
      return;
    }

    /*
     * 감속 설정이면 시간만 0으로 둔다 — 첫 프레임에 목표로 앉는다.
     * effect 안에서 곧바로 `setState`를 부르지 않는 이유이기도 하다(연쇄 렌더 경고).
     */
    const duration = window.matchMedia(REDUCED_MOTION_QUERY).matches ? 0 : DURATION_MS;

    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const t = duration <= 0 ? 1 : Math.min(1, (now - start) / duration);
      const e = easeOut(t);
      setCurrent({
        scale: lerp(from.scale, target.scale, e),
        translateX: lerp(from.translateX, target.translateX, e),
        translateY: lerp(from.translateY, target.translateY, e),
      });
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return current;
}
