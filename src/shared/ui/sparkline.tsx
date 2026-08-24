import { cn } from '@/shared/lib/cn';
import { smoothPath } from '@/shared/lib/smooth-path';

interface SparklineProps {
  values: (number | null)[];
  color: string;
  width?: number;
  height?: number;
  className?: string;
  /** 폭을 부모에 맞춘다. `width`는 viewBox 좌표계로만 쓰인다 */
  fluid?: boolean;
  /** 선 굵기. `fluid`로 늘려 놓으면 얇은 선이 배경에 묻힌다 */
  strokeWidth?: number;
}

/**
 * 결측(null)은 선을 끊는다. 이어 그리면 통신 두절 구간이 정상 추세로 보인다(E4).
 * 작은 표현이라 Recharts를 쓰지 않고 직접 그린다.
 *
 * 선은 **부드럽게** 잇는다 `[사용자 지시 2026-08-24]` — 다만 보간이 점 사이에서 값의
 * 범위를 넘으면 측정하지 않은 봉우리가 생기므로 monotone cubic을 쓴다(`smoothPath`).
 */
export function Sparkline({
  values,
  color,
  width = 96,
  height = 24,
  className,
  fluid = false,
  strokeWidth = 1.25,
}: SparklineProps) {
  const filled = values.filter((v): v is number => v !== null);
  if (filled.length < 2) {
    return <div className={cn('h-6', fluid ? 'w-full' : 'w-24', className)} aria-hidden />;
  }

  const min = Math.min(...filled);
  const max = Math.max(...filled);
  const span = max - min || 1;
  const stepX = width / Math.max(1, values.length - 1);

  /* 결측을 만나면 조각을 끊는다. 조각마다 따로 곡선을 만들어 빈 구간을 잇지 않는다 */
  const segments: { x: number; y: number }[][] = [];
  let current: { x: number; y: number }[] = [];

  values.forEach((v, i) => {
    if (v === null) {
      if (current.length > 1) segments.push(current);
      current = [];
      return;
    }
    current.push({
      x: i * stepX,
      y: height - ((v - min) / span) * (height - 2) - 1,
    });
  });
  if (current.length > 1) segments.push(current);

  return (
    <svg
      className={cn('overflow-visible', fluid && 'w-full', className)}
      width={fluid ? undefined : width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio={fluid ? 'none' : undefined}
      fill="none"
      aria-hidden
    >
      {segments.map((points, i) => (
        <path
          key={i}
          d={smoothPath(points)}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          opacity={0.85}
        />
      ))}
    </svg>
  );
}
