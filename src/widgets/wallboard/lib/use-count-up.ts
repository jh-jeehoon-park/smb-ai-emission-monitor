'use client';

import { useEffect, useRef, useState } from 'react';
import { WALL_COUNT_MS } from '../config/constants';

/** 감속 설정 질의 — `shared`의 것과 같은 문자열이지만 이 화면은 자기 부품만 쓴다 */
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

interface Run {
  from: number;
  to: number;
  /** 0~1 진행도 */
  t: number;
}

/** ease-out cubic — 끝에서 느려져 마지막 자리가 읽힌다 */
function ease(t: number): number {
  return 1 - (1 - t) ** 3;
}

/**
 * 큰 수가 **바뀔 때마다** 이전 값에서 새 값으로 흘러간다.
 *
 * `shared/ui/motion.tsx`의 `CountUp`을 쓰지 않는다 `[사용자 요청 2026-09-11: 기존의 컴포넌트를
 * 활용하지 않고 새로 구축]`. 그쪽과 다른 점이 하나 더 있다 — **`CountUp`은 0에서 올라오고
 * 이것은 «직전 값»에서 움직인다.** 벽 화면은 한 번 켜고 종일 두는 곳이라 갱신이 진짜 사건이고,
 * 매번 0에서 다시 세면 **바뀌지 않은 값도 움직인 것처럼 보인다.**
 *
 * 첫 렌더에서는 0에서 올라온다 — 그때는 진입이라 «값이 도착했다»가 맞다.
 *
 * **framer-motion을 쓰지 않는다.** 그 라이브러리를 import 할 수 있는 파일은 저장소에서
 * `shared/ui/motion.tsx` 하나뿐이고(그 파일이 스스로 그렇게 적어 두었다), 여기는 rAF만 있으면 된다.
 *
 * **`setState`를 effect 본문에서 바로 부르지 않는다** — rAF 콜백 안에서만 부른다. 동기로
 * 부르면 렌더가 연쇄로 돌고 `react-hooks/set-state-in-effect`가 그것을 막는다. 움직이지 않는
 * 경우(값이 그대로거나 감속 설정)는 **상태를 건드리지 않고** 받은 값을 그대로 그린다.
 *
 * 감속 설정은 effect 안에서만 읽는다 — 렌더 중에 읽으면 서버가 알 수 없는 값이 마크업에
 * 섞여 hydration이 깨진다.
 */
export function useCountUp(value: number, decimals: number): string {
  const fromRef = useRef(0);
  const [run, setRun] = useState<Run | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    fromRef.current = value;

    if (from === value) return;
    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) return;

    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / WALL_COUNT_MS);
      setRun(t < 1 ? { from, to: value, t } : null);
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  /* 진행 중인 전이가 **지금 값의 것일 때만** 쓴다 — 값이 또 바뀌면 옛 전이는 버린다 */
  const shown = run !== null && run.to === value ? run.from + (value - run.from) * ease(run.t) : value;

  return shown.toFixed(decimals);
}
