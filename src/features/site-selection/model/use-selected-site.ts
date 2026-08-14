'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { useQueryState } from '@/shared/lib/use-query-state';
import { DEFAULT_SITE_ID, SITES } from '@/entities/site';
import { SITE_QUERY_KEY } from '../config/constants';

const SITE_IDS = SITES.map((site) => site.id);

export function useSelectedSiteId(): { siteId: string; setSiteId: (next: string) => void } {
  const [siteId, setSiteId] = useQueryState(SITE_QUERY_KEY, SITE_IDS, DEFAULT_SITE_ID);
  return { siteId, setSiteId };
}

/**
 * 화면을 옮길 때 선택 사업장을 잃지 않도록 링크에 현재 쿼리를 얹는다.
 *
 * **다른 쿼리도 함께 옮긴다.** 사업장만 붙이고 나머지를 버리면, 관리자가 메뉴를 누르는
 * 순간 `scope`가 사라져 다음 화면이 전 사업장으로 한 번 그려진 뒤 가드가 되돌린다 —
 * 자사 1개소만 봐야 하는 사람에게 남의 사업장이 한 프레임 스친다.
 */
export function useSiteHref(): (href: string) => string {
  const params = useSearchParams();
  const query = params.toString();

  return useCallback((href: string) => (query ? `${href}?${query}` : href), [query]);
}
