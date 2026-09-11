'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { useRole } from '@/entities/user';
import { useSiteHref } from '@/features/site-selection';
import { WALLBOARD_CURSOR_IDLE_CLASS, WALLBOARD_EXIT_HIDE_MS } from '../config/constants';
import { homeHrefFor } from '../config/navigation';

/**
 * 현황판에서 나가는 길 — **셸이 갖는다.**
 *
 * `[사용자 지적 2026-09-11: 현재 현황판 페이지에서 나갈 수 있는 방법이 없는데 방법이 필요함]`.
 *
 * 그 화면은 사이드바도 헤더도 그리지 않아(`AppShell`의 `WALLBOARD_HREF` 분기) **전체화면으로
 * 띄우면 돌아갈 곳이 화면 어디에도 없었다.** 브라우저 뒤로 가기는 주소로 직접 열었을 때
 * 소용이 없고, 키오스크·전체화면에서는 그 버튼 자체가 보이지 않는다.
 *
 * ## 왜 위젯 안이 아니라 셸에 두는가
 *
 * 목적지를 정하는 `homeHrefFor`와 역할은 **셸의 것**이고, 위젯끼리는 서로 import 할 수 없다
 * (FSD §8). `wallboard` 안에 두면 같은 문자열을 두 곳에 적어야 한다.
 *
 * 덤으로 그 화면의 명제가 지켜진다 — `SCR-AD-006` §7.4가 *"누를 것이 없다"* 로 hover 반응을
 * 없앴고 `WallPanel`이 그 위에서 강조 틱의 포인트색을 정당화한다. 나가는 길은 **화면의
 * 일부가 아니라 그 화면을 감싼 껍데기의 것**이라, 위젯 안의 「조작 0」은 그대로다.
 *
 * ## 늘 보이지는 않는다
 *
 * 주관사 요구가 *"모니터에 그냥 띄어놓고 보지, 계속 움직이거나 이동하는 것은 지양한다"* 라
 * 버튼을 상시로 두면 벽에 쓸모없는 조작이 남는다. **포인터가 움직이거나 키를 누르면
 * 나타나고 손을 떼면 사라진다** — 벽에서는 아무도 만지지 않으므로 영영 나타나지 않고,
 * 기계 앞에 선 사람에게만 보인다. 영상 재생기의 제어 막대와 같은 관용구다.
 *
 * **마우스 포인터도 함께 사라진다** `[사용자 요청 2026-09-11: 현황판 나가기 출력되는 것처럼
 * 마우스 포인트도 사라지도록]`. 같은 상태를 보므로 둘이 갈리지 않는다 — 버튼은 없는데
 * 화살표만 벽에 남아 있으면 «누를 것이 있다»는 신호가 된다. 규칙은 `globals.css`의
 * `.wall-cursor-idle`이 갖는다.
 *
 * **새 무한 반복이 아니다**(§8 `모션`). 사람의 조작에 대한 한 번의 반응이고, 아무 일도
 * 없으면 아무것도 움직이지 않는다.
 *
 * **진입 직후 한 번은 보인다.** 그러지 않으면 «있는데 아무도 모르는 길»이 된다 — 화면을
 * 처음 여는 사람에게 나가는 길이 있다는 것을 알리고 곧 사라진다(§8 `진입 모션`과 같은 갈래).
 *
 * ## 링크가 아니라 버튼인 이유
 *
 * **서버는 역할을 모른다.** 링크로 두면 `BrandHome`처럼 목적지마다 한 벌씩 그리고 CSS가
 * 골라야 하는데(그러지 않으면 하이드레이션이 깨진다), 평소 보이지도 않는 오버레이 하나에
 * 그 값을 치를 이유가 없다. 그리고 버튼으로 두면 **`Esc`와 같은 코드 경로**를 쓴다 —
 * 둘이 갈리면 한쪽만 고쳐진다.
 */
