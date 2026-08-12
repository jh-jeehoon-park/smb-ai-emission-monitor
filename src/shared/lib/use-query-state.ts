'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

/**
 * 필터 상태를 URL에 둔다(P6). 화면을 옮기거나 링크를 공유해도 보던 조건이 살아난다.
 * 허용 목록에 없는 값이 들어오면 빈 화면 대신 기본값으로 되돌린다.
 */
export function useQueryState<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): [T, (next: T) => void] {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const raw = params.get(key);
  const value = allowed.includes(raw as T) ? (raw as T) : fallback;

  const setValue = useCallback(
    (next: T) => {
      const query = new URLSearchParams(params.toString());
      query.set(key, next);
      // 필터 변경은 새 방문이 아니다 — 뒤로가기 이력을 남기지 않는다
      router.replace(`${pathname}?${query.toString()}`, { scroll: false });
    },
    [key, params, pathname, router],
  );

  return [value, setValue];
}
