'use client';

import { LogOut } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { ADMIN_ACCOUNTS } from '../config/accounts';
import { ROLES, ROLE_PROFILES } from '../config/constants';
import { useRole } from './role-context';

/**
 * 계정이 하나뿐이라 로그인으로는 역할을 가릴 수 없다. 전환을 로그인과 분리해
 * 여기에 둔다 — 실제 제품에서도 계정·역할은 셸 하단에 있다.
 *
 * **마크업이 역할을 모른다.** 서버는 localStorage를 읽을 수 없어 역할로 분기하면
 * 하이드레이션이 깨진다. 세 역할을 모두 그리고 `data-role`이 CSS로 고른다.
 * 테마 토글이 아이콘 두 개를 모두 그리는 것과 같은 이유다.
 */
export function RoleSwitch({ className }: { className?: string }) {
  const { setRole, setAdminAccount, signOut } = useRole();

  return (
    <div className={cn('border-t border-border p-3', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] text-fg-subtle">시연 계정</p>
        {/* 이 분기가 인가로 오해되면 안 된다. 화면에 적어 둔다(E6 예외) */}
        <p className="text-[10px] text-fg-subtle">인가 아님</p>
      </div>

      <div
        role="group"
        aria-label="시연 역할 전환"
        className="mt-1.5 flex rounded-[4px] border border-border bg-surface-2 p-0.5"
      >
        {ROLES.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRole(value)}
            className={cn(
              'flex-1 cursor-pointer rounded-[3px] px-1 py-1 text-[11px] text-fg-subtle',
              'transition-colors duration-200 hover:text-fg-muted',
              `role-pick-${value}`,
            )}
          >
            {ROLE_PROFILES[value].label}
          </button>
        ))}
      </div>

      {/* 관리자일 때만 보인다. 계정이 곧 범위다 — 어느 사업장의 사업주인가 */}
      <div className="role-only-admin">
        <div
          role="group"
          aria-label="관리자 계정 전환"
          className="mt-1.5 flex rounded-[4px] border border-border bg-surface-2 p-0.5"
        >
          {ADMIN_ACCOUNTS.map((account, index) => (
            <button
              key={account.key}
              type="button"
              onClick={() => setAdminAccount(account.key)}
              className={cn(
                'flex-1 cursor-pointer rounded-[3px] px-1 py-1 text-[11px] text-fg-subtle',
                'transition-colors duration-200 hover:text-fg-muted',
                `admin-pick-${index + 1}`,
              )}
            >
              {account.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="min-w-0">
          {ROLES.map((value) => (
            <div key={value} className={`role-only-${value}`}>
              <p className="truncate text-[11px] text-fg-muted">{ROLE_PROFILES[value].who}</p>
              <p className="truncate text-[11px] text-fg-subtle">{ROLE_PROFILES[value].scopeLabel}</p>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={signOut}
          className="flex shrink-0 cursor-pointer items-center gap-1 rounded-[4px] border border-border px-1.5 py-1 text-[11px] text-fg-subtle transition-colors duration-200 hover:border-border-strong hover:bg-surface-2 hover:text-fg"
        >
          <LogOut aria-hidden size={11} strokeWidth={1.9} />
          로그아웃
        </button>
      </div>
    </div>
  );
}
