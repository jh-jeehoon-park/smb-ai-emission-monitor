'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import {
  MUNICIPALITY_QUERY_KEY,
  SCOPE_QUERY_KEY,
  SITE_QUERY_KEY,
  clearMunicipalityLock,
  hasMunicipalityLock,
  resetScopeToAllSites,
} from '@/shared/config/scope';
import { firstSiteIn, sitesIn } from '@/entities/site';
import {
  GOV_MUNICIPALITY,
  adminSiteId,
  scopeOf,
  useRole,
  type Role,
  type RoleScope,
} from '@/entities/user';
import { FORBIDDEN_PATH, homeHrefFor, isBlockedFor } from '../config/navigation';

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

  /*
   * 직전 역할. **마운트에서는 지금 역할로 시작한다** — 역할은 localStorage에 남아 있어
   * 새로고침으로 다시 들어온 것은 «바뀐 것»이 아니다. 여기서 `DEFAULT_ROLE`로 시작하면
   * 사업장 사용자가 새로고침할 때마다 보던 화면을 잃는다.
   */
  const seenRole = useRef(role);

  useEffect(() => {
    const switched = seenRole.current !== role;
    seenRole.current = role;

    const home = homeHrefFor(role);

    /*
     * **역할을 바꾸면 그 역할의 메인 대시보드로 간다** `[사용자 요청 2026-09-01]`.
     *
     * 그전까지는 새 역할에도 열려 있는 화면이면 **그 자리에 그대로 머물렀다.** 그런데 역할이
     * 바뀌면 범위(전국 10개소 / 관내 2개소 / 자사 1개소)와 사이드바 항목이 통째로 갈리므로,
     * 같은 화면이 다른 숫자를 들고 남아 있으면 **무엇이 바뀐 것인지 화면이 말해 주지 않는다** —
     * 알람 이력에서 전환하면 목록만 조용히 짧아졌다.
     *
     * 아래 «닫힌 화면» 분기와 목적지가 같지만 조건이 다르다: 그쪽은 *들어가면 안 되는 곳*을
     * 막는 것이고 이쪽은 *열려 있어도 처음으로 되돌리는* 것이다. 이미 홈이면 옮기지 않는다 —
     * 그 아래 범위 교정이 이어서 돈다.
     *
     * **범위를 먼저 리셋하고 얹는다.** `scopeParams`는 `scope=site`를 남겨 두는데(알람·리포트의
     * 범위 세그먼트가 같은 키를 쓴다), 여기 오는 `params`는 **직전 역할의 것일 수 있다** —
     * `role-context`가 이미 걷어 두지만 그것은 `history.replaceState`라 이 effect가 그 갱신
     * *전에* 도는 순서를 배제할 수 없다. 그러면 시스템 관리자의 통합 관제가 `scope=site`를
     * 달고 열려 **전 사업장 권한인데 1개소만 보인다.** 역할 전환은 한 번의 분명한 동작이라
     * 새 역할의 기본 범위로 되돌리는 것이 맞고(`resetScopeToAllSites`), 그러면 순서에 기대지
     * 않아도 된다.
     */
    if (switched && pathname !== home) {
      router.replace(withScope(home, role, adminAccount, resetScopeToAllSites(params)));
      return;
    }

    /*
     * **닫힌 화면은 `/403`으로 보낸다** `[사용자 요청 2026-09-15]`.
     *
     * 한때 이 자리가 `router.replace(home)`이었다 — 말없이 홈으로 튕겼고, effect가 화면이
     * 그려진 **뒤** 돌아 권한 없는 본문이 **1.61~11.75초** 그대로 보였다(실측).
     *
     * **그리지 않는 일은 `RoleGate`가 맡는다** — 보내는 것만으로는 옛 상태와 같다(이동하는
     * 동안 본문이 보인다). 판단은 `isBlockedFor` 하나를 함께 써 갈리지 않는다.
     *
     * **이동을 여기 한 곳에 모은 이유가 있다** `[설계 2026-09-16: 리다이렉트 검토]`. 한때 `RoleGate`가 직접
     * 보냈는데, 역할을 바꿔 지금 화면이 닫히는 순간 **위 «역할 전환» 갈래와 동시에** 이동을
     * 걸어 마지막 `replace`가 이기는 경쟁이 됐다 — 실측에서는 홈이 이겼지만 그것은 자식
     * effect가 부모보다 먼저 도는 **우연**이라, 부품을 옮기면 조용히 뒤집힌다. 지금은 한
     * effect 안의 순서라 «전환은 홈, 직접 열면 403»이 코드로 읽힌다.
     *
     * **아래 범위 교정은 건너뛴다** — `withScope(pathname, …)`이 막힌 주소로 다시 보내
     * 이 이동을 덮어쓴다(실측에서 셋이 그렇게 되돌아왔다). 떠날 화면이라 잃는 것도 없다.
     */
    if (isBlockedFor(pathname, role)) {
      router.replace(`${FORBIDDEN_PATH}?from=${encodeURIComponent(pathname)}`);
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
