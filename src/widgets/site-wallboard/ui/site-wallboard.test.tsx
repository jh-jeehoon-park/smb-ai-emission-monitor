// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Site } from '@/entities/site';
import { SiteWallboard } from './site-wallboard';

/**
 * 격자를 **한 줄 트랙 + 넘김 조작**으로 바꿨다 `[사용자 지시 2026-08-25]`.
 *
 * 여기서 고정하는 것은 **바뀌지 않아야 하는 것**이다 — 카드가 하나도 빠지지 않고, 누르면
 * 그 사업장 id로 콜백이 오고, 접근 이름이 그대로라는 것. 몇 장이 보이는지·인디케이터 칸 수는
 * 실제 레이아웃 측정에 달려 있어(jsdom은 폭이 전부 0이다) 여기서 검사하지 않는다.
 */
afterEach(cleanup);

const SITES = [
  { id: 'a', name: '가나염색', anomalyScore: 82, status: 'critical' },
  { id: 'b', name: '나다도금', anomalyScore: 41, status: 'normal' },
  { id: 'c', name: '다라섬유', anomalyScore: null, status: null },
] as unknown as Site[];

const draw = (onCardClick = vi.fn()) => {
  render(
    <SiteWallboard
      sites={SITES}
      onCardClick={onCardClick}
      cardLabel={(s) => `${s.name} 알람 보기`}
      renderFooter={(s) => <span>{s.id}</span>}
    />,
  );
  return onCardClick;
};

describe('사업장 카드 트랙', () => {
  it('넘기는 구조가 되어도 카드는 하나도 빠지지 않는다', () => {
    draw();
    expect(screen.getAllByRole('button', { name: /알람 보기$/ })).toHaveLength(SITES.length);
  });

  it('카드를 누르면 그 사업장 id가 온다 — 기능은 그대로다', async () => {
    const user = userEvent.setup();
    const onCardClick = draw();

    await user.click(screen.getByRole('button', { name: '나다도금 알람 보기' }));
    expect(onCardClick).toHaveBeenCalledWith('b');
  });

  it('점수가 없는 사업장은 통신 두절로 적고 값에 0을 쓰지 않는다', () => {
    draw();
    expect(screen.getByText('통신 두절')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
