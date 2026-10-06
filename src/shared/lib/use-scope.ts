'use client';

import { useSearchParams } from 'next/navigation';
import { MUNICIPALITY_QUERY_KEY } from '@/shared/config/scope';

/**
 * URL이 들고 있는 관할 시·군·구. **역할이 아니라 URL에서 읽는다** — 서버는 역할을 몰라
 * 역할로 행 수를 가르면 하이드레이션이 깨진다. 값을 박는 것은 라우트 가드다.
 */
export function useMunicipality(): string | null {
  return useSearchParams().get(MUNICIPALITY_QUERY_KEY);
}
