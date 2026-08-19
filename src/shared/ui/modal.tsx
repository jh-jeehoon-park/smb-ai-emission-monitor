'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { Eyebrow } from './eyebrow';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  eyebrow?: string;
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
 * 배경은 **불투명 면 위의 반투명 막**이다 — 막이 없으면 뒤 화면의 숫자가 비쳐 읽히고,
 * 계측값이 겹쳐 보이면 어느 쪽이 이 사업장 값인지 알 수 없다(R12는 콘텐츠 면에 대한 규칙이라
 * 오버레이 자체에는 적용되지 않는다).
 */
export function Modal({
  open,
  onOpenChange,
  title,
  eyebrow,
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
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/55" />
        <Dialog.Content
          onCloseAutoFocus={(event) => {
            const target = opener.current;
            if (!target?.isConnected) return;
            event.preventDefault();
            target.focus();
          }}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2',
            // 내용이 길면 모달 안에서 스크롤한다. 화면 밖으로 밀리면 닫기 버튼을 못 누른다
            'max-h-[calc(100vh-3rem)] overflow-y-auto',
            'rounded-[6px] border border-border-strong bg-surface shadow-xl',
            className,
          )}
        >
          <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
            <div className="min-w-0">
              {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
              <Dialog.Title className="text-[13px] font-semibold leading-snug text-fg">
                {title}
              </Dialog.Title>
            </div>
            <Dialog.Close
              aria-label="닫기"
              className="shrink-0 cursor-pointer rounded-[4px] border border-border p-1 text-fg-subtle transition-colors duration-200 hover:border-border-strong hover:text-fg"
            >
              <X aria-hidden size={13} strokeWidth={1.9} />
            </Dialog.Close>
          </header>

          <div className="p-4">{children}</div>

          {footer && (
            <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-4 py-3">
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
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-[12px]">{children}</dl>
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
      <dt className="text-fg-subtle">{label}</dt>
      <dd className={cn('min-w-0 text-fg', mono && 'num')}>{value}</dd>
    </>
  );
}