export function WallboardExit() {
  const { role } = useRole();
  const withSite = useSiteHref();
  const router = useRouter();

  const [visible, setVisible] = useState(true);
  const hideTimer = useRef<number | undefined>(undefined);

  /*
   * 목적지를 ref로 들고 있는다 — 아래 리스너의 의존성에 넣으면 역할·쿼리가 바뀔 때마다
   * 붙였다 떼면서 숨김 타이머가 되살아나 버튼이 이유 없이 다시 뜬다.
   *
   * **쓰는 것은 렌더가 아니라 effect에서 한다** — 렌더 중에 `ref.current`를 건드리면
   * `react-hooks/refs`가 막는다(그 규칙이 실제로 잡았다).
   */
  const target = withSite(homeHrefFor(role));
  const leaveTo = useRef(target);

  useEffect(() => {
    leaveTo.current = target;
  }, [target]);

  useEffect(() => {
    const hideSoon = () => {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => setVisible(false), WALLBOARD_EXIT_HIDE_MS);
    };
    const reveal = () => {
      setVisible(true);
      hideSoon();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        router.push(leaveTo.current);
        return;
      }
      reveal();
    };

    /* 진입 직후 한 번 보인 것을 여기서 거둔다 — 초기값이 `true`라 여는 일은 필요 없다 */
    hideSoon();
    window.addEventListener('pointermove', reveal, { passive: true });
    window.addEventListener('keydown', onKey);

    return () => {
      window.clearTimeout(hideTimer.current);
      window.removeEventListener('pointermove', reveal);
      window.removeEventListener('keydown', onKey);
    };
  }, [router]);

  /*
   * **버튼이 사라질 때 포인터도 함께 사라진다** `[사용자 요청 2026-09-11]`.
   *
   * 같은 상태를 보므로 둘이 갈리지 않는다 — 하나는 있고 하나는 없는 순간이 생기면 «조작이
   * 가능한가»가 두 말을 한다.
   *
   * **React 밖의 노드를 만지므로 떠날 때 반드시 되돌린다.** 정리하지 않으면 다른 화면으로
   * 옮겨 간 뒤에도 포인터가 돌아오지 않아, 원인이 지금 보고 있는 화면에 없는 고장이 된다.
   */
  useEffect(() => {
    const body = document.body;
    body.classList.toggle(WALLBOARD_CURSOR_IDLE_CLASS, !visible);
    return () => body.classList.remove(WALLBOARD_CURSOR_IDLE_CLASS);
  }, [visible]);

  return (
    <button
      type="button"
      onClick={() => router.push(leaveTo.current)}
      aria-keyshortcuts="Escape"
      className={cn(
        /* 오른쪽 아래 — §8 `되감기 버튼`이 이미 쓰는 자리라 같은 곳에서 찾게 된다 */
        'fixed bottom-6 right-6 z-30 flex cursor-pointer items-center gap-2 rounded-full',
        'border border-accent bg-accent px-4 py-2.5 text-[14px] font-semibold text-white shadow-panel',
        'transition-opacity duration-300',
        /*
         * 숨을 때 **탭 순서에서는 빠지지 않는다.** 이 화면의 유일한 조작이라 키보드 사용자가
         * 닿을 길이 여기뿐이고, 포커스가 오면 다시 드러난다.
         */
        visible ? 'opacity-100' : 'pointer-events-none opacity-0',
        'focus-visible:pointer-events-auto focus-visible:opacity-100',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
      )}
    >
      <LogOut aria-hidden size={16} strokeWidth={2} />
      현황판 나가기
      {/* 키 하나로도 나갈 수 있다는 것을 글자가 말한다 — 벽에는 이 버튼을 누를 손이 없다 */}
      {/* §8 `글자 최소`가 12px이라 더 줄이지 않는다 — 예외는 그래프 안의 글자뿐이다 */}
      <span className="rounded-chip bg-white/20 px-1.5 py-0.5 text-[12px] font-medium">Esc</span>
    </button>
  );
}
