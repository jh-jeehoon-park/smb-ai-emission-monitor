'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { SCOPE_QUERY_KEY } from '@/shared/config/scope';
import { adminSiteId, canRoleSee, useRole } from '@/entities/user';
import { SITE_QUERY_KEY } from '@/features/site-selection';
import { NAV_ITEMS, homeHrefFor } from '../config/navigation';

/**
 * 역할을 바꿨을 때 지금 보고 있는 화면이 그 역할에 닫혀 있으면 볼 수 있는 첫 화면으로 옮긴다.
 * 메뉴에서만 감추면 관리자로 전환해도 통합 관제 본문이 그대로 남아 회의 결정과 어긋나 보인다.
 *
 * 관리자는 여기서 **범위도 고정한다** — 자사 사업장과 `scope=site`를 URL에 박아 둔다.
 * 범위를 URL에 두는 이유는 서버가 역할을 모르기 때문이다. 렌더 중에 역할로 행 수를 가르면
 * 하이드레이션이 깨진다(이 저장소에서 두 번 터졌다).
 *
 * 인가가 아니라 시연 표시다(E6 예외). 서버가 생기면 서버가 걸러 보낸다.
 */
export function useRoleRouteGuard() {
  const { role, adminAccount } = useRole();
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const current = NAV_ITEMS.find((item) => item.href === pathname);

    if (current && !canRoleSee(current.screenId, role)) {
      /* 로고 클릭과 같은 목적지를 쓴다 — 정의가 갈리면 앱이 '메인'을 두 개 갖는다 */
      router.replace(withScope(homeHrefFor(role), role, adminAccount, params));
      return;
    }

    if (role !== 'admin') return;

    // 주소를 직접 고쳐 남의 사업장을 열어도 자사로 되돌린다
    const ownSite = adminSiteId(adminAccount);
    if (params.get(SITE_QUERY_KEY) === ownSite && params.get(SCOPE_QUERY_KEY) === 'site') return;

    router.replace(withScope(pathname, role, adminAccount, params));
  }, [role, adminAccount, pathname, params, router]);
}

/** 관리자면 자사·site 범위를 얹고, 나머지 쿼리(기간·우선순위 등)는 그대로 둔다 */
function withScope(
  href: string,
  role: string,
  adminAccount: Parameters<typeof adminSiteId>[0],
  params: URLSearchParams,
): string {
  const next = new URLSearchParams(params.toString());

  if (role === 'admin') {
    next.set(SITE_QUERY_KEY, adminSiteId(adminAccount));
    next.set(SCOPE_QUERY_KEY, 'site');
  }

  const query = next.toString();
  return query ? `${href}?${query}` : href;
}
