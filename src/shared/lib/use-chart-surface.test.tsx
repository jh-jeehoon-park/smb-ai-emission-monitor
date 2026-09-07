// @vitest-environment jsdom
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useChartSurface } from './use-chart-hover';

/** 계측 격자 스파크라인과 같은 여백 */
const MARGIN = { top: 2, right: 2, bottom: 0, left: 2 };

/**
 * **카드 어디에 올려도 차트가 그 x를 받는다** `[사용자 지적 2026-09-07: 작은 선에 정확히
 * 맞춰야 함]`.
 *
 * jsdom에는 배치가 없어 Recharts를 실제로 그릴 수 없다 — 그래서 **중계 자체**를 본다:
 * 카드 위 포인터가 차트 요소에 `mousemove`로 닿는가, 그 좌표가 플롯 안인가. 그 둘이 서면
 * 나머지(커서선·활성 점·툴팁)는 Recharts가 평소처럼 한다.
 */
function Probe({ onRelay }: { onRelay: (e: MouseEvent) => void }) {
  const { surfaceProps, chartRef } = useChartSurface(MARGIN);

  return (
    <div data-testid="card" {...surfaceProps}>
      <p>수소이온농도 8.35</p>
      <div ref={chartRef}>
        {/* Recharts가 붙이는 클래스를 그대로 흉내 낸다 — 훅이 이 이름으로 찾는다 */}
        <div
          className="recharts-wrapper"
          data-testid="chart"
          ref={(el) => {
            if (!el) return;
            el.getBoundingClientRect = () =>
              ({ left: 120, right: 320, top: 400, height: 40 }) as DOMRect;
            el.addEventListener('mousemove', onRelay as EventListener);
          }}
        />
      </div>
    </div>
  );
}

/**
 * **한 프레임에 한 번만 나간다.** Recharts의 rAF 스로틀이 `mousemove`마다 앞선 예약을
 * 취소해, 그대로 흘려보내면 콜백이 영영 돌지 못한다(툴팁이 «뜨문뜨문» 뜨던 원인).
 * 그래서 여기서도 프레임을 흘려 줘야 중계가 나간다.
 */
function hover(card: HTMLElement, clientX: number) {
  act(() => {
    card.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX }));
  });
  act(() => {
    vi.advanceTimersByTime(FRAME_MS);
  });
}

/** jsdom의 `requestAnimationFrame`은 타이머로 돈다 */
const FRAME_MS = 20;

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useChartSurface — 카드 전체가 차트의 hover 면이다', () => {
  it('스파크라인에서 먼 자리에 올려도 차트가 그 x를 받는다', () => {
    const onRelay = vi.fn();
    const { getByTestId } = render(<Probe onRelay={onRelay} />);

    /* 카드 위쪽(값 글자 자리) — 차트 상자와 세로로 겹치지 않는 자리다 */
    hover(getByTestId('card'), 200);

    expect(onRelay).toHaveBeenCalledTimes(1);
    const relayed = onRelay.mock.calls[0]![0] as MouseEvent;
    expect(relayed.clientX).toBe(200);
    /* 세로는 플롯 한가운데 — 여기가 아니면 Recharts가 «플롯 밖»으로 보고 아무것도 켜지 않는다 */
    expect(relayed.clientY).toBe(421);
  });

  it('차트 좌우 밖에서도 끝 표본으로 잘라 넘긴다', () => {
    const onRelay = vi.fn();
    const { getByTestId } = render(<Probe onRelay={onRelay} />);

    hover(getByTestId('card'), 40);

    expect((onRelay.mock.calls[0]![0] as MouseEvent).clientX).toBe(122);
  });

  /** 차트가 아직 없으면 조용히 아무 일도 하지 않는다 — 던지면 카드가 통째로 죽는다 */
  it('차트를 찾지 못해도 터지지 않는다', () => {
    function Bare() {
      const { surfaceProps } = useChartSurface(MARGIN);
      return <div data-testid="card" {...surfaceProps} />;
    }
    const { getByTestId } = render(<Bare />);

    expect(() => hover(getByTestId('card'), 200)).not.toThrow();
  });
});

/**
 * **뜨문뜨문 뜨던 원인** `[사용자 지적 2026-09-07]`.
 *
 * Recharts의 기본 `throttleDelay`는 `'raf'`이고, 들어온 `mousemove`마다 **앞서 예약한 rAF를
 * 취소하고 다시 예약한다**(`mouseEventsMiddleware`). `pointermove`를 그대로 흘려보내면
 * 프레임 경계가 지나기 전에 다음 취소가 와서 콜백이 돌지 못한다.
 */
describe('한 프레임에 한 번만 보낸다', () => {
  it('한 프레임 안에서 여러 번 움직여도 마지막 자리로 한 번만 나간다', () => {
    const onRelay = vi.fn();
    const { getByTestId } = render(<Probe onRelay={onRelay} />);
    const card = getByTestId('card');

    act(() => {
      for (const x of [200, 240, 280]) {
        card.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: x }));
      }
    });
    act(() => vi.advanceTimersByTime(FRAME_MS));

    expect(onRelay).toHaveBeenCalledTimes(1);
    expect((onRelay.mock.calls[0]![0] as MouseEvent).clientX).toBe(280);
  });

  /** 카드를 떠나며 남겨 둔 예약이 뒤늦게 나가면 떠난 뒤에 툴팁이 켜진다 */
  it('떠나면 예약해 둔 것을 거둔다', () => {
    const onRelay = vi.fn();
    const { getByTestId } = render(<Probe onRelay={onRelay} />);
    const card = getByTestId('card');

    act(() => {
      card.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 200 }));
      /* React는 `pointerleave`를 `pointerout`에서 합성한다 — 그대로 보내면 닿지 않는다 */
      card.dispatchEvent(
        new PointerEvent('pointerout', { bubbles: true, relatedTarget: document.body }),
      );
    });
    act(() => vi.advanceTimersByTime(FRAME_MS));

    expect(onRelay).not.toHaveBeenCalled();
  });
});
