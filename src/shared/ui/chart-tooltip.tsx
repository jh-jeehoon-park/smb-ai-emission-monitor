'use client';

import type { ReactNode } from 'react';

interface ChartTooltipProps {
  label?: ReactNode;
  children: ReactNode;
}

/**
 * 툴팁 껍데기의 최소 폭(px).
 *
 * **스스로 자리를 잡는 툴팁이 이 값을 읽는다** — 일간 운전 리본은 커서 오른쪽에 두다가
 * 자리가 모자라면 왼쪽으로 뒤집는데, 그 판단에 상자 폭이 필요하다. 아래 `min-w-[140px]`과
 * **같은 값이어야 한다**: Tailwind는 소스 글자를 훑으므로 임의값에 변수를 넣을 수 없어
 * 둘로 적고, `daily-ribbon/lib/tooltip-placement.test.ts`가 갈리지 않는지 본다.
 */
export const CHART_TOOLTIP_MIN_WIDTH_PX = 140;

/** 모든 차트가 같은 툴팁 껍데기를 쓴다 — 화면마다 다른 tooltip을 만들지 않는다 */
export function ChartTooltipShell({ label, children }: ChartTooltipProps) {
  return (
    <div className="min-w-[140px] rounded-[4px] border border-border-strong bg-surface-2 px-2.5 py-2 shadow-lg">
      {label && (
        <p className="mb-1.5 text-[12px] tabular-nums text-fg-subtle">{label}</p>
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
      <span className="flex items-center gap-1.5 text-[12px] text-fg-muted">
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
      <span className="text-[12px] tabular-nums text-fg">{value}</span>
    </div>
  );
}
