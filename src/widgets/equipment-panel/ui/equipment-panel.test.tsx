// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { getEquipment } from '@/entities/equipment';
import { EquipmentPanel } from './equipment-panel';
import styles from './equipment-panel.module.scss';

afterEach(cleanup);

const items = getEquipment('S-02');

/**
 * **격자를 깊이로 찾지 않는다.** 2026-09-18에 열 수를 컨테이너로 묻게 되면서 위젯이
 * `@container` 래퍼를 한 겹 더 갖게 됐고(`equipment-grid.test.ts`가 그 겹을 요구한다),
 * `container.firstElementChild`를 격자로 보던 검사 셋이 한꺼번에 깨졌다.
 *
 * 깊이 대신 **격자라는 성질**로 찾는다 — 래퍼가 더 늘거나 줄어도 이 검사들이 따라온다.
 */
const gridOf = (root: HTMLElement) => root.querySelector(`.${styles.grid}`)!;
const cellsOf = (root: HTMLElement) => [...gridOf(root).children];

/**
 * 규칙이 **무엇을 하는가**는 모듈 SCSS 원문에서 본다 — jsdom은 스타일시트를 적용하지 않는다.
 * 요소에서는 **어느 규칙이 붙었는가**만 본다.
 */
const scss = readFileSync('src/widgets/equipment-panel/ui/equipment-panel.module.scss', 'utf8');
const ruleBody = (name: string) =>
  scss.match(new RegExp(String.raw`\.${name}\s*\{((?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*)\}`))?.[1] ?? '';

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
    const cells = cellsOf(container);
    expect(cells.length).toBe(items.length);

    for (const cell of cells) {
      const card = cell.firstElementChild!;
      expect(card.classList.contains(styles.card)).toBe(true);
    }
    expect(ruleBody('card')).toMatch(/border-radius:\s*var\(--radius-nested\)/);
    expect(ruleBody('card')).toMatch(/border:\s*1px solid/);
  });

  /**
   * 이상 신호가 있는 카드와 없는 카드가 한 줄에 섞인다. 아래 줄을 바닥에 붙이지 않으면
   * 같은 줄에서 카드 높이가 갈린다 — 화면 전반의 `높이` 규칙과 같은 이유다.
   */
  it('내용 줄 수와 무관하게 높이가 같다 — 아래 줄은 바닥에 붙는다', () => {
    const { container } = render(<EquipmentPanel items={items} online />);
    const cards = cellsOf(container).map((c) => c.firstElementChild!);

    for (const card of cards) {
      expect(card.classList.contains(styles.card)).toBe(true);
      expect(card.lastElementChild!.classList.contains(styles.signals)).toBe(true);
    }
    expect(ruleBody('card')).toMatch(/height:\s*100%/);
    expect(ruleBody('card')).toMatch(/flex-direction:\s*column/);
    expect(ruleBody('signals')).toMatch(/margin-top:\s*auto/);
  });

  /** 누를 수 없는 것에 hover를 주면 조작으로 읽힌다 */
  it('상세를 여는 화면에서만 hover가 걸린다', () => {
    const plain = render(<EquipmentPanel items={items} online />);
    const plainCard = cellsOf(plain.container)[0]!.firstElementChild!;
    expect(plainCard.classList.contains(styles.cardInteractive)).toBe(false);
    cleanup();

    const clickable = render(<EquipmentPanel items={items} online onSelect={() => {}} />);
    const card = cellsOf(clickable.container)[0]!.firstElementChild!;
    expect(card.classList.contains(styles.cardInteractive)).toBe(true);

    /* hover는 누를 수 있는 쪽 규칙에만 있다 — 껍데기 규칙에 있으면 표시뿐인 카드도 반응한다 */
    expect(ruleBody('cardInteractive')).toMatch(/&:hover/);
    expect(ruleBody('card')).not.toMatch(/:hover/);
  });

  it('통신 두절이면 카드를 그리지 않는다 — 결측인데 멀쩡한 숫자를 띄우지 않는다(E3)', () => {
    const { container } = render(<EquipmentPanel items={items} online={false} />);
    expect(container.querySelector(`.${styles.card}`)).toBeNull();
    expect(container.textContent).toContain('설비 수신값 없음');
  });
});
