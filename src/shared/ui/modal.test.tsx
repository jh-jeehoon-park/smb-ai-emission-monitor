// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './modal';

/**
 * **포커스 복원은 우리가 직접 한다.** Radix에 맡겼더니 ESC로 닫은 뒤 포커스가 `body`로 튀어
 * 목록에서 상세를 열었다 닫으면 키보드 사용자가 있던 행을 잃었다.
 *
 * 이 동작은 브라우저에서 눈으로만 확인해 왔고 회귀 방지가 주석뿐이었다. DOM 환경을 들여
 * 여기서 고정한다.
 */
/*
 * vitest는 `globals`가 꺼져 있어 RTL의 자동 정리가 등록되지 않는다. 직접 부르지 않으면
 * 앞 테스트의 DOM이 남아 같은 버튼이 여러 개로 잡힌다.
 */
afterEach(cleanup);

/*
 * Radix는 모달이 열린 동안 바깥에 `pointer-events: none`을 건다. user-event는 기본적으로
 * 그런 요소의 클릭을 거부하므로 검사를 끈다 — 실제 브라우저에서는 오버레이가 클릭을 받는다.
 */
const setup = () => userEvent.setup({ pointerEventsCheck: 0 });

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        상세 열기
      </button>
      <button type="button">다른 버튼</button>
      {/* 닫혀 있을 때도 마운트해 둔다 — 통째로 없애면 복원 대상을 잃는다 */}
      <Modal open={open} onOpenChange={setOpen} title="알람 상세">
        <p>본문</p>
      </Modal>
    </>
  );
}

describe('상세 모달', () => {
  it('열면 본문이 보인다', async () => {
    const user = setup();
    render(<Harness />);

    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(screen.getByRole('button', { name: '상세 열기' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('본문')).toBeInTheDocument();
  });

  it('ESC로 닫힌다', async () => {
    const user = setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: '상세 열기' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('닫으면 포커스가 **열었던 버튼으로** 돌아온다', async () => {
    const user = setup();
    render(<Harness />);

    const trigger = screen.getByRole('button', { name: '상세 열기' });
    await user.click(trigger);
    await user.keyboard('{Escape}');

    expect(document.activeElement).toBe(trigger);
  });

  it('닫기 버튼으로 닫아도 포커스가 돌아온다', async () => {
    const user = setup();
    render(<Harness />);

    const trigger = screen.getByRole('button', { name: '상세 열기' });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: '닫기' }));

    expect(document.activeElement).toBe(trigger);
  });

  /** 열기 전 초점이 다른 곳이었다면 그리로 돌아가야 한다 — 트리거를 기억하는 것이 아니다 */
  it('열기 직전 초점 자리로 돌아온다', async () => {
    const user = setup();
    render(<Harness />);

    const other = screen.getByRole('button', { name: '다른 버튼' });
    other.focus();
    // 키보드로 연 상황을 만든다 — 클릭하면 트리거가 초점을 가져간다
    await user.keyboard('{Enter}');
    expect(document.activeElement).toBe(other);
  });

  it('제목이 접근 이름이 된다', async () => {
    const user = setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: '상세 열기' }));
    expect(screen.getByRole('dialog', { name: '알람 상세' })).toBeInTheDocument();
  });
});
