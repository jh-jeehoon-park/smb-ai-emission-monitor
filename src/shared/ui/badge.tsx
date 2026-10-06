import { cn } from '@/shared/lib/cn';

/**
 * 뱃지의 크기·여백을 한 곳에 둔다 `[사용자 지시 2026-08-24: 12px · 높이 20px · 좌우 4px]`.
 * 색은 쓰는 쪽이 정한다 — 상태색은 도메인 규칙(E2)이라 여기서 고를 수 없다.
 *
 * **높이를 고정값으로 잡는다.** 위아래 패딩으로 만들면 글리프가 붙은 뱃지와 글자만 있는
 * 뱃지의 높이가 갈려 표 한 줄에서 서로 다른 크기로 보인다.
 */
export const BADGE_BASE =
  'inline-flex h-5 shrink-0 items-center gap-1 rounded-[4px] px-1 text-[12px] leading-none';

export function badgeClass(...extra: Parameters<typeof cn>) {
  return cn(BADGE_BASE, ...extra);
}
