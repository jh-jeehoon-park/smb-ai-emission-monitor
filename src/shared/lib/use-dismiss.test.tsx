// @vitest-environment jsdom
import { useCallback, useRef, useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useDismiss } from './use-dismiss';

/**
 * **팝오버가 닫히는 규약** — 헤더의 세 팝오버(알림 · 계정 · 수신)가 이것을 공유한다
 * `[사용자 요청 2026-09-18: 모바일 헤더 반응형]`.
 *
 * 셋으로 늘면서 뽑은 것이라, 퇴행하면 **세 자리가 한꺼번에** 무너진다. 특히 `Esc`의 초점
 * 복원은 눈으로는 보이지 않아(포커스 링이 사라질 뿐) 키보드로 써 보지 않으면 모른다 —
 * 그래서 검사가 들고 있는다.
 */
function Probe() {
  const [open, setOpen] = useState(true);
  const boxRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useDismiss({ open, onDismiss: close, boxRef, triggerRef });

  return (
    <div>
      <button ref={triggerRef} type="button">
        트리거
      </button>
      <button type="button">바깥 버튼</button>
      {open && (
        <div ref={boxRef} data-testid="box">
          <button type="button">안쪽 버튼</button>
        </div>
      )}
    </div>
  );
}

afterEach(cleanup);

describe('useDismiss', () => {
  it('바깥을 누르면 닫힌다', () => {
    render(<Probe />);
    fireEvent.mouseDown(screen.getByText('바깥 버튼'));
    expect(screen.queryByTestId('box')).toBeNull();
  });

  /** 상자 안의 조작(알람 확인 버튼 등)을 누를 때마다 닫히면 쓸 수가 없다 */
  it('안쪽을 누르면 닫히지 않는다', () => {
    render(<Probe />);
    fireEvent.mouseDown(screen.getByText('안쪽 버튼'));
    expect(screen.queryByTestId('box')).not.toBeNull();
  });

  /**
   * **닫고 끝내면 초점이 `body`로 튄다.** 키보드 사용자는 헤더 맨 앞부터 다시 Tab 해야 한다 —
   * 모달에서 이미 한 번 고쳤던 것과 같은 결함이다(`shared/ui/modal.tsx`).
   */
  it('Esc로 닫으면 초점이 트리거로 돌아온다', () => {
    render(<Probe />);
    screen.getByText('안쪽 버튼').focus();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByTestId('box')).toBeNull();
    expect(document.activeElement).toBe(screen.getByText('트리거'));
  });

  /** 바깥 누름은 **그 누름이 이미 초점을 옮겼다** — 되돌리면 방금 누른 곳에서 초점을 뺏는다 */
  it('바깥을 눌러 닫을 때는 초점을 되돌리지 않는다', () => {
    render(<Probe />);
    const outside = screen.getByText('바깥 버튼');
    outside.focus();

    fireEvent.mouseDown(outside);

    expect(document.activeElement).toBe(outside);
  });

  /** 화면을 여닫을 때마다 청취자가 쌓이면 닫힌 팝오버가 남의 Esc에 반응한다 */
  it('닫히거나 떠나면 청취자가 남지 않는다', () => {
    const { unmount } = render(<Probe />);

    /* 먼저 닫아 둔다 — `open`이 false면 구독 자체가 없어야 한다 */
    fireEvent.mouseDown(screen.getByText('바깥 버튼'));
    unmount();

    /* 남아 있으면 떨어진 컴포넌트의 setState가 불려 경고가 난다 */
    expect(() => fireEvent.keyDown(document, { key: 'Escape' })).not.toThrow();
  });
});
