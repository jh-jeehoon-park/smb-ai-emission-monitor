'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { replaceQuery } from './replace-query';

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

  const raw = params.get(key);
  const value = allowed.includes(raw as T) ? (raw as T) : fallback;

  const setValue = useCallback(
    (next: T) => {
      const query = new URLSearchParams(params.toString());
      query.set(key, next);
      /*
       * **`router.replace`를 쓰지 않는다** — 경로가 같아도 RSC 요청을 한 번 보내고,
       * 그것이 돌아온 뒤에야 화면이 바뀐다. 지도에서 핀을 눌렀을 때 **두 번 눌러야
       * 정보가 바뀌는 것처럼** 보인 원인이다(`replaceQuery` 주석).
       *
       * 필터 변경은 새 방문이 아니라 뒤로가기 이력을 남기지 않는다.
       */
      replaceQuery(query);
    },
    [key, params],
  );

  return [value, setValue];
}
