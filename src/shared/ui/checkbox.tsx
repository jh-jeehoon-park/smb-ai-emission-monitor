'use client';

import type { ChangeEvent } from 'react';
import { cn } from '@/shared/lib/cn';
import styles from './checkbox.module.scss';

/**
 * 체크박스 한 벌 `[사용자 지시 2026-08-25: 브라우저 기본 모양이 투박하다]`.
 *
 * `accent-color`만 준 판본은 OS가 그리던 모양이라 화면마다·브라우저마다 달랐고, 모서리도
 * 이 화면의 다른 부품(`--radius-chip`·`--radius-nested`)과 맞지 않았다. 여기서는 네모를
 * 직접 그린다 — **끈 상태는 빈 면, 켠 상태는 포인트색으로 채우고 체크가 그려진다.**
 *
 * 기본 요소를 숨기고 가짜 네모를 그리지 않는다. `appearance: none`으로 그림만 걷어낸
 * **진짜 `<input type="checkbox">`** 라서 라벨 연결·키보드(Space)·폼 제출이 그대로 산다.
 * 체크 표시는 켠 입력을 뒤따르는 형제 SVG다(`:checked ~`).
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
  sm: styles.boxSm,
  md: styles.boxMd,
} as const;

const MARK_BY_SIZE = {
  sm: styles.markSm,
  md: styles.markMd,
} as const;

export function Checkbox({
  checked,
  onChange,
  size = 'md',
  className,
  'aria-label': ariaLabel,
}: CheckboxProps) {
  return (
    <span className={cn(styles.root, className)}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={ariaLabel}
        className={cn(styles.box, BOX_BY_SIZE[size])}
      />
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={3.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(styles.mark, MARK_BY_SIZE[size])}
      >
        <path d="M5 12.5 10 17.5 19 7" />
      </svg>
    </span>
  );
}
