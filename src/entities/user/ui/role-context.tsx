'use client';

import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import {
  MUNICIPALITY_QUERY_KEY,
  SCOPE_QUERY_KEY,
  SITE_QUERY_KEY,
  resetScopeToAllSites,
} from '@/shared/config/scope';
import { replaceQuery } from '@/shared/lib/replace-query';
import {
  DEFAULT_ADMIN_ACCOUNT,
  GOV_HOME_SITE_ID,
  GOV_MUNICIPALITY,
  adminSiteId,
  normalizeAdminAccount,
  type AdminAccountKey,
} from '../config/accounts';
import { scopeOf } from '../config/constants';
import {
  ADMIN_STORAGE_KEY,
  AUTH_STORAGE_KEY,
  DEFAULT_ROLE,
  LOGIN_PATH,
  ROLE_STORAGE_KEY,
  normalizeRole,
} from '../config/session';
import type { Role } from '../model/types';

interface RoleContextValue {
  role: Role;
  /** 역할이 admin일 때만 뜻이 있다. 범위 축은 계정이 정한다 */
  adminAccount: AdminAccountKey;
  setRole: (next: Role) => void;
  setAdminAccount: (next: AdminAccountKey) => void;
  signIn: () => void;
  signOut: () => void;
}

const RoleContext = createContext<RoleContextValue | null>(null);

/**
 * `<head>` 스크립트가 이미 확정해 둔 값을 그대로 읽는다. 마운트 후 effect로
 * 다시 set하면 렌더가 한 번 더 돌면서 사이드바가 번쩍인다. (테마와 같은 이유)
 */
function readAppliedRole(): Role {
  if (typeof document === 'undefined') return DEFAULT_ROLE;
  return normalizeRole(document.documentElement.getAttribute('data-role'));
}

function readAppliedAdmin(): AdminAccountKey {
  if (typeof document === 'undefined') return DEFAULT_ADMIN_ACCOUNT;
  return normalizeAdminAccount(document.documentElement.getAttribute('data-admin'));
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 시크릿 모드 등에서 막힐 수 있다. 이번 세션 동안만 적용되면 된다.
  }
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [role, setRoleState] = useState<Role>(readAppliedRole);
  const [adminAccount, setAdminState] = useState<AdminAccountKey>(readAppliedAdmin);

  /**
   * 사업장 역할은 자사 1개소만 본다. 전환 즉시 URL을 자사로 바꿔 둔다 —
   * 라우트 가드가 나중에 되돌리게 두면 남의 사업장이 한 프레임 보인다.
   *
   * **쿼리만 바뀌므로 서버를 거치지 않는다.** `router.replace`로 두면 그 '한 프레임'이
   * RSC 왕복만큼 길어져, 이 함수가 막으려던 것을 스스로 만든다.
   */
  const goToOwnSite = useCallback((key: AdminAccountKey) => {
    const next = new URLSearchParams(window.location.search);
    next.set(SITE_QUERY_KEY, adminSiteId(key));
    next.set(SCOPE_QUERY_KEY, 'site');
    replaceQuery(next);
  }, []);

  /**
   * 기초지자체는 관할 시·군·구만 본다. 같은 이유로 전환 즉시 URL을 관내로 옮긴다 —
   * 가드에 맡기면 **남의 관할이 한 프레임 보인다.**
   *
   * `scope`까지 함께 박는다. 사업장 쪽은 한때 `site`만 박아 두어 가드가 다음 틱에 `scope`를
   * 더했는데, 이 함수가 막으려던 그 한 프레임이 `scope`에서는 그대로 남아 있었다.
   */
  const goToOwnMunicipality = useCallback(() => {
    /* 다른 쿼리(기간·우선순위 등)를 버리지 않는다 — 손으로 이어 붙이던 판본이 그랬다 */
    const next = new URLSearchParams(window.location.search);
    next.set(SCOPE_QUERY_KEY, 'municipality');
    next.set(MUNICIPALITY_QUERY_KEY, GOV_MUNICIPALITY);
    next.set(SITE_QUERY_KEY, GOV_HOME_SITE_ID);
    replaceQuery(next);
  }, []);

  /**
   * 전 사업장으로 되돌린다. **좁은 범위로 가는 길만 있고 나오는 길이 없었다** — 기초지자체나
   * 사업장을 거쳐 시스템 관리자로 돌아오면 `scope=municipality`·`scope=site`가 URL에 남아,
   * 전 사업장 권한인데 관내 2개소(또는 자사 1개소)만 보였다. 헤더 선택기·이상 탐지 순위표·
   * 알람·리포트가 전부 이 쿼리 하나를 읽는다.
   */
  const goToAllSites = useCallback(() => {
    replaceQuery(resetScopeToAllSites(new URLSearchParams(window.location.search)));
  }, []);

  const setRole = useCallback(
    (next: Role) => {
      document.documentElement.setAttribute('data-role', next);
      write(ROLE_STORAGE_KEY, next);
      setRoleState(next);

      /* 범위로 가른다. 역할 이름으로 적으면 역할이 늘 때마다 이 자리를 다시 찾아야 한다 */
      const scope = scopeOf(next);
      if (scope === 'all-sites') goToAllSites();
      if (scope === 'own-site') goToOwnSite(readAppliedAdmin());
      if (scope === 'own-municipality') goToOwnMunicipality();
    },
    [goToOwnSite, goToOwnMunicipality, goToAllSites],
  );

  const setAdminAccount = useCallback(
    (next: AdminAccountKey) => {
      document.documentElement.setAttribute('data-admin', next);
      write(ADMIN_STORAGE_KEY, next);
      setAdminState(next);
      goToOwnSite(next);
    },
    [goToOwnSite],
  );

  const signIn = useCallback(() => {
    write(AUTH_STORAGE_KEY, '1');
    router.replace('/');
  }, [router]);

  const signOut = useCallback(() => {
    write(AUTH_STORAGE_KEY, '0');
    router.replace(LOGIN_PATH);
  }, [router]);

  return (
    <RoleContext.Provider
      value={{ role, adminAccount, setRole, setAdminAccount, signIn, signOut }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within RoleProvider');
  return ctx;
}
