'use client';

import { ArrowUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/shared/lib/cn';

/** 이만큼 내려간 뒤에야 나타난다. 한 화면 높이의 절반쯤이면 "되감고 싶다"가 생긴다 */
const SHOW_AFTER_PX = 320;

/**
 * 맨 위로 되감는 버튼 `[사용자 지시 2026-08-24]`.
 *
 * 운영 화면이 길다 — 통합 관제는 요약 카드 10장 + 상세 5카드, 이상 탐지는 표 10줄 + 3카드다.
 * 스크롤을 내린 뒤 사업장 탭이나 요약으로 돌아가려면 그만큼 되감아야 했다(탭 줄이 붙어 있어도
 * 요약 카드는 위에 있다).
 *
 * **내려간 뒤에만 나타난다.** 맨 위에서 보이면 아무 일도 하지 않는 버튼이 화면 한 구석을 계속
 * 차지한다. 나타남·사라짐은 불투명도와 살짝 뜨는 이동으로 잇고, 숨은 동안은 `pointer-events-none`
 * 으로 클릭을 받지 않는다(투명한데 눌리면 그 자리의 카드를 못 누른다).
 *
 * 스크롤 위치는 `IntersectionObserver`로 본다 — 스크롤 이벤트마다 좌표를 재면 매 프레임
 * 레이아웃을 읽는다. 본문 맨 위에 둔 1px 표식이 화면에서 벗어나는 순간만 관찰하면 된다.
 */
export function TopButton() {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const io = new IntersectionObserver(([entry]) => setShown(!entry.isIntersecting), {
      rootMargin: `${SHOW_AFTER_PX}px 0px 0px 0px`,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} aria-hidden className="h-px" />
      {/*
       * `fixed` 위치는 뷰포트 기준이라 사이드바와 무관하게 오른쪽 아래에 남는다.
       * 좁은 화면에서는 여백을 줄여(16px) 카드와 겹치는 폭을 아낀다.
       *
       * `aria-hidden`을 숨은 동안 함께 걸어 보조기술의 탭 순서에서도 빠진다 — 보이지 않는
       * 버튼이 순서에 남으면 키보드로 훑을 때 정체를 알 수 없는 정거장이 된다.
       */}
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-hidden={!shown}
        tabIndex={shown ? 0 : -1}
        aria-label="맨 위로 이동"
        className={cn(
          'fixed bottom-4 right-4 z-20 flex size-10 items-center justify-center rounded-full',
          'border border-card-border bg-surface text-fg-muted shadow-panel',
          'transition-[opacity,transform,color,background-color] duration-200',
          'hover:bg-accent-weak hover:text-accent lg:bottom-6 lg:right-6',
          shown
            ? 'translate-y-0 cursor-pointer opacity-100'
            : 'pointer-events-none translate-y-2 opacity-0',
        )}
      >
        <ArrowUp aria-hidden size={18} strokeWidth={2} />
      </button>
    </>
  );
}
