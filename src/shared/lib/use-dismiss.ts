'use client';

import { useEffect, type RefObject } from 'react';

/**
 * 열려 있는 팝오버를 **바깥 누름과 `Esc`로 닫는다.**
 *
 * `alarm-menu.tsx`와 `profile-menu.tsx`가 **한 글자도 다르지 않은 사본**을 하나씩 들고
 * 있었고, 수신 팝오버가 셋째가 되면서 뽑았다 `[사용자 요청 2026-09-18: 모바일 헤더 반응형]`.
 * 셋이 될 때까지 기다린 이유는 둘일 때는 중복이 우연일 수 있어서다 — 셋이면 규약이다.
 *
 * **껍데기는 뽑지 않는다.** 세 팝오버의 폭·패딩·내용이 전부 다르고, 묶으면 「알림」과
 * 「계정 메뉴」가 한 부품의 변주가 되어 각자의 근거가 흐려진다. 공통인 것은 **닫는 방법**뿐이다.
 *
 * **`Esc`로 닫을 때만 초점을 트리거로 되돌린다.** 닫기만 하면 초점이 사라진 요소에 남아
 * `body`로 튀고, 키보드 사용자는 헤더 맨 앞부터 다시 Tab 해야 한다(모달에서 같은 것을 이미
 * 고쳤다 — `shared/ui/modal.tsx`). 바깥을 눌러 닫을 때는 되돌리지 않는다 — **그 누름이 이미
 * 초점을 옮겼다.**
 *
 * `mousedown`으로 듣는다. `click`은 누름과 뗌 사이에 내용이 사라지면 발생하지 않는 경우가 있다.
 *
 * **`onDismiss`는 안정된 함수여야 한다**(`useCallback`). 렌더마다 새로 만들면 열려 있는 동안
 * 매 렌더에서 리스너를 떼었다 붙인다 — 원래 판본은 `[open]`만 보고 한 번만 붙였고, 그 성질을
 * 지키려면 호출부가 함수를 고정해야 한다.
 */
export function useDismiss({
  open,
  onDismiss,
  boxRef,
  triggerRef,
}: {
  open: boolean;
  onDismiss: () => void;
  /** 팝오버 상자. 이 안을 누른 것은 «바깥»이 아니다 */
  boxRef: RefObject<HTMLElement | null>;
  /** 여는 버튼. `Esc`로 닫을 때 초점이 돌아갈 자리다 */
  triggerRef: RefObject<HTMLElement | null>;
}): void {
  useEffect(() => {
    if (!open) return;

    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) onDismiss();
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      onDismiss();
      triggerRef.current?.focus();
    };

    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onDismiss, boxRef, triggerRef]);
}
