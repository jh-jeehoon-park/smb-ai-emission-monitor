import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { VALUE_LG } from './type-scale';

/**
 * 타일의 골격과 글자 위계를 **한 곳에 둔다**.
 *
 * 구성은 사업장 월보드 카드와 같다 `[사용자 지시 2026-08-24]` —
 * **제목 왼쪽 · 값 오른쪽** 한 줄, hairline, 보조줄. 두 곳이 같은 역할에 다른 배치를 쓰면
 * 화면을 옮길 때마다 눈이 값을 다시 찾아야 한다.
 */
export const TILE_SHELL =
  'flex h-full flex-col gap-3 rounded-panel border border-card-border bg-surface p-5 shadow-panel';
/** 타일의 제목. 월보드 카드 제목과 같은 단이다 */
export const TILE_LABEL = 'text-[14px] font-bold leading-tight text-fg';
export const TILE_VALUE = `shrink-0 ${VALUE_LG}`;
/**
 * `mt-auto`가 이 줄을 **타일 바닥에** 붙인다 — 위 내용의 줄 수가 달라도 한 행의 타일들이
 * 같은 높이를 갖고 보조줄이 한 선에 선다.
 *
 * **구분선을 두지 않는다** `[사용자 지시 2026-08-24]`. 타일 안에 선을 그으면 한 장이
 * 두 칸으로 쪼개져 읽힌다 — 껍데기의 `gap`이 이미 값과 보조줄을 갈라 놓는다.
 */
export const TILE_FOOTER = 'mt-auto text-[12px] text-fg-subtle';

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
    <div className={TILE_SHELL}>
      <div className="flex items-start justify-between gap-2">
        <p className={cn('min-w-0', TILE_LABEL)}>{label}</p>
        <p className={`num ${TILE_VALUE}`} style={{ color: accent ?? 'var(--color-fg)' }}>
          {value}
        </p>
      </div>
      <div className={TILE_FOOTER}>{note}</div>
    </div>
  );
}
