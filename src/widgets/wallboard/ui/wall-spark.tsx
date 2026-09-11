'use client';

import { useId } from 'react';
import { COLLECTION_INTERVAL_MINUTES } from '@/shared/config/measurement';
import { ACTUAL_HEX } from '@/shared/config/status-visual';
import { cn } from '@/shared/lib/cn';
import {
  SVG_COORD_PRECISION,
  WALL_SPARK_BUCKET_MINUTES,
  WALL_SPARK_H,
} from '../config/constants';

/** 라벨이 없을 때의 격자 — 값을 뜻하지 않는 질감이라 4등분이다 */
const DEFAULT_GRID_AT = [0.25, 0.5, 0.75] as const;

/**
 * 추이선 — **`Sparkline`을 쓰지 않고 새로 만든다** `[사용자 요청 2026-09-11]`.
 *
 * 바닥 띠의 유출 유량과 계측 칸의 24시간 흐름이 같은 부품을 쓴다. **한때 바닥 띠는 누적
 * 배출량이었고** 그때는 단조 증가라 선이 매끈했다 — `[회의 2026-09-08]`로 걷혔다.
 *
 * 레퍼런스의 추이 패널을 따라 **바닥을 채우고 격자선을 깐다.** 그쪽과 갈리는 곳:
 * 공용 `Sparkline`은 «카드 한 칸의 작은 표현»이라 격자도 축도 없고 굵기가 1.25px이다 —
 * 2~3m 밖에서는 선이 사라진다.
 *
 * **결측(`null`)에서 끊는다**(**E4**). 이어 그리면 통신 두절 구간이 정상 추세로 보인다.
 *
 * **선은 곧게 잇는다.** §8 `그래프 선`이 막는 것은 `natural`·`basis`처럼 **점 사이에서
 * 값의 범위를 넘는** 보간이고, 직선은 그 위험이 없다. 솎은 뒤 점 사이가 6분이라 눈에는
 * 이미 곡선으로 보인다.
 *
 * **솎기는 분으로 적는다**(§8 `솎기`) — 표본 수를 박아 두면 수집 주기가 바뀔 때 구간이
 * 조용히 늘거나 줄어든다(`[INC-111]`).
 */
export function WallSpark({
  values,
  height = WALL_SPARK_H,
  className,
  domain,
  gridAt = DEFAULT_GRID_AT,
}: {
  values: (number | null)[];
  /**
   * **viewBox 좌표계의 높이다 — 화면에 보이는 높이가 아니다.**
   *
   * `preserveAspectRatio="none"`이라 실제 높이는 `className`이 정하고 그림은 세로로 늘어나
   * 채운다. 선 굵기는 `vectorEffect="non-scaling-stroke"`가 지켜 준다.
   */
  height?: number;
  /** 화면에서 차지할 높이. 화면 높이에 비례하는 값이 들어온다 */
  className?: string;
  /**
   * 세로 범위를 **밖에서 정한다.** 주지 않으면 그 계열의 최소~최대에 맞춘다.
   *
   * **주는 쪽과 주지 않는 쪽이 뜻하는 바가 다르다.** 주지 않으면 바닥이 «그 계열의 최솟값»
   * 이라 **모양만** 읽히고, 주면 바닥이 그 값이라 **높이가 값을 뜻한다.** 축 눈금을 글자로
   * 다는 자리는 반드시 줘야 한다 — 눈금이 가리키는 자리와 선이 앉는 자리가 같아야 하기 때문이다.
   */
  domain?: [number, number];
  /** 가로 격자선의 자리(위에서부터의 비율). 축 라벨과 같은 자리를 받는다 */
  gridAt?: readonly number[];
}) {
  /* 그라데이션 id는 문서 전역이라 고유값을 받는다. SVG 참조로 쓰이므로 기호를 걷어낸다 */
  const gradientId = `wall-spark-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  const stride = Math.max(1, Math.round(WALL_SPARK_BUCKET_MINUTES / COLLECTION_INTERVAL_MINUTES));
  const thinned = values.filter((_, i) => i % stride === 0);

  const known = thinned.filter((v): v is number => v !== null);
  const w = 1000;
  const h = height;

  if (known.length < 2) {
    return <div className={className} aria-hidden />;
  }

  /*
   * 범위를 밖에서 받으면 **여백을 두지 않는다** — 눈금이 «0»이라 적은 자리에 선이 정확히
   * 앉아야 한다. 스스로 정할 때는 위아래 4px을 비워 선이 모서리에 붙지 않게 한다.
   */
  const [lo, hi] = domain ?? [Math.min(...known), Math.max(...known)];
  const span = hi - lo || 1;
  const inset = domain ? 0 : 4;
  const stepX = w / Math.max(1, thinned.length - 1);
  const yOf = (v: number) => h - ((v - lo) / span) * (h - inset * 2) - inset;

  /* 결측을 만나면 조각을 끊는다 — 조각마다 따로 이어 빈 구간을 건너뛰지 않는다 */
  const segments: { x: number; y: number }[][] = [];
  let current: { x: number; y: number }[] = [];

  thinned.forEach((v, i) => {
    if (v === null) {
      if (current.length > 1) segments.push(current);
      current = [];
      return;
    }
    current.push({ x: i * stepX, y: yOf(v) });
  });
  if (current.length > 1) segments.push(current);

  const toPath = (pts: { x: number; y: number }[]) =>
    pts
      .map(
        (pt, i) =>
          `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(SVG_COORD_PRECISION)} ${pt.y.toFixed(SVG_COORD_PRECISION)}`,
      )
      .join(' ');

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      /*
       * `overflow-visible` — 바닥이 `0`인 축에서는 선이 **맨 아래에 닿는다.** 기본값이면
       * 굵기의 절반이 잘려 «방류를 멈춘 구간»의 선이 가늘어 보인다.
       */
      className={cn('w-full overflow-visible', className)}
      /* 값은 곁의 큰 숫자가 글자로 갖는다 — 이 그림은 그것의 흐름을 되풀이한다 */
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ACTUAL_HEX} stopOpacity="0.22" />
          <stop offset="100%" stopColor={ACTUAL_HEX} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/*
       * 가로 격자. **축 라벨이 붙으면 그 눈금 자리를 그대로 받는다** — 라벨이 가리키는 높이와
       * 선이 다른 자리에 있으면 눈금이 거짓이 된다. 라벨이 없으면 질감으로만 쓰여 4등분이다.
       */}
      {gridAt.map((t) => (
        <line
          key={t}
          x1="0"
          x2={w}
          y1={h * t}
          y2={h * t}
          stroke="var(--border)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {segments.map((pts) => {
        const line = toPath(pts);
        const area = `${line} L ${pts[pts.length - 1]!.x.toFixed(SVG_COORD_PRECISION)} ${h} L ${pts[0]!.x.toFixed(SVG_COORD_PRECISION)} ${h} Z`;
        return (
          <g key={pts[0]!.x}>
            <path d={area} fill={`url(#${gradientId})`} />
            <path
              d={line}
              fill="none"
              stroke={ACTUAL_HEX}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        );
      })}
    </svg>
  );
}
