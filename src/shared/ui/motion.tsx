'use client';

import { MotionConfig, motion, type Variants } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * 운영 화면의 모션은 '값이 살아 있다'는 것만 전달하면 된다.
 * 화면 진입 때 한 번 정렬되듯 올라오고, 그 뒤에는 값이 바뀔 때만 움직인다.
 */
const RISE_DISTANCE_PX = 10;
const STAGGER_SECONDS = 0.045;

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export const staggerGroup: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: STAGGER_SECONDS, delayChildren: 0.04 } },
};

export const riseItem: Variants = {
  hidden: { opacity: 0, y: RISE_DISTANCE_PX },
  show: { opacity: 1, y: 0, transition: { duration: 0.34, ease: [0.16, 1, 0.3, 1] } },
};

/**
 * 감속 설정 대응을 **렌더가 아니라 framer-motion 내부에 맡긴다.**
 *
 * `useReducedMotion()`은 서버에서 null, 클라이언트 첫 렌더에서 matchMedia 값을 준다.
 * 그 값으로 `initial`을 가르면 서버가 그린 style과 클라이언트가 그릴 style이 달라져
 * hydration이 깨진다 — 감속을 켠 사용자에게만 터지므로 발견도 늦다.
 *
 * `reducedMotion="user"`를 주면 마크업은 모두에게 똑같이 나가고, framer-motion이
 * **마운트 후** 설정을 읽어 위치·크기 계열(transform·width·height 등)을 즉시 끝낸다.
 * 기본값은 "never"라 이 래퍼가 없으면 감속 설정이 무시된다.
 */
export function MotionPreferences({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

export function StaggerGroup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={className} variants={staggerGroup} initial="hidden" animate="show">
      {children}
    </motion.div>
  );
}

export function RiseItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={className} variants={riseItem}>
      {children}
    </motion.div>
  );
}

interface CountUpProps {
  value: number;
  decimals?: number;
  className?: string;
  durationMs?: number;
}

/**
 * 계측값이 자리에 '앉는' 느낌을 준다. 자릿수는 CSS의 tabular-nums가 고정하므로
 * 숫자가 올라가는 동안에도 폭이 흔들리지 않는다.
 */
export function CountUp({ value, decimals = 0, className, durationMs = 700 }: CountUpProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    /* 감속 설정은 effect 안에서만 읽는다. 렌더 중에 읽으면 서버가 알 수 없는 값이
       마크업에 섞여 hydration이 깨진다. 여기서는 시간만 0으로 만들어 첫 프레임에 앉힌다. */
    const reduce = window.matchMedia(REDUCED_MOTION_QUERY).matches;
    const duration = reduce ? 0 : durationMs;

    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const p = duration <= 0 ? 1 : Math.min(1, (now - start) / duration);
      setProgress(1 - (1 - p) ** 3);
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  return <span className={cn('num', className)}>{(value * progress).toFixed(decimals)}</span>;
}

export { motion };
