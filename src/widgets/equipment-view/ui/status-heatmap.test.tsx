// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { fireEvent, within } from '@testing-library/dom';
import { getEquipment } from '@/entities/equipment';
import { StatusHeatmap } from './status-heatmap';

/*
 * vitest는 `globals`가 꺼져 있어 RTL의 자동 정리가 등록되지 않는다. 직접 부르지 않으면
 * 앞 테스트의 DOM이 남아 같은 칸이 여러 개로 잡힌다.
 */
afterEach(cleanup);

/**
 * 판독 툴팁은 마우스로만 확인해 왔다. 한 번 `overflow-x-auto`에 잘려 아예 보이지 않은 적이
 * 있어(스크롤 상자는 세로도 함께 자른다) 여기서 고정한다.
 *
 * `userEvent.hover` 대신 `fireEvent.mouseMove`를 쓴다 — 좌표를 `getBoundingClientRect`에서
 * 받는 구현이라 jsdom에서는 항상 0이지만, **툴팁이 뜨는지**가 검사 대상이지 위치가 아니다.
 */
const online = getEquipment('S-02');

function renderGrid() {
  const view = render(<StatusHeatmap siteId="S-02" items={online} />);
  /* 툴팁 안으로 범위를 좁힌다 — 같은 문구가 행 머리글·범례에도 있다 */
  const tooltip = () => view.container.querySelector('[data-heat-tooltip]');
  return { ...view, tooltip };
}

/** 설비 행의 칸. `th`(설비명)를 건너뛰고 세는 것이 열 번호다 */
function statusCellAt(row: number, column: number): HTMLElement {
  const rows = screen.getAllByRole('row');
  /* 0번은 머리글 행 */
  return rows[row + 1]!.querySelectorAll('td')[column] as HTMLElement;
}

describe('가동 격자 판독 툴팁', () => {
  it('처음에는 뜨지 않는다', () => {
    const { tooltip } = renderGrid();
    expect(tooltip()).toBeNull();
  });

  it('칸에 올리면 시각·설비·가동을 낸다', () => {
    const { tooltip } = renderGrid();
    fireEvent.mouseMove(statusCellAt(0, 0));

    const tip = within(tooltip() as HTMLElement);
    expect(tip.getByText(online[0]!.name)).toBeTruthy();
    /* 칸이 말하는 것이 등급에서 가동으로 바뀌었다 `[INC-107]` */
    expect(tip.getByText('가동 상태')).toBeTruthy();
    expect(tip.queryByText('등급')).toBeNull();
    /* 표시 기준 시간대를 함께 적는다(E5) */
    expect(tip.getByText(/KST$/)).toBeTruthy();
  });

  it('격자를 벗어나면 사라진다', () => {
    const { container, tooltip } = renderGrid();
    fireEvent.mouseMove(statusCellAt(0, 0));
    expect(tooltip()).not.toBeNull();

    /*
     * React는 `mouseleave`를 루트의 `mouseout`에서 합성한다. `fireEvent.mouseLeave`는
     * 버블링하지 않는 원시 이벤트라 `onMouseLeave`에 닿지 않는다 — 실제로 안 닿았다.
     */
    fireEvent.mouseOut(container.firstElementChild!.firstElementChild!, {
      relatedTarget: document.body,
    });
    expect(tooltip()).toBeNull();
  });

  /**
   * 처음에는 열 전체를 강조했더니 짚은 칸이 어느 행인지 알 수 없었다
   * `[사용자 요청 2026-08-20]`.
   */
  it('짚은 칸 하나만 강조한다', () => {
    const { container } = renderGrid();
    fireEvent.mouseMove(statusCellAt(0, 5));

    const outlined = [...container.querySelectorAll('td')].filter(
      (td) => td.style.outline !== '',
    );
    expect(outlined).toHaveLength(1);
    expect(outlined[0]).toBe(statusCellAt(0, 5));
  });

  it('다른 행의 같은 열은 강조하지 않는다', () => {
    const { container } = renderGrid();
    fireEvent.mouseMove(statusCellAt(1, 5));

    expect(statusCellAt(0, 5).style.outline).toBe('');
    const outlined = [...container.querySelectorAll('td')].filter((td) => td.style.outline !== '');
    expect(outlined).toHaveLength(1);
  });

  /**
   * **행은 설비뿐이다** `[사용자 요청 2026-09-08]`. `방지시설 가동` 줄이 격자 아래에 붙어
   * 있었는데, 그 사실은 방류 여부와 나란히 놓이는 이상 탐지에서만 결론에 닿는다. 되살리면
   * 구분선·별도 범례·별도 툴팁 이름이 함께 돌아오므로 여기서 못박는다.
   */
  it('설비 수만큼만 행이 있다 — 사업장 단위 줄이 섞이지 않는다', () => {
    const { container } = renderGrid();
    expect(container.querySelectorAll('tbody tr')).toHaveLength(online.length);
    expect(screen.queryByText('방지시설 가동')).toBeNull();
  });

  it('모든 행 머리글이 설비명이다', () => {
    const { container } = renderGrid();
    const heads = [...container.querySelectorAll('tbody th')].map((th) => th.textContent);
    expect(heads).toEqual(online.map((eq) => eq.name));
  });

  /** 결측 칸에 가동 여부를 지어내지 않는다(E4) */
  it('수신 없는 칸은 가동 대신 수신 없음을 낸다', () => {
    const { tooltip } = renderGrid();
    const missingColumn = getStatusCells().findIndex((text) => text.includes('수신 없음'));
    expect(missingColumn).toBeGreaterThanOrEqual(0);

    fireEvent.mouseMove(statusCellAt(0, missingColumn));
    const tip = within(tooltip() as HTMLElement);
    expect(tip.getByText('수신 없음')).toBeTruthy();
    expect(tip.queryByText('가동 상태')).toBeNull();
  });
});

describe('통신 두절 사업장', () => {
  it('격자를 그리지 않는다 — 전 칸 빗금은 정보가 아니다', () => {
    render(<StatusHeatmap siteId="S-04" items={getEquipment('S-04')} />);
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText(/가동 격자를 그리지 않습니다/)).toBeTruthy();
  });
});

function getStatusCells(): string[] {
  const rows = screen.getAllByRole('row');
  return [...rows[1]!.querySelectorAll('td')].map((td) => td.textContent ?? '');
}
