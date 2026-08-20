// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { getEquipment } from '@/entities/equipment';
import { EquipmentPanel } from './equipment-panel';

afterEach(cleanup);

const items = getEquipment('S-02');

/**
 * **`first:`·`last:`는 부모 기준이다.**
 *
 * 전에는 카드 안쪽 `div`에 `px-4 first:pl-0 last:pr-0`을 걸었는데, 그 `div`는 자기 부모의
 * 첫 자식이자 마지막 자식이라 **양쪽이 다 0**이 되어 여백이 통째로 사라졌다 — `divide-x`가
 * 그린 구분선에 내용이 그대로 맞닿았다. 같은 실수가 알람 목록에도 있었다.
 *
 * 그래서 여백은 **격자의 직접 자식**이 갖는지로 검사한다.
 */
describe('설비 카드 좌우 여백', () => {
  it('여백 클래스가 격자의 직접 자식에 있다', () => {
    const { container } = render(<EquipmentPanel items={items} online />);
    const grid = container.firstElementChild!;
    const cells = [...grid.children];
    expect(cells.length).toBe(items.length);

    for (const cell of cells) {
      expect(cell.className).toMatch(/xl:px-4/);
      /* 안쪽으로 내려가면 first/last 판정이 부모를 잃는다 */
      expect(cell.firstElementChild!.className).not.toMatch(/xl:px-/);
    }
  });

  it('첫 칸은 왼쪽, 마지막 칸은 오른쪽 여백을 뺀다 — 패널 여백이 그 자리를 맡는다', () => {
    const { container } = render(<EquipmentPanel items={items} online />);
    const cells = [...container.firstElementChild!.children];
    expect(cells[0]!.className).toMatch(/xl:first:pl-0/);
    expect(cells[cells.length - 1]!.className).toMatch(/xl:last:pr-0/);
  });

  /**
   * 네 칸일 때 열 간격이 남아 있으면 구분선이 왼쪽 카드에는 붙고 오른쪽 카드에서는
   * `간격 + 여백`만큼 떨어져 좌우가 어긋난다.
   */
  it('네 칸 배치에서는 열 간격을 0으로 둔다', () => {
    const { container } = render(<EquipmentPanel items={items} online />);
    const grid = container.firstElementChild!;
    expect(grid.className).toMatch(/xl:gap-x-0/);
    expect(grid.className).toMatch(/xl:divide-x/);
  });

  it('통신 두절이면 카드를 그리지 않는다 — 결측인데 멀쩡한 숫자를 띄우지 않는다(E3)', () => {
    const { container } = render(<EquipmentPanel items={items} online={false} />);
    expect(container.querySelector('[class*="divide-x"]')).toBeNull();
    expect(container.textContent).toContain('설비 수신값 없음');
  });
});
