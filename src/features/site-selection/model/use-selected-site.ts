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

/** 화면을 옮길 때 선택 사업장을 잃지 않도록 링크에 현재 선택을 붙인다 */
export function useSiteHref(): (href: string) => string {
  const params = useSearchParams();
  const siteId = params.get(SITE_QUERY_KEY);

  return useCallback(
    (href: string) => (siteId ? `${href}?${SITE_QUERY_KEY}=${siteId}` : href),
    [siteId],
  );
}
