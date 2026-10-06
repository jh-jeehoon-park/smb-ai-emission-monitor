// @vitest-environment jsdom
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DISCHARGE_LIMITS } from '@/shared/config/discharge-limits';
import { getMeasurementSeries } from '@/entities/measurement';
import { WaterQualityGrid } from './water-quality-grid';

/**
 * **끝에서 끝까지 — 카드 어디에 올려도 툴팁이 뜬다** `[사용자 지적 2026-09-07]`.
 *
 * 앞선 검사들은 조각을 본다(자르는 셈 · 중계 배선 · Recharts의 성질). 여기서는 **실제
 * 격자**를 띄워 그 셋이 이어 붙는지를 본다 — 하나만 어긋나도 화면에서는 «뜨문뜨문»으로만
 * 보이고 어느 조각이 틀렸는지 알 수 없다.
 *
 * jsdom에는 배치가 없어 `ResponsiveContainer`가 0×0으로 굳는다. 관측기와 상자 크기를 세워
 * 차트가 자기 크기를 아는 상태로 만든다.
 */
const W = 200;
const H = 40;

/* 전역을 바꾸므로 원래 것을 들고 있다가 되돌린다 — 이 파일에 검사가 늘어도 안전하게 */
const realRect = Element.prototype.getBoundingClientRect;
const realObserver = window.ResizeObserver;

beforeEach(() => {
  vi.useFakeTimers();

  class SizedObserver {
    constructor(private readonly cb: ResizeObserverCallback) {}
    observe() {
      this.cb([{ contentRect: { width: W, height: H } } as ResizeObserverEntry], this as never);
    }
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = SizedObserver as never;

  Element.prototype.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      right: W,
      bottom: H,
      width: W,
      height: H,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
});

afterEach(() => {
  vi.useRealTimers();
  Element.prototype.getBoundingClientRect = realRect;
  window.ResizeObserver = realObserver;
});

/** jsdom의 `requestAnimationFrame`은 타이머로 돈다 */
const FRAME_MS = 20;

function draw() {
  const view = render(
    <WaterQualityGrid
      data={getMeasurementSeries('S-02')}
      sections={[{ codes: ['pH'] }]}
      limits={DISCHARGE_LIMITS}
      windowHours={24}
    />,
  );

  const card = view.container.querySelector('.rounded-nested.bg-surface-2') as HTMLElement;
  expect(card, '카드를 찾지 못했다 — 클래스가 바뀌었나').toBeTruthy();
  expect(view.container.querySelector('.recharts-wrapper'), '차트가 그려지지 않았다').toBeTruthy();

  return {
    /** 카드 위 한 점에 포인터를 둔다. **차트 상자가 아니라 카드다** */
    hover(clientX: number) {
      act(() => {
        card.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX }));
      });
    },
    frame() {
      act(() => {
        vi.advanceTimersByTime(FRAME_MS);
      });
    },
    leave() {
      act(() => {
        card.dispatchEvent(
          new PointerEvent('pointerout', { bubbles: true, relatedTarget: document.body }),
        );
      });
    },
    /**
     * 툴팁이 **그 항목의 값을 들고** 떠 있는가.
     *
     * 껍데기(`.recharts-tooltip-wrapper`)는 꺼져 있어도 늘 DOM에 있으므로 존재로 세지
     * 않는다 — 항목 이름이 들어왔는지를 본다.
     */
    get tip(): boolean {
      const box = view.container.querySelector('.recharts-tooltip-wrapper');
      return box?.textContent?.includes('수소이온농도') === true;
    },
    unmount: view.unmount,
  };
}

describe('계측 격자 — 카드 전체가 hover 면이다', () => {
  it('스파크라인이 아니라 카드에 올려도 툴팁이 뜬다', () => {
    const grid = draw();

    expect(grid.tip, '올리기 전에는 떠 있으면 안 된다').toBe(false);

    grid.hover(W / 2);
    grid.frame();

    expect(grid.tip).toBe(true);
    grid.unmount();
  });

  /**
   * **여백에 떨어지면 툴팁이 꺼진다** — 상자 기준으로 자르던 판본이 그랬다. 카드가 차트보다
   * 넓어 양쪽 8px씩을 늘 지나므로 실제로 자주 밟혔다.
   */
  it.each([0, 1, W - 1, W])('차트 좌우 끝(%s)에서도 뜬다', (x) => {
    const grid = draw();

    grid.hover(x);
    grid.frame();

    expect(grid.tip).toBe(true);
    grid.unmount();
  });

  /** 카드를 떠나면 꺼진다 — `active={false}`가 내부 상태와 무관하게 이긴다 */
  it('카드를 떠나면 꺼진다', () => {
    const grid = draw();

    grid.hover(W / 2);
    grid.frame();
    expect(grid.tip).toBe(true);

    grid.leave();
    expect(grid.tip).toBe(false);
    grid.unmount();
  });
});
