'use client';

import { cn } from '@/shared/lib/cn';
import { motion } from '@/shared/ui/motion';

/** 트랙. 안쪽 그림자로 홈처럼 파이고, 채움이 그 위에 얹힌 것으로 읽힌다 */
const TRACK = 'relative h-2 w-full overflow-hidden rounded-full bg-surface-3 shadow-track';

interface MeterBarProps {
  /** 0~100. 범위를 벗어난 값은 잘라 넣는다 — 트랙을 넘치면 길이가 거짓이 된다 */
  percent: number;
  /** 채움 색. 등급색·운전색 등 **뜻이 있는 색**만 넘긴다 */
  color: string;
  /**
   * 가운데에서 좌우로 벌어지는 막대. 증감처럼 **방향이 값의 일부**일 때만 쓴다.
   * `direction`이 없으면 왼쪽에서 자란다.
   */
  direction?: 'up' | 'down';
  /** 여러 막대를 차례로 채울 때의 지연(초) */
  delay?: number;
  className?: string;
}

/**
 * 값 하나를 길이로 보이는 막대 `[사용자 지시 2026-08-24]`.
 *
 * 통합 관제의 XAI 기여 막대가 기준이고, 운영 최적화의 주입량·운전 조건 막대가 같은 것을 쓴다 —
 * 세 곳이 각자 트랙과 채움을 만들던 판본에서는 높이(2 vs 2.5px)·홈 유무·그라데이션 유무가
 * 갈려 같은 화면 안에서 다른 부품으로 보였다.
 *
 * 채움은 **왼쪽이 진하고 오른쪽으로 밝아진다** — 길이의 끝이 어디인지 눈에 남는다.
 * 폭 0에서 자라는 진입 모션도 여기 한 곳에 있다(감속 설정은 `MotionPreferences`가 끝낸다).
 */
export function MeterBar({ percent, color, direction, delay = 0, className }: MeterBarProps) {
  const width = Math.max(0, Math.min(100, percent));
  const fill = `linear-gradient(to right, ${color}, color-mix(in srgb, ${color} 55%, var(--surface)))`;

  if (!direction) {
    return (
      <div className={cn(TRACK, className)}>
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundImage: fill }}
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    );
  }

  /*
   * 가운데를 0으로 두고 좌우로 벌어진다. 부호만 적으면 크기가 비교되지 않고, 방향을 색으로만
   * 말하면 색 하나에 두 가지 뜻(방향 · 상태)이 겹친다 — 자라는 쪽이 방향을 맡는다.
   *
   * 오른쪽으로 자랄 때는 그라데이션도 가운데에서 밖으로 밝아져야 한다. 왼쪽으로 자라는 막대는
   * 같은 그라데이션을 **뒤집어** 써서 가운데가 진한 쪽으로 남는다.
   */
  const up = direction === 'up';
  return (
    <div className={cn(TRACK, className)}>
      <motion.div
        className={cn('absolute top-0 h-full', up ? 'left-1/2 rounded-r-full' : 'rounded-l-full')}
        style={{
          backgroundImage: up
            ? fill
            : `linear-gradient(to left, ${color}, color-mix(in srgb, ${color} 55%, var(--surface)))`,
          ...(up ? {} : { right: '50%' }),
        }}
        initial={{ width: 0 }}
        animate={{ width: `${width / 2}%` }}
        transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}
