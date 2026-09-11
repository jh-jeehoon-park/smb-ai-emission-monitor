import { useId } from 'react';
import { smoothPath } from '@/shared/lib/smooth-path';
import { roundTo } from '@/shared/lib/prng';

/** 좌표계. 실제 크기는 CSS가 정하고 이 값은 비율만 만든다 */
const VW = 300;
const VH = 64;
/** 위아래 여백 — 선이 상자에 닿으면 잘린 것처럼 보인다 */
const PAD = 4;
/** hydration이 깨지지 않게 파생 좌표를 반올림한다(`geo.ts` 선례) */
const DECIMALS = 2;

/**
 * 24시간 추이 — **이 화면 전용으로 새로 그린다.**
 *
 * `shared/ui/sparkline.tsx`를 쓰지 않는다 `[사용자 요청 2026-09-10: 기존 컴포넌트를 가져다
 * 쓰지 말고 새롭게 만들어 사용할 것]`. 그쪽은 카드 안 40px 자리에 맞춰 선 하나만 그리는
 * 부품이고, 여기서는 **면과 기준선과 끝점**이 함께 필요하다 — 대조 화면에서 추이는 곁들이가
 * 아니라 «지금 값이 평소와 다른가»를 답하는 축이다.
 *
 * 셋이 다르다: ① 평균선을 함께 긋는다 ② 마지막 관측점을 점으로 짚는다
 * ③ 면 채움이 평균 위·아래로 갈린다.
 *
 * 결측(`null`)은 선을 **끊는다** — 이어 그리면 두절 구간이 정상 추세로 보인다(E4).
 */
export function TrendRail({
  values,
  average,
  color,
  className,
}: {
  values: (number | null)[];
  /** 24시간 평균. 이 선이 «평소»다 */
  average: number | null;
  color: string;
  className?: string;
}) {
  const gradientId = useId();
  const known = values.filter((v): v is number => v !== null);
  if (known.length < 2) return <div className={className} aria-hidden />;

  const min = Math.min(...known);
  const max = Math.max(...known);
  /* 값이 한 줄로 평평하면 0으로 나뉜다 — 그때는 가운데 높이에 눕힌다 */
  const span = max - min || 1;

  const y = (v: number) => roundTo(PAD + (1 - (v - min) / span) * (VH - PAD * 2), DECIMALS);
  const x = (i: number) => roundTo((i / (values.length - 1)) * VW, DECIMALS);

  /* 결측에서 끊어진 조각들. 한 점짜리 조각은 선이 되지 않으므로 버린다 */
  const runs: { x: number; y: number }[][] = [];
  let run: { x: number; y: number }[] = [];
  values.forEach((v, i) => {
    if (v === null) {
      if (run.length > 1) runs.push(run);
      run = [];
      return;
    }
    run.push({ x: x(i), y: y(v) });
  });
  if (run.length > 1) runs.push(run);

  const lastIndex = values.reduce<number>((acc, v, i) => (v === null ? acc : i), -1);
  const averageY = average === null ? null : y(average);

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.24} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>

      {runs.map((segment) => (
        <path
          key={segment[0]!.x}
          d={`${smoothPath(segment)} L${segment[segment.length - 1]!.x},${VH} L${segment[0]!.x},${VH} Z`}
          fill={`url(#${gradientId})`}
        />
      ))}

      {/* 평균선 — «평소»의 자리. 값이 아니라 기준이라 파선이다 */}
      {averageY !== null && (
        <line
          x1={0}
          y1={averageY}
          x2={VW}
          y2={averageY}
          stroke="var(--grid)"
          strokeWidth={1}
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
        />
      )}

      {runs.map((segment) => (
        <path
          key={`line-${segment[0]!.x}`}
          d={smoothPath(segment)}
          fill="none"
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {/* 마지막 관측점. 어디까지가 «온 값»인지를 점이 말한다 */}
      {lastIndex >= 0 && values[lastIndex] !== null && (
        <circle
          cx={x(lastIndex)}
          cy={y(values[lastIndex])}
          r={2.5}
          fill={color}
          stroke="var(--surface)"
          strokeWidth={1.2}
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}
