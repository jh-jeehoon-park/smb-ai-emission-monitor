// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Site } from '@/entities/site';
import { SiteWallboard } from './site-wallboard';

/**
 * 격자를 **한 줄 트랙 + 넘김 조작**으로 바꿨다 `[사용자 지시 2026-08-25]`.
 *
 * 여기서 고정하는 것은 **바뀌지 않아야 하는 것**이다 — 카드가 하나도 빠지지 않고,
 * 접근 이름이 그대로이고, **누르면 무엇이 일어나는지가 화면마다 갈린다**는 것.
 * 몇 장이 보이는지·인디케이터 칸 수는 실제 레이아웃 측정에 달려 있어(jsdom은 폭이
 * 전부 0이다) 여기서 검사하지 않는다.
 *
 * **두 갈래를 함께 잠근다** `[사용자 요청 2026-09-15]` — 통합 관제는 카드가 사업장
 * 상세로 «옮기고»(링크), 관내 감독은 아래 표의 대상을 «고른다»(버튼). 한쪽만 검사하면
 * 다른 쪽이 조용히 같은 요소가 되어도 통과한다: 옮기는 카드가 버튼이 되면 새 탭·가운데
 * 클릭·주소 복사가 전부 사라지는데 화면으로는 똑같아 보인다.
 */
const SITES = [
  { id: 'a', name: '가나염색', anomalyScore: 82, status: 'critical' },
  { id: 'b', name: '나다도금', anomalyScore: 41, status: 'normal' },
  { id: 'c', name: '다라섬유', anomalyScore: null, status: null },
] as unknown as Site[];

const renderFooter = (s: Site) => <span>{s.id}</span>;

describe('사업장 카드 트랙', () => {
  it('넘기는 구조가 되어도 카드는 하나도 빠지지 않는다', () => {
    render(
      <SiteWallboard
        sites={SITES}
        action="select"
        onCardClick={vi.fn()}
        cardLabel={(s) => `${s.name} 선택`}
        renderFooter={renderFooter}
      />,
    );
    expect(screen.getAllByRole('button', { name: /선택$/ })).toHaveLength(SITES.length);
  });

  it('고르는 화면에서는 카드가 버튼이고 그 사업장 id가 온다', async () => {
    const user = userEvent.setup();
    const onCardClick = vi.fn();
    render(
      <SiteWallboard
        sites={SITES}
        action="select"
        onCardClick={onCardClick}
        cardLabel={(s) => `${s.name} 선택`}
        renderFooter={renderFooter}
      />,
    );

    await user.click(screen.getByRole('button', { name: '나다도금 선택' }));
    expect(onCardClick).toHaveBeenCalledWith('b');
  });

  /**
   * **링크여야 한다** — `onClick`으로 옮기면 새 탭·가운데 클릭·주소 복사가 사라지고,
   * 그것은 화면으로 드러나지 않아 눈으로는 잡히지 않는다.
   */
  it('옮기는 화면에서는 카드가 링크이고 그 카드의 사업장으로 간다', () => {
    render(
      <SiteWallboard
        sites={SITES}
        action="link"
        cardHref={(s) => `/overview?site=${s.id}`}
        cardLabel={(s) => `${s.name} 사업장 상세로 이동`}
        renderFooter={renderFooter}
      />,
    );

    const card = screen.getByRole('link', { name: '나다도금 사업장 상세로 이동' });
    expect(card).toHaveAttribute('href', '/overview?site=b');
    /* 고르는 카드가 아니다 — 눌러도 이 화면에 머물지 않으므로 선택 상태가 없다 */
    expect(card).not.toHaveAttribute('aria-pressed');
    expect(screen.queryAllByRole('button', { name: /상세로 이동$/ })).toHaveLength(0);
  });

  it('점수가 없는 사업장은 통신 두절로 적고 값에 0을 쓰지 않는다', () => {
    render(
      <SiteWallboard
        sites={SITES}
        action="select"
        onCardClick={vi.fn()}
        cardLabel={(s) => `${s.name} 선택`}
        renderFooter={renderFooter}
      />,
    );
    expect(screen.getByText('통신 두절')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
