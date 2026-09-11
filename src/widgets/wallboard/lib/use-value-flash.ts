'use client';

import { useEffect, useRef, useState } from 'react';
import { WALL_FLASH_MS } from '../config/constants';

/**
 * **값이 바뀌었다는 것만 알린다** `[사용자 요청 2026-09-10: 데이터가 변동 될 때에 대한
 * 가벼운 모션은 있었으면 좋겠음]`.
 *
 * 벽에 걸어 둔 화면은 아무도 보고 있지 않다가 눈이 한 번 스친다. 그때 **어느 칸이 방금
 * 바뀌었는지**가 보이면 그 칸부터 읽게 된다 — 그것이 이 훅이 하는 전부다.
 *
 * **새 무한 반복이 아니다**(§8 `모션`). 한 번 켜졌다 꺼지는 전이이고, `motion.tsx`가 스스로
 * 적어 둔 명제가 이미 이것이다 — *"화면 진입 때 한 번 정렬되듯 올라오고, 그 뒤에는 **값이
 * 바뀔 때만** 움직인다."*
 *
 * **첫 렌더에는 켜지지 않는다** — 진입 모션(`RiseItem`·`CountUp`)이 이미 그 자리를 맡고
 * 있어 둘이 겹치면 무엇이 «바뀐 것»인지 흐려진다.
 *
 * 감속 설정은 전역 CSS가 `transition-duration`을 0으로 끊어 하이라이트가 즉시 사라진다.
 */
export function useValueFlash(value: number | string | null): boolean {
  const previous = useRef(value);
  const [flashing, setFlashing] = useState(false);

  useEffect(() => {
    if (previous.current === value) return;
    previous.current = value;
    setFlashing(true);

    const id = window.setTimeout(() => setFlashing(false), WALL_FLASH_MS);
    return () => window.clearTimeout(id);
  }, [value]);

  return flashing;
}
