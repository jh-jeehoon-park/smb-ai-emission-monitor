'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { useMediaQuery } from '@/shared/lib/use-media-query';

interface StickyBarProps {
  children: ReactNode;
  className?: string;
}

/**
 * **띠가 붙는 폭** — `lg` 이상에서만 붙는다 `[사용자 결정 2026-09-18]`.
 *
 * **세 곳이 같은 값을 봐야 한다**: 이 상수(관측기·변수를 켤지) · 아래 `lg:` 클래스(붙일지) ·
 * 그리고 `--sticky-bar-h`를 읽는 쪽의 `,0px` 기본값. 어긋나면 «붙는데 관측기는 꺼진»
 * 반쪽 상태가 되고, 그 폭을 열어 보지 않으면 눈에 띄지 않는다.
 *
 * `48rem`은 로그인 화면의 값이고 **여기와 별개다** `[사용자 결정 2026-09-17: 로그인 화면만]`.
 * 셸의 분기는 `lg` 하나다.
 */
export const STICKY_BAR_QUERY = '(min-width: 64rem)';

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
 *
 * ---
 *
 * **좁은 화면에서는 붙지 않는다** `[사용자 결정 2026-09-18]`. 위 근거(2026-08-24)는 그대로
 * 남기고, 뒤집힌 이유를 적는다.
 *
 * 붙여 두면 **390px에서 헤더와 함께 258px(화면의 31%)을 상시 가져간다** — 탭 10개가 4행
 * 132px로 접히기 때문이다(실측). 내용에 586px만 남는다.
 *
 * **위 근거가 말한 둘이 좁은 화면에서는 다른 곳에 이미 있다.**
 *   · 「지금 어느 사업장인가」 — 패널 제목이 이미 「이상 탐지 결과 · 구미 염색 2공장」을 단다
 *   · 「위로 되감을 일」 — 사업장 전환이 **서랍의 선택기**에 있고(`lg` 미만에서만 그 자리다)
 *     `?site=`로 같은 상태를 쓴다. 맨 위로는 `TopButton`이 맡는다
 *     (`top-button.tsx`가 *"탭 줄이 붙어 있어도 요약 카드는 위에 있다"* 고 적어 둔 그 자리다)
 *
 * **`lg`인 이유는 두 가지가 그 선에서 겹치기 때문이다** — 사업장 선택이 헤더↔서랍으로 갈리는
 * 선이고, **탭이 한 줄로 들어가기 시작하는 선**이다(1024px에서 구역 본문 696px ≥ 한 줄 680px).
 * 즉 띠가 불어나는 폭에서만 해제한다. 새 단은 만들지 않았다.
 *
 * **CSS만 가르면 안 된다.** 관측기를 그대로 두면 좁은 화면에서 1px 표식이 헤더를 지나며
 * `stuck`이 켜져, **화면 밖으로 올라가는 띠에 음수 여백·패딩이 붙는다** — 아래 내용이 8px
 * 튀고 흰 띠가 스치듯 한 번 지나간다. 그래서 관측기를 아예 켜지 않는다.
 */
export function StickyBar({ children, className }: StickyBarProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  const canStick = useMediaQuery(STICKY_BAR_QUERY);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!canStick || !el || typeof IntersectionObserver === 'undefined') return;

    const headerH =
      Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--header-h'),
      ) || 0;

    const io = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting), {
      rootMargin: `-${headerH}px 0px 0px 0px`,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [canStick]);

  /*
   * 같은 구역 안의 다른 고정 요소(통합 관제의 지도 레일)는 **이 줄 아래**에서 멈춰야 한다.
   * 높이는 탭이 몇 줄로 접히는지에 따라 달라지므로 상수로 둘 수 없다 — 재서 변수로 넘긴다.
   *
   * **붙지 않는 폭에서는 내보내지 않는다** `[사용자 결정 2026-09-18]`. 소비처 셋 가운데
   * `anomaly-view`의 `scroll-mt`만 뷰포트 접두사가 없어 좁은 화면에도 그대로 듣는다 —
   * 붙지도 않는 띠 높이를 더하면 **스크롤 목적지가 그만큼 아래에서 멈춘다**(실측: 390px
   * `/anomaly`에서 「상세」를 누르면 헤더 아래 200px 밑에 섰다).
   *
   * 읽는 쪽을 고치지 않아도 되는 이유는 **소비처 셋 전부가 `var(--sticky-bar-h,0px)`로
   * 기본값을 들고 있어서**다 — 속성을 걷으면 0이 된다. 그 계약을 `sticky-bar.test.tsx`가
   * 저장소 전체에서 잠근다(기본값 없이 쓰면 `calc()`가 통째로 무효가 된다).
   */
  useEffect(() => {
    const el = barRef.current;
    const host = el?.parentElement;
    if (!canStick || !el || !host || typeof ResizeObserver === 'undefined') return;

    const ro = new ResizeObserver(() => {
      host.style.setProperty('--sticky-bar-h', `${el.offsetHeight}px`);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      host.style.removeProperty('--sticky-bar-h');
    };
  }, [canStick]);

  return (
    <>
      <div ref={sentinelRef} aria-hidden className="h-px" />
      {/*
       * 붙었을 때 좌우로 넘기는 음수 여백은 **구역 패딩 + 본문 패딩**이다 — 20+24=**44px**
       * (`-mx-11`). 구역 패딩만 되돌리면 본문 여백만큼 좁은 띠가 되어 헤더와 폭이 어긋난다.
       * 그 위에 다시 주는 좌우 패딩은 **헤더와 같은 값**(24px)이라 붙은 순간 제목의 왼쪽 끝이
       * 헤더의 인사말과 한 줄로 선다 `[사용자 지시 2026-08-24]`.
       *
       * **좁은 화면용 32px 분기(`-mx-8`·`px-4`)는 걷었다** — 붙는 일이 `lg` 이상에만 있어
       * 닿지 않는 값이 됐다 `[사용자 결정 2026-09-18]`.
       *
       * 위쪽 패딩은 **붙었을 때만** 준다 `[사용자 지시 2026-08-24]` — 헤더 바로 밑에 글자가
       * 닿아 두 줄이 붙어 보였다. 그만큼 높이가 늘어 아래 내용이 한 번 밀리는데, 붙는 순간에만
       * 일어나고 `--sticky-bar-h`를 보는 지도 레일도 같은 값을 따라간다.
       */}
      <div
        ref={barRef}
        /*
         * **`canStick`을 함께 본다.** 넓게 열었다가 좁히면 `stuck`이 `true`로 남는데,
         * 그 상태로 겉면이 켜지면 붙지도 않은 띠에 음수 여백이 붙는다. effect에서
         * `setStuck(false)`로 되돌리지 않는 이유는 그쪽이 `react-hooks/set-state-in-effect`에
         * 걸리고, 파생으로 읽으면 그럴 필요가 없기 때문이다.
         */
        data-stuck={(stuck && canStick) || undefined}
        className={cn(
          'lg:sticky lg:top-[var(--header-h)] lg:z-10',
          '-mt-2.5 space-y-3 py-2.5',
          'transition-[margin,padding,background-color,box-shadow] duration-200',
          stuck &&
            canStick &&
            '-mx-11 border-b border-border bg-surface px-6 pb-3 pt-4 shadow-panel',
          className,
        )}
      >
        {children}
      </div>
    </>
  );
}
