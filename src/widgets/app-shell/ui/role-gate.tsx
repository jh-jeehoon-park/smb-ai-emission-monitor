'use client';

import { usePathname } from 'next/navigation';
import { useSyncExternalStore, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { ROLES, useRole } from '@/entities/user';
import { isBlockedFor } from '../config/navigation';

/**
 * 역할에 닫힌 화면을 **그리지 않는다** `[사용자 결정 2026-09-15]`.
 *
 * **보내는 일은 여기서 하지 않는다** — `useRoleRouteGuard`가 `/403`으로 옮긴다. 한때 이
 * 부품이 직접 보냈는데, 역할 전환과 동시에 두 곳이 이동을 걸어 **마지막 `replace`가 이기는
 * 경쟁**이 됐다 `[설계 2026-09-16: 리다이렉트 검토]`. 지금은 **이동은 가드, 렌더는 여기**로 나뉘고 판단만
 * `isBlockedFor` 하나를 함께 쓴다.
 *
 * **가드가 보내기만 해서는 옛 상태와 같다.** 클라이언트 이동은 시간이 걸리고 그동안 본문이
 * 보인다 — 전에는 가드가 렌더 뒤에 홈으로 옮겼고 권한 없는 본문이 **1.61~11.75초** 그대로
 * 보였다(실측). 가드가 막으려던 것을 가드가 보여 주고 있었다. 그래서 여기서 두 단으로 막는다.
 *
 * | 언제 | 누가 가리는가 |
 * |---|---|
 * | 서버 · 첫 클라이언트 렌더 | **CSS** — `<head>` 스크립트가 첫 페인트 전에 붙인 `data-role` |
 * | 하이드레이션 뒤 | **React** — 자식을 버린다 |
 *
 * 둘째 단이 필요한 이유는 `display: none`이 **언마운트가 아니기** 때문이다. 가려진 화면도
 * 폴링·시계·`ResizeObserver`가 돌고, 현황판은 `document.body`의 클래스를 직접 만진다 —
 * 보이지 않는 화면이 문서 전역 상태를 건드리는 것은 성능이 아니라 **부작용** 문제다.
 *
 * **이것은 인가가 아니다**(**E6** 예외). 서버가 없어 역할은 브라우저가 들고 있을 뿐이고, 막힌
 * 화면도 서버에서 한 번은 렌더된다. 백엔드가 서면 서버가 걸러 보낸다.
 */
export function RoleGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const { role } = useRole();

  /*
   * **메뉴에 없는 경로는 가르지 않는다.** `canRoleSee`는 미등재를 전 역할 차단으로 읽으므로
   * 그대로 쓰면 목록 밖의 주소가 전부 403이 된다 — 없는 주소는 404가 받을 일이다.
   * `isBlockedFor`가 그 판단을 갖고 있고 가드도 같은 것을 쓴다.
   */
  const hidden = ROLES.filter((r) => isBlockedFor(pathname, r));

  /* 세 역할 모두에게 열린 화면은 감싸지도 않는다 — 트리가 지금과 완전히 같다 */
  if (hidden.length === 0) return <>{children}</>;

  const blocked = hidden.includes(role);

  return (
    /*
     * `contents`는 레이아웃에 투명하다 — 이 래퍼가 `<main>`의 자식 자리를 차지하지 않는다.
     * 가려야 할 때는 `role-hide-*`(0,2,0)가 `.contents`(0,1,0)를 특이도로 이겨 `none`이 된다.
     *
     * **래퍼는 하이드레이션 전후로 같은 자리에 남는다** — 트리 모양이 바뀌면 허용 역할의
     * 화면이 통째로 다시 마운트되어 차트가 다시 그려지고 쿼리가 다시 돈다.
     */
    <div
      data-role-gated
      className={cn('contents', !hydrated && hidden.map((r) => `role-hide-${r}`))}
    >
      {hydrated && blocked ? null : children}
    </div>
  );
}

/**
 * 하이드레이션이 끝났는가. 끝나기 전에는 서버와 **같은 트리**를 그린다.
 *
 * `useSyncExternalStore`가 서버 스냅샷과 클라이언트 스냅샷을 따로 받는다 — 서버와 하이드레이션
 * 중에는 `false`, 그 뒤 첫 렌더부터 `true`다. `useEffect`에서 `setState`하는 판본은 같은 일을
 * 하지만 **연쇄 렌더를 만들어** `react-hooks/set-state-in-effect`가 막는다.
 *
 * 구독은 빈 함수다 — 이 값은 한 번 참이 되면 바뀌지 않는다.
 */
function useHydrated(): boolean {
  return useSyncExternalStore(subscribeNever, snapshotHydrated, snapshotServer);
}

const subscribeNever = () => () => {};
const snapshotHydrated = () => true;
const snapshotServer = () => false;
