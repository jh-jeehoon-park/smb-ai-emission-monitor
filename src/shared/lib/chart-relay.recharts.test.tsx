// @vitest-environment jsdom
import { act, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Area, AreaChart, Tooltip, YAxis } from 'recharts';
import { chartRelayPoint, type ChartBox, type ChartMargin } from './chart-relay';

/**
 * **중계가 기대는 Recharts의 성질 둘을 값으로 못박는다** `[사용자 지적 2026-09-07]`.
 *
 * `chart-relay.ts`의 셈은 라이브러리 내부 규칙 위에 서 있다 — 판올림이 그 규칙을 바꾸면
 * 툴팁이 조용히 «뜨문뜨문»으로 돌아간다. 화면에서는 원인을 알 수 없는 종류라 여기서 잡는다.
 *
 * ① **플롯 밖에서는 켜지지 않는다** — 여백만큼이 상자 안이면서 플롯 밖이다
 * ② **`throttleDelay`가 `'raf'`면 그 프레임에는 켜지지 않는다** — 우리가 프레임당 하나로
 *    줄이고 차트 쪽 스로틀을 끄는 이유가 그것이다
 */
const W = 200;
const H = 40;
const MARGIN: ChartMargin = { top: 2, right: 2, bottom: 0, left: 2 };
const BOX: ChartBox = { left: 0, right: W, top: 0, height: H };

const data = Array.from({ length: 288 }, (_, i) => ({ t: String(i), v: 5 + (i % 7) }));

function draw(throttled: boolean) {
  const view = render(
    <AreaChart
      width={W}
      height={H}
      data={data}
      margin={MARGIN}
      accessibilityLayer={false}
      {...(throttled ? {} : { throttledEvents: [] })}
    >
      <YAxis hide domain={['dataMin', 'dataMax']} />
      <Tooltip
        content={({ active, payload }) =>
          active && payload?.length ? <span data-testid="tip" /> : null
        }
      />
      <Area type="monotone" dataKey="v" dot={false} isAnimationActive={false} />
    </AreaChart>,
  );

  const wrapper = view.container.querySelector('.recharts-wrapper') as HTMLElement;
  /* jsdom에는 배치가 없다 — 차트가 자기 크기를 아는 상태로 만든다 */
  wrapper.getBoundingClientRect = () =>
    ({ left: 0, top: 0, right: W, bottom: H, width: W, height: H, x: 0, y: 0 }) as DOMRect;
  Object.defineProperty(wrapper, 'offsetWidth', { value: W, configurable: true });
  Object.defineProperty(wrapper, 'offsetHeight', { value: H, configurable: true });

  return {
    /** 그 자리에 포인터를 두면 툴팁이 켜지는가 */
    hits(clientX: number, clientY: number): boolean {
      act(() => {
        wrapper.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX, clientY }));
      });
      return view.container.querySelector('[data-testid="tip"]') !== null;
    },
    unmount: view.unmount,
  };
}

describe('Recharts — 플롯 밖에서는 툴팁이 켜지지 않는다', () => {
  it.each([
    ['여백 안쪽(왼쪽 끝)', MARGIN.left, true],
    ['여백(왼쪽)', MARGIN.left - 1, false],
    ['여백 안쪽(오른쪽 끝)', W - MARGIN.right, true],
    ['여백(오른쪽)', W - MARGIN.right + 1, false],
  ])('가로 %s', (_label, x, expected) => {
    const chart = draw(false);
    expect(chart.hits(x, H / 2)).toBe(expected);
    chart.unmount();
  });

  it.each([
    ['여백 안쪽(위)', MARGIN.top, true],
    ['여백(위)', MARGIN.top - 1, false],
  ])('세로 %s', (_label, y, expected) => {
    const chart = draw(false);
    expect(chart.hits(W / 2, y)).toBe(expected);
    chart.unmount();
  });

  /** 중계가 내놓는 자리는 언제나 켜져야 한다 — 그것이 이 함수의 계약이다 */
  it.each([-500, 0, 1, 100, W, 9999])('중계한 자리(%s)는 늘 켜진다', (from) => {
    const point = chartRelayPoint(from, BOX, MARGIN)!;
    const chart = draw(false);
    expect(chart.hits(point.clientX, point.clientY)).toBe(true);
    chart.unmount();
  });
});

/**
 * **스로틀을 켜 두면 그 프레임에는 켜지지 않는다.** 이 성질과 «`mousemove`마다 앞선 예약을
 * 취소한다»가 겹쳐, 포인터를 그대로 흘려보내면 콜백이 영영 돌지 못했다.
 */
describe('Recharts — rAF 스로틀은 그 프레임에 켜지지 않는다', () => {
  it('스로틀을 끄면 같은 프레임에 켜진다', () => {
    const chart = draw(false);
    expect(chart.hits(W / 2, H / 2)).toBe(true);
    chart.unmount();
  });

  it('기본값(raf)이면 같은 프레임에 켜지지 않는다', () => {
    const chart = draw(true);
    expect(chart.hits(W / 2, H / 2)).toBe(false);
    chart.unmount();
  });
});
