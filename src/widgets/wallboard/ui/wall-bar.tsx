import { cn } from '@/shared/lib/cn';

/**
 * 막대 하나 — **`MeterBar`를 쓰지 않고 새로 만든다** `[사용자 요청 2026-09-11]`.
 *
 * §8 `막대·게이지`가 정한 두 가지는 그대로 지킨다: **트랙에 안쪽 그림자**(`--track-inset`)와
 * **채움에 한 방향 그라데이션** — 채움이 홈에 얹힌 것으로 읽히고 왼쪽이 진해 길이의 끝이
 * 눈에 남는다.
 *
 * `MeterBar`와 갈리는 곳은 셋이다:
 * 1. **높이를 부르는 쪽이 정한다** — 벽에서는 2~3m 밖에서 보이도록 10px 안팎이 필요한데
 *    그쪽은 책상용 두께에 맞춰져 있다
 * 2. **framer-motion을 쓰지 않는다** — CSS 전이로 자란다. 그 라이브러리를 import 할 수 있는
 *    파일은 `shared/ui/motion.tsx` 하나뿐이다
 * 3. **값이 바뀌면 그 자리에서 다시 자란다** — 진입 때 한 번이 아니라, 1분마다 오는 새 값에
 *    맞춰 길이가 옮겨 간다. 감속 설정에서는 전역 CSS가 전이를 끊는다
 */
export function WallBar({
  percent,
  color,
  className,
}: {
  percent: number;
  color: string;
  className?: string;
}) {
  const width = Math.max(0, Math.min(100, percent));

  return (
    <div
      className={cn('w-full overflow-hidden rounded-full bg-surface-3', className)}
      style={{ boxShadow: 'var(--track-inset)' }}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{
          width: `${width}%`,
          backgroundImage: `linear-gradient(to right, ${color}, color-mix(in srgb, ${color} 55%, var(--surface)))`,
        }}
      />
    </div>
  );
}
