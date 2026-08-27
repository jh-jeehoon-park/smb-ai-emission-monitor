'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { MUNICIPALITY_QUERY_KEY, SCOPE_QUERY_KEY, SITE_QUERY_KEY } from '@/shared/config/scope';
import { replaceQuery } from '@/shared/lib/replace-query';
import { firstSiteIn, sitesIn } from '@/entities/site';
import {
  GOV_MUNICIPALITY,
  adminSiteId,
  canRoleSee,
  scopeOf,
  useRole,
  type Role,
} from '@/entities/user';
import { NAV_ITEMS, homeHrefFor } from '../config/navigation';

/**
 * 역할을 바꿨을 때 지금 보고 있는 화면이 그 역할에 닫혀 있으면 볼 수 있는 첫 화면으로 옮긴다.
 * 메뉴에서만 감추면 사업장으로 전환해도 통합 관제 본문이 그대로 남아 회의 결정과 어긋나 보인다.
 *
 * **범위는 역할 이름이 아니라 `RoleScope`로 가른다** — `role === 'site'`로 적으면 역할이
 * 늘거나 이름이 바뀔 때 이 자리를 다시 찾아야 한다. 2026-08-20 회의가 역할 이름을 통째로
 * 바꿨을 때 실제로 그런 자리가 여럿 나왔다.
 *
 * `own-site`는 자사 사업장과 `scope=site`를 URL에 박아 둔다. 범위를 URL에 두는 이유는
 * 서버가 역할을 모르기 때문이다. 렌더 중에 역할로 행 수를 가르면 하이드레이션이 깨진다
 * (이 저장소에서 두 번 터졌다).
 *
 * `own-municipality`(기초지자체)는 `scope=municipality&municipality=…`를 같은 방식으로 얹고
 * **`site`도 함께 박는다** — `useSelectedSiteId`의 허용 목록이 10개소 전부이고 기본값이
 * `S-02`(구미, 관할 밖)라, 그냥 두면 관할 밖 사업장의 상세가 열린다.
 *
 * **예전에 `scope=province&province=…`로 적어 두었던 것은 낡았다.** 개명으로 범위가 시·도에서
 * 시·군·구로 한 단 좁아졌다 `[사용자 요청 2026-08-24]` — 그대로 따르면 개명이 없앤 광역 범위를
 * 되살린다.
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

    const scope = scopeOf(role);
    if (scope === 'all-sites') return;

    if (scope === 'own-site') {
      // 주소를 직접 고쳐 남의 사업장을 열어도 자사로 되돌린다
      const ownSite = adminSiteId(adminAccount);
      if (params.get(SITE_QUERY_KEY) === ownSite && params.get(SCOPE_QUERY_KEY) === 'site') return;
    } else {
      /* 관할 밖 사업장을 주소로 열어도 관내로 되돌린다 — 사업장 축과 같은 처리다 */
      const site = params.get(SITE_QUERY_KEY);
      const inside = site !== null && sitesIn(GOV_MUNICIPALITY).some((s) => s.id === site);
      if (
        inside &&
        params.get(SCOPE_QUERY_KEY) === 'municipality' &&
        params.get(MUNICIPALITY_QUERY_KEY) === GOV_MUNICIPALITY
      ) {
        return;
      }
    }

    /*
     * **경로가 그대로라 서버를 거치지 않는다.** 여기서 하는 일은 쿼리 교정뿐이고,
     * `router.replace`는 그때도 RSC 요청을 보내 교정이 한 왕복 뒤에 도착한다 —
     * 그 사이 남의 사업장이 화면에 남는다(이 가드가 막으려는 바로 그것이다).
     */
    replaceQuery(scopeParams(role, adminAccount, params));
  }, [role, adminAccount, pathname, params, router]);
}

/** 그 역할의 범위를 얹은 쿼리. 경로는 부르는 쪽이 정한다 */
function scopeParams(
  role: Role,
  adminAccount: Parameters<typeof adminSiteId>[0],
  params: URLSearchParams,
): URLSearchParams {
  const next = new URLSearchParams(params.toString());
  const scope = scopeOf(role);

  if (scope === 'own-site') {
    next.set(SITE_QUERY_KEY, adminSiteId(adminAccount));
    next.set(SCOPE_QUERY_KEY, 'site');
  }

  if (scope === 'own-municipality') {
    next.set(SCOPE_QUERY_KEY, 'municipality');
    next.set(MUNICIPALITY_QUERY_KEY, GOV_MUNICIPALITY);

    /*
     * 관할 밖을 가리키고 있으면 관내 첫 사업장으로 되돌린다. 관할이 비어 있으면
     * `site`를 건드리지 않는다 — 없는 사업장을 박으면 허용 목록이 기본값으로 되돌린다.
     */
    const site = params.get(SITE_QUERY_KEY);
    const inside = site !== null && sitesIn(GOV_MUNICIPALITY).some((s) => s.id === site);
    const fallback = firstSiteIn(GOV_MUNICIPALITY);
    if (!inside && fallback) next.set(SITE_QUERY_KEY, fallback);
  }

  return next;
}

/**
 * 다른 화면으로 보낼 주소. **경로가 바뀌므로 서버를 거쳐야 한다** — 그때는
 * `router.replace`가 맞고, 쿼리만 고치는 경우와 갈라 둔다.
 *
 * **두 범위 모두 `site`를 함께 박는다** — 범위만 좁히고 선택 사업장을 두면 상세 패널이
 * 범위 밖 사업장을 그린다. 사업장 축이 이미 그렇게 하고 있고 관할도 같은 이유다.
 */
function withScope(
  href: string,
  role: Role,
  adminAccount: Parameters<typeof adminSiteId>[0],
  params: URLSearchParams,
): string {
  const query = scopeParams(role, adminAccount, params).toString();
  return query ? `${href}?${query}` : href;
}
