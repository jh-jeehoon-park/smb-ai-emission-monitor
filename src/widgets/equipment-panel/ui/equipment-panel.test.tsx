// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { getEquipment } from '@/entities/equipment';
import { EquipmentPanel } from './equipment-panel';

afterEach(cleanup);

const items = getEquipment('S-02');

/**
 * 카드로 짠 뒤 지켜야 할 것이 바뀌었다.
 *
 * 예전에는 구분선(`divide-x`)으로 칸을 나눠 **여백을 격자의 직접 자식이 갖는지**를 검사했다
 * (`first:`·`last:`가 부모 기준이라 안쪽 `div`에 걸면 양쪽이 다 0이 되는 함정 때문이다).
 * 지금은 칸마다 카드 껍데기가 있어 그 함정이 없어졌고, 대신 **높이와 hover**가 검사 대상이다.
 */
describe('설비 카드', () => {
  it('격자 한 칸이 설비 한 대이고 칸마다 카드 껍데기를 갖는다', () => {
    const { container } = render(<EquipmentPanel items={items} online />);
    const cells = [...container.firstElementChild!.children];
    expect(cells.length).toBe(items.length);

    for (const cell of cells) {
      const card = cell.firstElementChild!;
      expect(card.className).toMatch(/rounded-nested/);
      expect(card.className).toMatch(/border/);
    }
  });

  /**
   * 이상 신호가 있는 카드와 없는 카드가 한 줄에 섞인다. 아래 줄을 바닥에 붙이지 않으면
   * 같은 줄에서 카드 높이가 갈린다 — 화면 전반의 `높이` 규칙과 같은 이유다.
   */
  it('내용 줄 수와 무관하게 높이가 같다 — 아래 줄은 바닥에 붙는다', () => {
    const { container } = render(<EquipmentPanel items={items} online />);
    const cards = [...container.firstElementChild!.children].map((c) => c.firstElementChild!);

    for (const card of cards) {
      expect(card.className).toMatch(/h-full/);
      expect(card.className).toMatch(/flex-col/);
      expect(card.lastElementChild!.className).toMatch(/mt-auto/);
    }
  });

  /** 누를 수 없는 것에 hover를 주면 조작으로 읽힌다 */
  it('상세를 여는 화면에서만 hover가 걸린다', () => {
    const plain = render(<EquipmentPanel items={items} online />);
    const plainCard = plain.container.firstElementChild!.firstElementChild!.firstElementChild!;
    expect(plainCard.className).not.toMatch(/hover:/);
    cleanup();

    const clickable = render(<EquipmentPanel items={items} online onSelect={() => {}} />);
    const card = clickable.container.firstElementChild!.firstElementChild!.firstElementChild!;
    expect(card.className).toMatch(/hover:/);
  });

  it('통신 두절이면 카드를 그리지 않는다 — 결측인데 멀쩡한 숫자를 띄우지 않는다(E3)', () => {
    const { container } = render(<EquipmentPanel items={items} online={false} />);
    expect(container.querySelector('[class*="rounded-nested"]')).toBeNull();
    expect(container.textContent).toContain('설비 수신값 없음');
  });
});
