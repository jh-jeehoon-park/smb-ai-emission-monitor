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
 * **다른 쿼리도 함께 옮긴다.** 사업장만 붙이고 나머지를 버리면, 사업장이 메뉴를 누르는
 * 순간 `scope`가 사라져 다음 화면이 전 사업장으로 한 번 그려진 뒤 가드가 되돌린다 —
 * 자사 1개소만 봐야 하는 사람에게 남의 사업장이 한 프레임 스친다.
 *
 * **`siteId`를 주면 그 사업장으로 간다.** 목록에서 누른 줄은 지금 선택된 사업장과 다를 수
 * 있다 — 표의 `상세 보기`가 그렇다. 그때도 **손으로 `?site=`를 이어 붙이지 않는다**:
 * 그러면 `scope`·`municipality`가 함께 날아가 관할이 풀린다(실제로 그런 자리가 있었다).
 */
export function useSiteHref(): (href: string, siteId?: string) => string {
  const params = useSearchParams();
  const query = params.toString();

  return useCallback(
    (href: string, siteId?: string) => {
      if (siteId === undefined) return query ? `${href}?${query}` : href;

      const next = new URLSearchParams(query);
      next.set(SITE_QUERY_KEY, siteId);
      return `${href}?${next.toString()}`;
    },
    [query],
  );
}
