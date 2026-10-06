import { useId } from 'react';
import { BRAND_NAME } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';

/**
 * 브랜드 마크 — **물방울 듀오톤** `[사용자 지시 2026-08-24]`.
 *
 * 이 시스템이 다루는 것이 폐수 수질이라 마크도 물이어야 한다. 예전에는 초록 로고 PNG를
 * 테마마다 한 장씩 두 벌 그렸는데, PNG라 색을 코드로 바꿀 수 없어 포인트색이 파랑으로 바뀐
 * 뒤에도 초록으로 남았고 대비를 맞추려고 `filter`로 밀어야 했다.
 *
 * **듀오톤은 한 색의 두 단이다.** 뒤 물방울은 포인트색을 옅게 깐 면(28%→10% 그라데이션),
 * 앞의 물결과 방울 윤곽은 포인트색 그대로다 — 색이 하나라 테마가 바뀌어도 토큰만 따라가고
 * `theme-when-*`으로 두 벌을 그릴 필요가 없다.
 *
 * `useId` — 그라데이션 id는 문서 전역이라 셸과 로그인 화면에 동시에 놓이면 서로를 덮는다.
 * SVG 조각 참조에 콜론이 들어가도 동작하지만, 나중에 CSS로 집을 때를 위해 기호는 걷는다.
 */
export function BrandMark({ size, className }: { size: number; className?: string }) {
  const gradientId = `brand-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={cn('shrink-0', className)}
      role="img"
      aria-label={BRAND_NAME}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.1} />
        </linearGradient>
      </defs>

      {/* 물방울 — 위 꼭지에서 내려와 아래가 둥근 형태. 면은 옅은 단, 윤곽은 진한 단 */}
      <path
        d="M16 2.5c5.4 6.1 9.2 10.7 9.2 15.2A9.2 9.2 0 0 1 16 27a9.2 9.2 0 0 1-9.2-9.3C6.8 13.2 10.6 8.6 16 2.5Z"
        fill={`url(#${gradientId})`}
        stroke="var(--accent)"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/*
       * 물결 두 줄. 방울 안에 담긴 수면이라 아래 줄이 더 짧다 — 방울이 좁아지는 폭을 따른다.
       * `strokeLinecap="round"`로 끝을 둥글게 둬 로고 획과 톤이 맞는다.
       */}
      <path
        d="M10.6 18.4c1.4-1.5 2.7-1.5 4.1 0 1.4 1.5 2.7 1.5 4.1 0 1-1.1 2-1.4 2.9-.9"
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <path
        d="M12.3 22.6c1.2-1.2 2.3-1.2 3.5 0 1.2 1.2 2.3 1.2 3.5 0"
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.55}
      />
    </svg>
  );
}
