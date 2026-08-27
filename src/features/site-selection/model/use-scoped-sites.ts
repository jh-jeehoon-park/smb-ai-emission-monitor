'use client';

import { useSearchParams } from 'next/navigation';
import {
  MUNICIPALITY_QUERY_KEY,
  SCOPE_FILTERS,
  SCOPE_QUERY_KEY,
  SITE_QUERY_KEY,
  type ScopeFilter,
} from '@/shared/config/scope';
import { SITES, siteIdsInScope } from '@/entities/site';
import type { Site } from '@/entities/site';

function normalize(raw: string | null): ScopeFilter {
  return SCOPE_FILTERS.includes(raw as ScopeFilter) ? (raw as ScopeFilter) : 'all';
}

/**
 * 지금 범위에서 **보이는 사업장 목록**.
 *
 * 목록을 그리는 자리(선택기·탭 줄·순위·리포트)가 `SITES` 전부를 직접 읽으면 기초지자체가
 * 관할 밖 사업장을 보게 된다 — 그리기 문제가 아니라 범위 문제다.
 *
 * 역할이 아니라 URL에서 읽는다 — 서버는 역할을 모른다.
 */
export function useScopedSites(): Site[] {
  const params = useSearchParams();
  const ids = siteIdsInScope(normalize(params.get(SCOPE_QUERY_KEY)), {
    siteId: params.get(SITE_QUERY_KEY) ?? SITES[0]!.id,
    municipality: params.get(MUNICIPALITY_QUERY_KEY),
  });

  return ids === null ? SITES : SITES.filter((site) => ids.has(site.id));
}
