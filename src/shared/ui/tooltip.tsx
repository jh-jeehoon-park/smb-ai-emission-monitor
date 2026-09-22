'use client';

import * as RadixTooltip from '@radix-ui/react-tooltip';
import { Info } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * 호버·포커스로 열리는 짧은 설명.
 *
 * 직접 만들지 않는다 — 위치 뒤집기·화면 밖 회피·ESC·터치 대응을 Radix가 이미 한다.
 * 이 파일이 정하는 것은 생김새뿐이며 카드·모달과 같은 계열을 쓴다.
 *
 * **여기에 값을 담지 않는다.** 툴팁은 마우스를 올린 사람만 볼 수 있어, 계측값처럼
 * 반드시 읽혀야 하는 것은 본문에 둔다(E3). 보조 설명에만 쓴다.
 */
export function Tooltip({
  content,
  children,
  side = 'bottom',
}: {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}) {
  return (
    <RadixTooltip.Provider delayDuration={120}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            sideOffset={6}
            collisionPadding={12}
            className="z-50 max-w-[min(320px,calc(100vw-2rem))] rounded-nested border border-border-strong bg-surface px-2.5 py-2 text-[12px] leading-relaxed text-fg-muted shadow-lg"
          >
            {content}
            <RadixTooltip.Arrow className="fill-surface" />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}

/**
 * 인포 아이콘 + 툴팁. 상시 노출할 필요는 없지만 필요할 때 찾을 수 있어야 하는 설명에 쓴다
 * `[사용자 지시 2026-08-24]`.
 *
 * `aria-label`을 받는 이유: 아이콘만 있는 버튼은 보조기술에 이름이 없다. 툴팁 본문은
 * 열려야 읽히므로 닫힌 상태의 이름을 따로 준다.
 */
export function InfoTip({
  content,
  label,
  side,
}: {
  content: ReactNode;
  label: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
}) {
  return (
    <Tooltip content={content} side={side}>
      {/*
       * **보이는 크기는 16px인데 누르는 자리는 40px이다** `[사용자 요청 2026-09-21]`.
       * `ICON_BUTTON`이 헤더에서 쓰는 것과 같은 짜임이다 — `before`가 여백을 넓히므로
       * **줄 높이를 바꾸지 않아** 제목 옆에 붙은 자리가 그대로다(실측으로 전 화면 16px였다).
       */}
      <button
        type="button"
        aria-label={label}
        className='relative shrink-0 cursor-help text-fg-subtle transition-colors duration-200 before:absolute before:-inset-3 before:content-[""] hover:text-accent'
      >
        <Info aria-hidden size={16} strokeWidth={1.9} />
      </button>
    </Tooltip>
  );
}
