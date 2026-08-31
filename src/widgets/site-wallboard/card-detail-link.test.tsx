// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SITES } from '@/entities/site';
import { SiteWallboard } from './index';

/**
 * **카드에서 한 번에 사업장 상세로 간다** `[사용자 요청 2026-08-31]`.
 *
 * 여기까지는 두 번 눌러야 했다 — 핀·탭으로 고르고, 구역 머리의 `상세 보기`를 다시 누른다.
 * 그 링크는 같은 화면에 여섯 개인 같은 모양의 칩 중 하나라 눈에도 띄지 않았다.
 */
function props(extra: Partial<Parameters<typeof SiteWallboard>[0]> = {}) {
  return {
    sites: SITES,
    onCardClick: vi.fn(),
    cardLabel: (site: (typeof SITES)[number]) => `${site.name} 알람 보기`,
    renderFooter: () => null,
    ...extra,
  };
}

describe('월보드 카드의 상세 링크', () => {
  it('`detailHref`를 주면 사업장마다 링크가 하나씩 생긴다', () => {
    const { container } = render(
      <SiteWallboard {...props({ detailHref: (site) => `/overview?site=${site.id}` })} />,
    );
    const links = [...container.querySelectorAll('a')];
    expect(links).toHaveLength(SITES.length);
    expect(links.map((a) => a.getAttribute('href'))).toEqual(
      SITES.map((site) => `/overview?site=${site.id}`),
    );
  });

  /** 관내 감독은 표의 `상세` 버튼이 그 일을 한다 — 카드는 **선택**이고 그대로 두었다(A2) */
  it('주지 않으면 링크가 없다', () => {
    const { container } = render(<SiteWallboard {...props()} />);
    expect(container.querySelectorAll('a')).toHaveLength(0);
  });

  /**
   * **링크가 카드 버튼 안에 들어가면 안 된다.**
   *
   * 버튼 안의 링크는 유효하지 않은 HTML이고, 브라우저가 고쳐 놓는 방식이 제각각이라
   * 칩을 눌러도 카드 본체가 먹거나 이동이 통째로 사라진다. 그래서 본체를 **카드를 덮는
   * 형제 버튼**으로 깔았다 — 그 짜임이 풀리는 것을 여기서 잡는다.
   */
  it('상세 링크와 카드 본체 버튼이 형제다', () => {
    const { container } = render(
      <SiteWallboard {...props({ detailHref: (site) => `/overview?site=${site.id}` })} />,
    );
    for (const link of container.querySelectorAll('a')) {
      expect(link.closest('button')).toBeNull();
    }
    expect(container.querySelector('button button')).toBeNull();
  });

  /**
   * **테두리 색을 인라인으로 정하지 않는다** `[사용자 요청 2026-08-31: 기존처럼 되돌려줘]`.
   *
   * 한때 첨부 이미지를 따라 등급색을 테두리에 얹었는데, 인라인 스타일이 클래스를 이겨
   * **고른 카드의 선택 테두리(`border-accent/40`)를 덮었다** — 관내 감독처럼 카드가 선택인
   * 화면에서 무엇을 골랐는지 사라졌다. 테두리는 클래스가 정하고(기본·hover·선택 세 단),
   * 등급색은 **면 그라데이션**만 말한다.
   */
  it('어느 카드도 테두리 색을 인라인으로 정하지 않는다', () => {
    const graded = SITES.find((site) => site.status !== null)!;
    const { container } = render(<SiteWallboard {...props({ selectedId: graded.id })} />);
    const cards = [...container.querySelectorAll<HTMLElement>('[style*="background-image"]')];
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) expect(card.style.borderColor).toBe('');
    /* 등급색은 사라지지 않았다 — 면 그라데이션이 그대로 있다는 증거 */
    expect(cards[0]!.style.backgroundImage).toContain('linear-gradient');
  });

  /**
   * **카드 테두리 hover는 본체 버튼에 매달려 있어야 한다** `[사용자 지적 2026-08-31]`.
   *
   * `:hover`는 자손에서 조상으로 번진다 — 카드에 `hover:border-…`를 걸면 **상세 칸 위에서도**
   * 켜져, 알람 모달을 여는 자리와 화면을 옮기는 자리가 그림으로 갈리지 않는다. 그래서 테두리는
   * `:has(>button:hover)`로 본체에 매달고, **그림자만** 카드에 남긴다(어느 칸을 가리키든 이
   * 카드가 뜬다).
   *
   * **클래스 문자열을 보는 검사다.** jsdom은 실제 hover를 만들지 못해 계산된 스타일로는 잡을 수
   * 없다 — 실제 동작은 브라우저에서 포인터를 옮겨 확인했다(본체 위 `--accent/50` · 상세 칸 위
   * `--border`). 여기서는 **번지는 모양으로 되돌아가는 것**만 막는다.
   */
  it('카드 테두리 hover는 본체 버튼에 매달려 있다', () => {
    const { container } = render(
      <SiteWallboard {...props({ detailHref: (site) => `/overview?site=${site.id}` })} />,
    );
    const card = container.querySelector<HTMLElement>('[style*="background-image"]');
    expect(card).not.toBeNull();
    const cls = card!.className;
    expect(cls).toContain('[&:has(>button:hover)]:border-accent/50');
    /* 맨 `hover:border-`가 있으면 자손 위에서도 다시 켜진다 */
    expect(cls).not.toMatch(/(^|\s)hover:border-/);
    /* 그림자는 카드에 남는다 — 이 카드를 가리키고 있다는 신호다 */
    expect(cls).toContain('hover:shadow-panel');
  });

  /** 카드 본체는 지금까지 하던 일을 계속한다 — 여기서 뺏으면 요청하지 않은 것이 바뀐다 */
  it('카드 본체는 여전히 눌리고 상세로 가지 않는다', () => {
    const onCardClick = vi.fn();
    const { container } = render(
      <SiteWallboard
        {...props({ onCardClick, detailHref: (site) => `/overview?site=${site.id}` })}
      />,
    );
    const body = container.querySelector('button[aria-label]');
    expect(body).not.toBeNull();
    (body as HTMLButtonElement).click();
    expect(onCardClick).toHaveBeenCalledWith(SITES[0]!.id);
  });
});
