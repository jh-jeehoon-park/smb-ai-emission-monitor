'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import styles from './modal.module.scss';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** 닫힌 상태에서는 본문 없이 마운트만 유지한다 — 포커스 복원 대상을 잃지 않기 위해서다 */
  children?: ReactNode;
  /** 하단 액션 줄. 없으면 닫기 버튼만 남는다 */
  footer?: ReactNode;
  className?: string;
}

/**
 * 상세 모달.
 *
 * 포커스 트랩·ESC·`aria-modal`·스크롤 잠금을 직접 만들지 않는다 — Radix가 이미 한다.
 * 이 파일이 정하는 것은 **생김새와 여백**뿐이며, 그 값은 `Panel`과 같은 계열을 쓴다
 * (모달만 다른 모서리·테두리를 쓰면 같은 시스템으로 보이지 않는다).
 *
 * **뒤는 어두운 막으로만 덮는다 — 흐리지 않는다** `[사용자 지시 2026-08-25]`.
 * 흐림을 쓰던 판본이 있었다. 뒤 화면이 형태로 남아 한 겹이 떠 있는 것처럼 보이는 대신,
 * 시선이 그쪽으로 새고 계측 화면에서는 **흐린 숫자가 읽히는 값처럼** 보였다.
 *
 * 그래서 모달 자신은 **불투명**하다(R12). 반투명 + 흐림이던 판본에서 흐림만 걷으면 뒤 값이
 * 그대로 비쳐 어느 쪽이 이 모달의 값인지 알 수 없다 — 둘은 함께 가거나 함께 빠진다.
 * 겉면은 화면의 다른 카드와 같은 값을 쓰고 그림자만 한 단 깊다(떠 있는 것이므로).
 */
export function Modal({
  open,
  onOpenChange,
  title,
  children,
  footer,
  className,
}: ModalProps) {
  /*
   * 닫은 뒤 포커스를 **열기 전 자리로** 되돌린다.
   *
   * Radix가 해 주기를 기대했으나 이 구조(외부 상태로 여는 방식)에서는 포커스가 `body`로
   * 튀는 것을 확인했다 — 목록에서 상세를 열었다 닫으면 키보드 사용자가 있던 행을 잃는다.
   * 열릴 때 초점을 기억해 두고 닫힘 직후 되돌린다. 그 사이 화면에서 사라진 요소면 두지 않는다.
   */
  const opener = useRef<HTMLElement | null>(null);

  /*
   * 열린 **뒤에** `document.activeElement`를 읽으면 이미 Radix가 초점을 다이얼로그 안으로
   * 옮긴 뒤일 수 있다(자식의 layout effect가 부모의 effect보다 먼저 돈다). 그래서 닫혀 있는
   * 동안 마지막 초점을 계속 기억해 둔다 — 여는 순간 읽지 않으므로 순서에 기대지 않는다.
   */
  useEffect(() => {
    if (open) return;

    const remember = (event: FocusEvent) => {
      opener.current = event.target as HTMLElement | null;
    };
    document.addEventListener('focusin', remember);
    return () => document.removeEventListener('focusin', remember);
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/*
         * **막은 어둡게만 덮는다 — 흐리지 않는다** `[사용자 지시 2026-08-25]`.
         * 뒤 화면이 흐릿하게 살아 있으면 시선이 그쪽으로 새고, 계측 화면에서는 흐린 숫자가
         * 읽히는 값처럼 보인다. 어둡게만 덮으면 뒤는 배경이고 앞이 읽을 것이다.
         */}
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          onCloseAutoFocus={(event) => {
            const target = opener.current;
            if (!target?.isConnected) return;
            event.preventDefault();
            target.focus();
          }}
          className={cn(styles.content, className)}
        >
          <header className={styles.header}>
            <div className={styles.heading}>
              <Dialog.Title className={styles.title}>
                {title}
              </Dialog.Title>
            </div>
            <Dialog.Close
              aria-label="닫기"
              className={styles.close}
            >
              <X aria-hidden size={13} strokeWidth={1.9} />
            </Dialog.Close>
          </header>

          <div className={styles.body}>{children}</div>

          {footer && (
            <footer className={styles.footer}>
              {footer}
            </footer>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** 모달 본문의 사실 나열. `dt`가 왼쪽 라벨, `dd`가 값이다 */
export function ModalFacts({ children }: { children: ReactNode }) {
  return (
    <dl className={styles.facts}>{children}</dl>
  );
}

export function ModalFact({
  label,
  value,
  mono,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <>
      <dt className={styles.factLabel}>{label}</dt>
      <dd className={cn(styles.factValue, mono && 'num')}>{value}</dd>
    </>
  );
}
