'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import {
  DEFAULT_ADMIN_ACCOUNT,
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
  const pathname = usePathname();
  const [role, setRoleState] = useState<Role>(readAppliedRole);
  const [adminAccount, setAdminState] = useState<AdminAccountKey>(readAppliedAdmin);

  /**
   * 사업장 역할은 자사 1개소만 본다. 전환 즉시 URL을 자사로 바꿔 둔다 —
   * 라우트 가드가 나중에 되돌리게 두면 남의 사업장이 한 프레임 보인다.
   */
  const goToOwnSite = useCallback(
    (key: AdminAccountKey) => {
      router.replace(`${pathname}?site=${adminSiteId(key)}`);
    },
    [router, pathname],
  );

  const setRole = useCallback(
    (next: Role) => {
      document.documentElement.setAttribute('data-role', next);
      write(ROLE_STORAGE_KEY, next);
      setRoleState(next);
      /* 자사 1개소 범위로 바꾸면 URL의 사업장도 자사로 옮긴다. 역할 이름이 아니라 범위로 가른다 */
      if (scopeOf(next) === 'own-site') goToOwnSite(readAppliedAdmin());
    },
    [goToOwnSite],
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
