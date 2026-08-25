'use client';

import { useId } from 'react';
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
  /**
   * 선 아래를 색 그라데이션으로 채운다 `[사용자 지시 2026-08-24]`.
   *
   * 채움은 **선 아래에만** 있다 — 위로 번지면 카드의 다른 값과 겹쳐 읽힌다.
   * 위 22%에서 아래 0%로 흐르므로 선이 높은 구간일수록 채운 면이 두껍고,
   * 등급색과 함께 쓰면 "위험한 구간이 두껍다"가 색과 면적 두 축으로 읽힌다.
   */
  fill?: boolean;
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
  fill = false,
}: SparklineProps) {
  /*
   * 그라데이션 id는 문서 전역이라 카드 10장이 서로를 덮지 않게 고유값을 받는다.
   * `useId`가 주는 `:r1:`에서 기호를 걷어낸다 — SVG 조각 참조로는 동작하지만
   * 나중에 CSS 선택자로 집으려 하면 콜론이 조합자로 파싱된다.
   */
  const gradientId = `spark-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
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
      {fill && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.22} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
      )}

      {/* 채움은 선과 같은 곡선을 쓰고 바닥까지 내려 닫는다 — 조각마다 따로 닫아 결측을 잇지 않는다 */}
      {fill &&
        segments.map((points, i) => (
          <path
            key={`area-${i}`}
            d={`${smoothPath(points)} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`}
            fill={`url(#${gradientId})`}
            stroke="none"
          />
        ))}

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
