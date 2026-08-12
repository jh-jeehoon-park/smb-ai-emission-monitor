'use client';

import { cn } from '@/shared/lib/cn';

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
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-[4px] border border-border bg-surface p-0.5',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'cursor-pointer rounded-[3px] px-2 py-1 text-[11px] transition-colors duration-200',
              active
                ? 'bg-surface-3 text-fg'
                : 'text-fg-subtle hover:bg-surface-2 hover:text-fg-muted',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
