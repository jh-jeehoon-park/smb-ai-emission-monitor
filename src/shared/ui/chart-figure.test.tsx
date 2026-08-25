// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  /**
   * 탭은 두 패널을 **같은 자리에 겹쳐** 둔다 — 조건부로 하나만 렌더하면 카드 높이가
   * 탭마다 달라진다. 그래서 표가 처음부터 DOM에 있고, 감추는 것은 `invisible`이다.
   */
  it('그래프 탭이 먼저 선택되고 표는 DOM에 있으나 감춰져 있다', () => {
    render(
      <ChartFigure
        label="테스트 차트"
        rows={[{ t: '09:00' }]}
        columns={[{ header: '시각', cell: (r) => r.t }]}
      >
        <div>차트</div>
      </ChartFigure>,
    );

    expect(screen.getByRole('tab', { name: '그래프로 보기' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: '표로 보기' })).toHaveAttribute(
      'aria-selected',
      'false',
    );

    /** `display:none`이면 ResponsiveContainer가 폭 0을 읽어 다시 못 그린다 */
    const table = screen.getByRole('columnheader', { name: '시각' }).closest('[role="tabpanel"]');
    expect(table?.className).toContain('invisible');
  });

  it('표 탭을 누르면 표가 보이고 그래프가 감춰진다', async () => {
    render(
      <ChartFigure
        label="테스트 차트"
        rows={[{ t: '09:00' }]}
        columns={[{ header: '시각', cell: (r) => r.t }]}
      >
        <div>차트</div>
      </ChartFigure>,
    );

    fireEvent.click(screen.getByRole('tab', { name: '표로 보기' }));

    const table = screen.getByRole('columnheader', { name: '시각' }).closest('[role="tabpanel"]');
    expect(table?.className).not.toContain('invisible');
    expect(screen.getByRole('img', { name: '테스트 차트' }).closest('[role="tabpanel"]')?.className)
      .toContain('invisible');
  });

  it('표 데이터가 없으면 탭을 그리지 않는다 — 고를 것이 하나뿐인 탭은 장식이다', () => {
    render(
      <ChartFigure label="테스트 차트">
        <div>차트</div>
      </ChartFigure>,
    );

    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });
});

/**
 * `role="tab"`을 붙인 이상 보조기술 사용자는 **좌우 화살표**를 기대한다(WAI-ARIA 탭 패턴).
 * 눈으로만 확인하던 것이라 여기서 고정한다 — Tab 이동은 그대로 살아 있어야 한다.
 */
describe('보기 방식 탭 — 키보드', () => {
  const columns = [{ header: '시각', cell: (row: { t: string }) => row.t }];

  const draw = () =>
    render(
      <ChartFigure label="테스트 그래프" rows={[{ t: '01:00' }]} columns={columns}>
        <div>그래프</div>
      </ChartFigure>,
    );

  it('오른쪽 화살표로 표로 보기로 넘어간다', async () => {
    const user = userEvent.setup();
    draw();

    const chartTab = screen.getByRole('tab', { name: '그래프로 보기' });
    chartTab.focus();
    await user.keyboard('{ArrowRight}');

    expect(screen.getByRole('tab', { name: '표로 보기' })).toHaveAttribute('aria-selected', 'true');
  });

  it('Home은 그래프, End는 표로 간다', async () => {
    const user = userEvent.setup();
    draw();

    screen.getByRole('tab', { name: '그래프로 보기' }).focus();
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: '표로 보기' })).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: '그래프로 보기' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});
