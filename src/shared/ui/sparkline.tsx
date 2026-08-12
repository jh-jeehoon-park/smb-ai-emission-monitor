import { cn } from '@/shared/lib/cn';

interface SparklineProps {
  values: (number | null)[];
  color: string;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * 결측(null)은 선을 끊는다. 이어 그리면 통신 두절 구간이 정상 추세로 보인다(E4).
 * 작은 표현이라 Recharts를 쓰지 않고 직접 그린다.
 */
export function Sparkline({ values, color, width = 96, height = 24, className }: SparklineProps) {
  const filled = values.filter((v): v is number => v !== null);
  if (filled.length < 2) {
    return <div className={cn('h-6 w-24', className)} aria-hidden />;
  }

  const min = Math.min(...filled);
  const max = Math.max(...filled);
  const span = max - min || 1;
  const stepX = width / Math.max(1, values.length - 1);

  const segments: string[] = [];
  let current: string[] = [];

  values.forEach((v, i) => {
    if (v === null) {
      if (current.length > 1) segments.push(current.join(' '));
      current = [];
      return;
    }
    const x = i * stepX;
    const y = height - ((v - min) / span) * (height - 2) - 1;
    current.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  });
  if (current.length > 1) segments.push(current.join(' '));

  return (
    <svg
      className={cn('overflow-visible', className)}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden
    >
      {segments.map((points, i) => (
        <polyline
          key={i}
          points={points}
          stroke={color}
          strokeWidth={1.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.85}
        />
      ))}
    </svg>
  );
}
