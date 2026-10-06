// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { MapFocus } from '@/shared/lib/map-view';
import { useAnimatedFocus } from './use-animated-focus';

/**
 * **보간은 두 끝 사이를 벗어나면 안 된다.**
 *
 * `t`에 상한(`Math.min(1, …)`)만 있고 하한이 없던 판본은, 프레임 시각이 출발 시각보다
 * **앞설 때** 음수 `t`를 그대로 `easeOut`에 넘겼다 — `1 - (1 - t)³`가 그것을 −2 언저리까지
 * 키워 `lerp`가 범위 밖으로 나간다. 실제로 jsdom에서 지도 축척이 **−0.49**가 나왔고,
 * 배율이 음수면 지도가 뒤집힌다.
 *
 * 두 시각의 기준이 어긋날 수 있다는 것은 환경의 사정이라 코드가 막을 수 없다. 막을 수 있는
 * 것은 **그 값이 새어 나가는 것**이다.
 */
const WIDE: MapFocus = { scale: 1, translateX: 0, translateY: 0 };
const NARROW: MapFocus = { scale: 2, translateX: -40, translateY: -60 };

/** 프레임을 손으로 돌린다 — jsdom의 16ms 타이머에 맡기면 언제 몇 번 도는지 알 수 없다 */
function captureFrames() {
  const realRequest = window.requestAnimationFrame;
  const realCancel = window.cancelAnimationFrame;
  const queue: FrameRequestCallback[] = [];

  window.requestAnimationFrame = ((cb: FrameRequestCallback) =>
    queue.push(cb)) as typeof window.requestAnimationFrame;
  window.cancelAnimationFrame = (() => {}) as typeof window.cancelAnimationFrame;

  return {
    /** 대기 중인 첫 프레임을 주어진 시각으로 돌린다 */
    run(now: number) {
      const cb = queue.shift();
      if (cb) act(() => cb(now));
    },
    restore() {
      window.requestAnimationFrame = realRequest;
      window.cancelAnimationFrame = realCancel;
    },
  };
}

let frames: ReturnType<typeof captureFrames> | null = null;
afterEach(() => {
  frames?.restore();
  frames = null;
});

describe('지도 축척 보간', () => {
  it('프레임 시각이 출발보다 앞서도 두 끝 사이에 머문다', () => {
    frames = captureFrames();

    const { result, rerender } = renderHook(({ target }) => useAnimatedFocus(target), {
      initialProps: { target: WIDE },
    });
    expect(result.current.scale).toBe(WIDE.scale);

    rerender({ target: NARROW });
    /* 0은 페이지가 열린 순간이라 `performance.now()`가 읽은 출발 시각보다 반드시 앞선다 */
    frames.run(0);

    expect(result.current.scale).toBeGreaterThanOrEqual(WIDE.scale);
    expect(result.current.scale).toBeLessThanOrEqual(NARROW.scale);
    expect(result.current.translateY).toBeLessThanOrEqual(WIDE.translateY);
    expect(result.current.translateY).toBeGreaterThanOrEqual(NARROW.translateY);
  });

  it('프레임이 충분히 지나면 목표에 정확히 앉는다', () => {
    frames = captureFrames();

    const { result, rerender } = renderHook(({ target }) => useAnimatedFocus(target), {
      initialProps: { target: WIDE },
    });
    rerender({ target: NARROW });
    /* 보간 시간(560ms)을 훌쩍 넘긴 시각 — 상한 클램프가 `t`를 1로 자른다 */
    frames.run(performance.now() + 10_000);

    expect(result.current).toEqual(NARROW);
  });
});
