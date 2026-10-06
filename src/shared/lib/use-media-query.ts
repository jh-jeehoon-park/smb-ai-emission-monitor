'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * 지금 이 미디어 질의가 **맞는가** `[사용자 요청 2026-09-17]`.
 *
 * **서버는 폭을 모른다.** 그래서 서버와 하이드레이션 중에는 `false`를 주고, 그 뒤 첫 렌더부터
 * 실제 값을 준다 — 서버가 그린 마크업과 클라이언트의 첫 렌더가 같아 **하이드레이션이 어긋날
 * 자리가 없다.** 이 저장소가 세 번 깨졌던 바로 그 종류를 피하는 방법이고, `role-gate.tsx`의
 * 하이드레이션 판정과 `login-view.tsx`의 «기억해 둔 아이디»가 같은 짜임이다.
 *
 * **`useEffect` + `setState` 판본을 쓰지 않는다** — 렌더가 한 번 더 돌고
 * `react-hooks/set-state-in-effect`가 막는다.
 *
 * **«맞지 않는다»를 기본으로 두는 이유**: 이 값으로 «무거운 것을 얹을지»를 정한다. 반대로
 * 두면 서버가 무거운 쪽을 그려 놓고 좁은 화면에서 걷어내게 되는데, 그때는 이미 내려받은 뒤다.
 *
 * **질의를 인자로 받는다.** 한때 `useIsDesktop()`이라는 이름으로 `lg`(64rem)를 박아 두고
 * «사이드바와 로그인이 같은 값을 본다»를 근거로 삼았는데, 2026-09-17에 **로그인만 768px로
 * 내려가며 그 전제가 깨졌다** `[사용자 결정 2026-09-17]`. 값을 쓰는 쪽이 들고 있어야 어느
 * 화면의 분기인지가 드러난다.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    },
    [query],
  );

  const matchesNow = useCallback(() => window.matchMedia(query).matches, [query]);

  return useSyncExternalStore(subscribe, matchesNow, serverSnapshot);
}

/** 서버에는 화면이 없다 — «모른다»를 «아니다»로 답한다(위 주석의 기본값 규칙) */
function serverSnapshot(): boolean {
  return false;
}
