import type { ReactNode } from 'react';

/**
 * 표와 목록만 있는 화면은 눈이 붙잡을 곳이 없다. 큰 숫자 몇 개로 훑는 기준점을 만든다.
 * 값이 움직이는 화면에서는 CountUp을 쓰는 KpiTile을, 고정 집계에는 이쪽을 쓴다.
 */
export function StatTile({
  label,
  value,
  note,
  accent,
}: {
  label: string;
  value: string;
  note: ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-[5px] border border-border bg-surface p-3">
      <p className="text-[11px] text-fg-subtle">{label}</p>
      <p
        className="num mt-1.5 text-[22px] font-semibold leading-none tracking-tight"
        style={{ color: accent ?? 'var(--color-fg)' }}
      >
        {value}
      </p>
      <div className="mt-2 text-[11px] text-fg-subtle">{note}</div>
    </div>
  );
}
