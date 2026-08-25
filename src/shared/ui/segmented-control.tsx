'use client';

import { useId } from 'react';
import { cn } from '@/shared/lib/cn';
import { motion } from '@/shared/ui/motion';

/**
 * 탭·필터의 껍데기 한 벌 `[사용자 지시 2026-08-24: 전 페이지의 탭을 이 모양으로]`.
 *
 * 옅은 홈 안에서 **흰 알약이 옮겨 다닌다** — 고른 쪽이 면으로 떠오르는 형태라 어느 쪽이
 * 켜졌는지 색이 아니라 높이로 읽힌다. 글자색은 포인트색(진한 파랑)이고 상태색은 쓰지 않는다.
 *
 * 값은 여기 한 곳에 있고 `ChartFigure`의 `그래프로 보기 / 표로 보기` 탭이 같은 것을 쓴다 —
 * 그쪽은 `role="tablist"` + `aria-controls`가 필요해 컴포넌트를 나눌 수 없고, 껍데기만 공유한다.
 */
/* `flex-wrap`은 좁은 화면의 안전장치다 — 칸이 `shrink-0`이라 없으면 트랙 밖으로 넘친다 */
export const SEG_TRACK =
  'inline-flex max-w-full flex-wrap items-center rounded-nested bg-surface-2 p-0.5 shadow-track';

export const SEG_ITEM =
  'relative shrink-0 cursor-pointer rounded-[6px] px-2.5 py-1 text-[12px] transition-colors duration-200';

export const SEG_ITEM_ON = 'font-semibold text-accent';
export const SEG_ITEM_OFF = 'text-fg-subtle hover:text-fg-muted';

/**
 * 고른 칸 밑에 깔리는 흰 알약. 칸 안에 **글자보다 먼저** 놓고 글자에는 `relative`를 준다.
 * 테두리는 `ring`으로 준다 — 절대 배치된 면에 `border`를 주면 알약이 1px 커진다.
 */
export function SegPill({ layoutId }: { layoutId: string }) {
  return (
    <motion.span
      layoutId={layoutId}
      className="absolute inset-0 rounded-[6px] bg-surface shadow-panel ring-1 ring-card-border"
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
    />
  );
}

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
  /** 무엇을 고르는 그룹인지 — 시각적 라벨이 없으므로 반드시 준다 */
  ariaLabel: string;
  className?: string;
}

/** 선택지가 서너 개로 고정된 필터용. 목록이 길면 select를 쓴다 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  /* 알약은 그룹마다 따로 움직인다 — 고정 문자열을 쓰면 두 그룹이 서로에게 날아간다 */
  const pillId = useId();

  return (
    <div role="group" aria-label={ariaLabel} className={cn(SEG_TRACK, className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(SEG_ITEM, active ? SEG_ITEM_ON : SEG_ITEM_OFF)}
          >
            {active && <SegPill layoutId={pillId} />}
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
