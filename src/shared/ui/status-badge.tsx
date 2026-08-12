import { PROVISIONAL_STATUS_LABELS, type StatusLevel } from '@/shared/config/provisional';
import { STATUS_VISUAL } from '@/shared/config/status-visual';
import { cn } from '@/shared/lib/cn';

interface StatusBadgeProps {
  level: StatusLevel;
  size?: 'sm' | 'md';
  className?: string;
}

/** 색만으로 등급을 전달하지 않는다 — 색 + 글리프 + 라벨을 함께 쓴다 */
export function StatusBadge({ level, size = 'md', className }: StatusBadgeProps) {
  const v = STATUS_VISUAL[level];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[4px] border font-medium',
        v.bg,
        v.border,
        v.text,
        size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-1 text-[11px]',
        className,
      )}
    >
      <span aria-hidden className="text-[8px] leading-none">
        {v.glyph}
      </span>
      {PROVISIONAL_STATUS_LABELS[level]}
    </span>
  );
}

export function StatusDot({ level, className }: { level: StatusLevel; className?: string }) {
  const v = STATUS_VISUAL[level];
  return (
    <span
      className={cn('inline-block size-1.5 rounded-full', className)}
      style={{ backgroundColor: v.hex }}
      aria-label={PROVISIONAL_STATUS_LABELS[level]}
    />
  );
}
