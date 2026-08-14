'use client';

import type { ReactNode } from 'react';

interface ChartTooltipProps {
  label?: ReactNode;
  children: ReactNode;
}

/** 모든 차트가 같은 툴팁 껍데기를 쓴다 — 화면마다 다른 tooltip을 만들지 않는다 */
export function ChartTooltipShell({ label, children }: ChartTooltipProps) {
  return (
    <div className="min-w-[140px] rounded-[4px] border border-border-strong bg-surface-2 px-2.5 py-2 shadow-lg">
      {label && (
        <p className="mb-1.5 text-[11px] tabular-nums text-fg-subtle">{label}</p>
      )}
      <div className="space-y-1">{children}</div>
    </div>
  );
}

interface TooltipRowProps {
  color: string;
  name: string;
  value: string;
  dashed?: boolean;
}

export function ChartTooltipRow({ color, name, value, dashed }: TooltipRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-1.5 text-[11px] text-fg-muted">
        <span
          className="inline-block h-0.5 w-3 shrink-0 rounded-full"
          style={{
            backgroundColor: dashed ? 'transparent' : color,
            backgroundImage: dashed
              ? `repeating-linear-gradient(to right, ${color} 0 3px, transparent 3px 6px)`
              : undefined,
          }}
        />
        {name}
      </span>
      <span className="text-[11px] tabular-nums text-fg">{value}</span>
    </div>
  );
}
