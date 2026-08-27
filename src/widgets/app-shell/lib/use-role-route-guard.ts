'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import {
  MUNICIPALITY_QUERY_KEY,
  SCOPE_QUERY_KEY,
  SITE_QUERY_KEY,
  clearMunicipalityLock,
  hasMunicipalityLock,
} from '@/shared/config/scope';
import { firstSiteIn, sitesIn } from '@/entities/site';
import {
  GOV_MUNICIPALITY,
  adminSiteId,
  canRoleSee,
  scopeOf,
  useRole,
  type Role,
  type RoleScope,
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

    if (isScopeSettled(scopeOf(role), adminAccount, params)) return;

    /*
     * **`replaceQuery`로는 화면이 따라오지 않는다.** 한때 쿼리만 바뀌니 서버를 거치지 말자고
     * 그것을 썼는데, 실측해 보니 **주소창만 고쳐지고 본문은 그대로였다** — 사업장 역할로
     * `?site=S-07`을 직접 열면 URL은 자사로 교정되는데 상세는 남의 사업장을 계속 그렸다
     * (8초를 기다려도 그대로다). 가드가 막으려던 바로 그것을 가드가 놓치고 있었다.
     *
     * `history.replaceState`가 `useSearchParams`와 동기화되는 것은 맞다 — 헤더 선택기처럼
     * **이벤트 핸들러에서** 부르면 잘 전파된다. 마운트 직후 effect에서 부른 것이 문제였다.
     *
     * `router.replace`는 RSC 왕복을 한 번 치르지만 확실히 다시 그린다. 교정은 URL이 틀렸을
     * 때만 도는 길이라 그 비용을 감수한다 — **틀린 화면을 빨리 보여 주는 것보다 낫다.**
     * 역할 전환의 '한 프레임'은 `role-context`가 즉시 URL을 옮겨 이미 막고 있다.
     */
    router.replace(withScope(pathname, role, adminAccount, params));
  }, [role, adminAccount, pathname, params, router]);
}

/**
 * URL이 이미 그 역할의 범위대로인가. 맞으면 손대지 않는다.
 *
 * **`all-sites`가 빠져 있었다.** 그냥 반환해 버려서, 기초지자체를 거쳤다 시스템 관리자로
 * 돌아오면 URL에 남은 `scope=municipality`를 아무도 걷지 않았다 — 전 사업장 권한인데
 * 관내 2개소만 보였다(헤더 선택기·이상 탐지 순위표·알람·리포트가 모두 이 쿼리를 읽는다).
 */
function isScopeSettled(
  scope: RoleScope,
  adminAccount: Parameters<typeof adminSiteId>[0],
  params: URLSearchParams,
): boolean {
  if (scope === 'all-sites') return !hasMunicipalityLock(params);

  if (scope === 'own-site') {
    // 주소를 직접 고쳐 남의 사업장을 열어도 자사로 되돌린다
    return (
      params.get(SITE_QUERY_KEY) === adminSiteId(adminAccount) &&
      params.get(SCOPE_QUERY_KEY) === 'site' &&
      params.get(MUNICIPALITY_QUERY_KEY) === null
    );
  }

  /* 관할 밖 사업장을 주소로 열어도 관내로 되돌린다 — 사업장 축과 같은 처리다 */
  const site = params.get(SITE_QUERY_KEY);
  const inside = site !== null && sitesIn(GOV_MUNICIPALITY).some((s) => s.id === site);
  return (
    inside &&
    params.get(SCOPE_QUERY_KEY) === 'municipality' &&
    params.get(MUNICIPALITY_QUERY_KEY) === GOV_MUNICIPALITY
  );
}

/** 그 역할의 범위를 얹은 쿼리. 경로는 부르는 쪽이 정한다 */
function scopeParams(
  role: Role,
  adminAccount: Parameters<typeof adminSiteId>[0],
  params: URLSearchParams,
): URLSearchParams {
  const scope = scopeOf(role);
  /* 관할 잠금은 기초지자체일 때만 뜻이 있다. 남기면 다른 역할의 화면이 관내로 좁혀진다 */
  const next =
    scope === 'own-municipality'
      ? new URLSearchParams(params.toString())
      : clearMunicipalityLock(params);

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
