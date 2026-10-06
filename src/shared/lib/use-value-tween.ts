'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * 수치가 바뀔 때 **직전 값에서 새 값으로 흘러간다**
 * `[사용자 요청 2026-09-16: 수치가 변경될 때에 대한 자연스러운 애니메이션]`.
 *
 * **이 훅은 없는 값을 화면에 띄운다.** 8.35에서 8.47로 가는 동안 계측된 적 없는 8.39·8.42가
 * 보인다 — 그래서 시간을 짧게 두고(`TWEEN_MS`) 끝에서 감속해 **마지막 자리가 읽히는 상태로
 * 멈춘다.** 정지 상태의 값은 언제나 실제 계측값이다.
 *
 * `wallboard/lib/use-count-up.ts`와 같은 짜임이되 **첫 렌더에서 0부터 세지 않는다.** 그쪽은
 * 벽 화면이라 «값이 도착했다»가 진입 연출이지만, 여기는 표와 타일이라 페이지를 열 때마다
 * 수십 칸이 0에서 올라오면 읽을 수 없다.
 *
 * **framer-motion을 쓰지 않는다** — 그 라이브러리를 import 할 수 있는 파일은 저장소에서
 * `shared/ui/motion.tsx` 하나뿐이고, 여기는 rAF만 있으면 된다.
 *
 * **페인트 **전에** 첫 프레임을 올린다.** `useEffect`로 두면 브라우저가 «새 값»을 이미 그린
 * 뒤에 트윈이 시작해, 값이 새 숫자로 튀었다가 **옛 숫자로 되감긴 뒤** 다시 흘러온다(실측으로
 * 그 순서가 그대로 보였다: `8.29 → 8.32 → 8.29`). 그래서 `useLayoutEffect`를 쓴다.
 *
 * 서버에는 레이아웃 단계가 없어 React가 경고하므로 환경에 따라 고른다 — 서버 렌더에서는
 * 어차피 직전 값이 없어(`from === null`) 트윈이 돌지 않는다.
 *
 * **`setState`를 레이아웃 단계에서 부른다.** 그 자리가 «페인트 전»이라 한 프레임이 더 그려지지
 * 않는다 — 대신 렌더가 한 번 더 도므로, 바꿀 것이 없을 때는 부르지 않는다.
 */
const TWEEN_MS = 420;

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** 서버에는 레이아웃 단계가 없다 — 그쪽에서는 아무 일도 하지 않는 `useEffect`로 떨어진다 */
const useTweenEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** ease-out cubic — 끝에서 느려져 마지막 자리가 읽힌다 */
function ease(t: number): number {
  return 1 - (1 - t) ** 3;
}

/**
 * `null`을 돌려주면 **흘러가는 중이 아니다** — 소비처가 받은 값을 그대로 그린다.
 *
 * 값이 아니라 `null`로 가르는 이유는 **멈춘 값이 원본 문자열 그 자체가 되게** 하려는 것이다.
 * 끝값을 이 훅이 만든 숫자로 두면 화면의 자릿수가 `decimalsOf()`의 해석에 매달리는데, 그쪽이
 * 틀리면 **틀렸다는 표시 없이 다른 수치가 적힌다.** 원본을 그리면 그 경로 자체가 없다.
 */
export function useValueTween(value: number | null): number | null {
  const fromRef = useRef<number | null>(null);
  const [tweened, setTweened] = useState<number | null>(null);

  useTweenEffect(() => {
    const from = fromRef.current;
    fromRef.current = value;

    /*
     * 흘려보낼 구간이 없는 경우 — 첫 값, 결측을 오감, 값이 그대로, 그리고 감속 설정.
     *
     * 감속 설정은 effect 안에서만 읽는다 — 렌더 중에 읽으면 서버가 모르는 값이 마크업에 섞인다.
     */
    if (
      from === null ||
      value === null ||
      from === value ||
      window.matchMedia(REDUCED_MOTION_QUERY).matches
    ) {
      /*
       * **남아 있던 트윈을 반드시 걷는다.**
       *
       * 흘러가던 중에 값이 결측이 되면 정리 함수가 rAF를 취소하는데, 그때 트윈 상태가 그대로
       * 남았다. 값이 다시 들어와도 이 갈래로 빠지므로(직전 값이 없다) **화면이 남은 숫자를
       * 계속 그렸다** — 오지 않은 수치를 적은 셈이다(`live-value.test.ts`가 잡았다).
       *
       * 흘러가는 동안 계측되지 않은 값이 보이는 것은 이 트윈의 대가지만, **멈춘 뒤의 값**은
       * 언제나 실제 계측값이어야 한다.
       */
      setTweened((current) => (current === null ? current : null));
      return;
    }

    /*
     * **첫 프레임을 여기서 올린다.** rAF에 맡기면 브라우저가 «새 값»을 한 프레임 그린 뒤에야
     * 트윈이 시작해, 값이 새 숫자로 튀었다가 옛 숫자로 되감긴다(실측: `8.38 → 8.35 → 8.38`).
     * 레이아웃 단계에서 세우면 그 프레임이 페인트되지 않는다.
     */
    setTweened(from);

    let raf = 0;
    /*
     * **시작 시각을 첫 프레임에서 잡는다.**
     *
     * `performance.now()`로 잡으면 rAF가 넘겨주는 시각이 그보다 **이를 수** 있다 — 그 값은
     * 콜백이 불린 때가 아니라 **프레임이 시작한 때**라서다. 그러면 진행도가 음수가 되고,
     * `ease()`가 1을 넘는 음수를 돌려줘 **값이 구간 밖으로 튄다.**
     *
     * 실제로 튀었다 — pH가 8.30으로 가는 길에 `6.98`, 8.18로 가는 길에 `10.25`가 한 프레임씩
     * 찍혔다(실측). 계측된 적 없는 값을 보이는 것이 이 트윈의 대가인데, **측정 범위 밖의 값**은
     * 그 대가에 포함되지 않는다 — pH 10.25는 화면이 거짓을 말한 것이다.
     *
     * 그래서 기준을 rAF의 시각으로 통일하고, 그래도 어긋날 때를 위해 진행도를 0~1로 가둔다.
     */
    let start: number | null = null;

    const tick = (now: number) => {
      start ??= now;
      const t = Math.min(1, Math.max(0, (now - start) / TWEEN_MS));
      setTweened(t >= 1 ? null : from + (value - from) * ease(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return tweened;
}
