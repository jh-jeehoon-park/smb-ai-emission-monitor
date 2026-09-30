import { type ClassValue, clsx } from 'clsx';

/**
 * 클래스 조합. **겹치는 것을 정리하지 않는다** — 한때 `tailwind-merge`가 «뒤에 쓴 것이 이긴다»로
 * 정리했고, 지금은 CSS 레이어가 그 일을 한다(`docs/specs/styling.md` §6).
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
