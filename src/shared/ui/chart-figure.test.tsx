// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ChartFigure } from './chart-figure';

afterEach(cleanup);

/**
 * 차트 안에서 마우스를 누른 채 밖으로 끌면 툴팁이 화면에 얼어붙었다.
 *
 * 원인은 Recharts가 키보드 접근용으로 붙여 둔 SVG `<g>`(`tabindex=-1`)에 **포커스가 잡히는
 * 것**이었다 — `mouseleave` 처리는 hover 플래그만 지우고 포커스로 열린 툴팁은 두기 때문이다.
 * 그래서 차트 표면의 `mousedown` 기본 동작을 막는다.
 *
 * 브라우저에서 눈으로 확인했을 뿐 회귀 방지가 주석뿐이었다. 여기서 고정한다.
 */
describe('차트 그림 — 마우스로는 포커스가 잡히지 않는다', () => {
  it('mousedown의 기본 동작을 막는다', () => {
    render(
      <ChartFigure label="테스트 차트">
        <div data-testid="chart-body">차트</div>
      </ChartFigure>,
    );

    const surface = screen.getByRole('img', { name: '테스트 차트' });
    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    surface.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  /** 표는 값을 복사하는 유일한 경로다. 차트 밖이라 막히면 안 된다 */
  it('표로 보기 영역은 막지 않는다', () => {
    render(
      <ChartFigure
        label="테스트 차트"
        rows={[{ t: '09:00', v: 1 }]}
        columns={[
          { header: '시각', cell: (r) => r.t },
          { header: '값', cell: (r) => String(r.v) },
        ]}
      >
        <div>차트</div>
      </ChartFigure>,
    );

    const summary = screen.getByText('표로 보기');
    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    summary.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it('그림 라벨이 접근 이름이 된다', () => {
    render(
      <ChartFigure label="이상 점수 타임라인">
        <div>차트</div>
      </ChartFigure>,
    );

    expect(screen.getByRole('img', { name: '이상 점수 타임라인' })).toBeInTheDocument();
  });

  /** 접힌 `<details>`는 렌더 자체를 하지 않는다 — sr-only 컨테이너와 다른 점이다 */
  it('표는 접힌 채로 시작한다', () => {
    render(
      <ChartFigure
        label="테스트 차트"
        rows={[{ t: '09:00' }]}
        columns={[{ header: '시각', cell: (r) => r.t }]}
      >
        <div>차트</div>
      </ChartFigure>,
    );

    expect(screen.getByText('표로 보기').closest('details')).not.toHaveAttribute('open');
  });
});
