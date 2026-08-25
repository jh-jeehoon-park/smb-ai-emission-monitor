'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

interface StickyBarProps {
  children: ReactNode;
  className?: string;
}

/**
 * 구역의 제목·탭 줄을 스크롤 중에 위에 붙여 둔다 `[사용자 지시 2026-08-24]`.
 *
 * 아래 격자가 길어 스크롤하면 **지금 어느 사업장을 보고 있는지**가 화면 밖으로 나간다.
 * 탭이 남아 있으면 그 답이 항상 보이고, 다른 사업장으로 옮기려고 위로 되감을 일도 없다.
 *
 * **붙으면 헤더의 아랫단이 된다** `[사용자 지시 2026-08-24]`. 헤더와 사이를 띄우고 모서리를
 * 둥글게 두었던 판본은 구역 면 위에 카드가 하나 더 떠 있는 것처럼 보였다 — 지금은 헤더와 같은
 * 흰 면에 아래 hairline만 두고, 본문 좌우 여백까지 넘겨 **본문 폭 전체를 덮는 띠**가 된다.
 * 그래야 아래 내용이 그 띠 뒤로 지나가는 것이 헤더 밑으로 지나가는 것과 같은 일로 읽힌다.
 *
 * **붙었는지는 감시자가 판단한다.** CSS만으로는 알 수 없고(`scroll-state` 질의는 아직
 * 쓸 수 없다), 스크롤 이벤트로 좌표를 재면 매 프레임 레이아웃을 읽는다. 위에 둔 1px 표식이
 * 헤더 밑으로 지나가는 순간만 관찰하면 그 두 문제가 함께 없어진다.
 */
export function StickyBar({ children, className }: StickyBarProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const headerH =
      Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--header-h'),
      ) || 0;

    const io = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting), {
      rootMargin: `-${headerH}px 0px 0px 0px`,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /*
   * 같은 구역 안의 다른 고정 요소(통합 관제의 지도 레일)는 **이 줄 아래**에서 멈춰야 한다.
   * 높이는 탭이 몇 줄로 접히는지에 따라 달라지므로 상수로 둘 수 없다 — 재서 변수로 넘긴다.
   */
  useEffect(() => {
    const el = barRef.current;
    const host = el?.parentElement;
    if (!el || !host || typeof ResizeObserver === 'undefined') return;

    const ro = new ResizeObserver(() => {
      host.style.setProperty('--sticky-bar-h', `${el.offsetHeight}px`);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      host.style.removeProperty('--sticky-bar-h');
    };
  }, []);

  return (
    <>
      <div ref={sentinelRef} aria-hidden className="h-px" />
      {/*
       * 붙었을 때 좌우로 넘기는 음수 여백은 **구역 패딩 + 본문 패딩**이다 —
       * 16+16=32px, `lg`에서 20+24=44px. 구역 패딩만 되돌리면 본문 여백만큼 좁은 띠가 되어
       * 헤더와 폭이 어긋난다. 그 위에 다시 주는 좌우 패딩은 **헤더와 같은 값**(16 / 24px)이라
       * 붙은 순간 제목의 왼쪽 끝이 헤더의 인사말과 한 줄로 선다 `[사용자 지시 2026-08-24]`.
       *
       * 위쪽 패딩은 **붙었을 때만** 준다 `[사용자 지시 2026-08-24]` — 헤더 바로 밑에 글자가
       * 닿아 두 줄이 붙어 보였다. 그만큼 높이가 늘어 아래 내용이 한 번 밀리는데, 붙는 순간에만
       * 일어나고 `--sticky-bar-h`를 보는 지도 레일도 같은 값을 따라간다.
       */}
      <div
        ref={barRef}
        data-stuck={stuck || undefined}
        className={cn(
          'sticky top-[var(--header-h)] z-10 -mt-2.5 space-y-3 py-2.5',
          'transition-[margin,padding,background-color,box-shadow] duration-200',
          stuck &&
            '-mx-8 border-b border-border bg-surface px-4 pb-3 pt-4 shadow-panel lg:-mx-11 lg:px-6',
          className,
        )}
      >
        {children}
      </div>
    </>
  );
}
