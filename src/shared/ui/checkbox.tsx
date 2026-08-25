'use client';

import type { ChangeEvent } from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * 체크박스 한 벌 `[사용자 지시 2026-08-25: 브라우저 기본 모양이 투박하다]`.
 *
 * `accent-color`만 준 판본은 OS가 그리던 모양이라 화면마다·브라우저마다 달랐고, 모서리도
 * 이 화면의 다른 부품(`--radius-chip`·`--radius-nested`)과 맞지 않았다. 여기서는 네모를
 * 직접 그린다 — **끈 상태는 빈 면, 켠 상태는 포인트색으로 채우고 체크가 그려진다.**
 *
 * 기본 요소를 숨기고 가짜 네모를 그리지 않는다. `appearance-none`으로 그림만 걷어낸
 * **진짜 `<input type="checkbox">`** 라서 라벨 연결·키보드(Space)·폼 제출이 그대로 산다.
 * 체크 표시는 `peer-checked`로 따라오는 형제 SVG다.
 *
 * 라벨은 부르는 쪽이 갖는다 — 글자 크기가 자리마다 달라(로그인 13px · 공정 설정 12px)
 * 여기서 정하면 그 두 자리 중 한쪽이 어긋난다.
 */
interface CheckboxProps {
  checked: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  /** 12px 라벨 곁에는 `sm`. 기본은 14px 이상 라벨에 맞춘 18px */
  size?: 'sm' | 'md';
  className?: string;
  'aria-label'?: string;
}

const BOX_BY_SIZE = {
  sm: 'size-4 rounded-[5px]',
  md: 'size-[18px] rounded-[6px]',
} as const;

const MARK_BY_SIZE = {
  sm: 'size-[11px]',
  md: 'size-3',
} as const;

/*
 * 누르는 맛은 **면 + 그림자 + 눌림**에서 나온다. 색만 바뀌면 평평하다.
 * 켠 순간 그림자가 한 겹 깔리고(포인트색 35%), 누르는 동안 95%로 눌린다.
 */
const BOX =
  'peer relative shrink-0 cursor-pointer appearance-none border border-border-strong bg-surface ' +
  'transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out ' +
  'hover:border-accent/70 hover:bg-accent-weak ' +
  'checked:border-accent checked:bg-accent checked:shadow-[0_2px_6px_rgb(13_71_161_/_35%)] checked:hover:bg-accent ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface)] ' +
  'active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none';

/*
 * 체크는 **그려지듯 나타난다** — 선 길이(`stroke-dasharray`)만큼 밀어 두었다가 0으로 당긴다.
 * `stroke-dashoffset`은 SVG에서 상속되는 속성이라 `<svg>`에 걸면 안쪽 선이 따라온다
 * (`peer-checked`는 형제만 잡으므로 `<path>`에는 걸 수 없다).
 * 지원하지 않는 브라우저에서도 켜면 offset이 0이라 체크는 그대로 보인다 — 애니메이션만 없다.
 */
const MARK =
  'pointer-events-none absolute inset-0 m-auto text-white opacity-0 [transform:scale(.6)] ' +
  '[stroke-dasharray:24] [stroke-dashoffset:24] ' +
  'transition-[opacity,transform,stroke-dashoffset] duration-200 ease-out ' +
  'peer-checked:opacity-100 peer-checked:[transform:scale(1)] peer-checked:[stroke-dashoffset:0] ' +
  'motion-reduce:transition-none';

export function Checkbox({
  checked,
  onChange,
  size = 'md',
  className,
  'aria-label': ariaLabel,
}: CheckboxProps) {
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={ariaLabel}
        className={cn(BOX, BOX_BY_SIZE[size])}
      />
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={3.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(MARK, MARK_BY_SIZE[size])}
      >
        <path d="M5 12.5 10 17.5 19 7" />
      </svg>
    </span>
  );
}
