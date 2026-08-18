'use client';

import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { ADMIN_ACCOUNTS } from '../config/accounts';
import { ROLES, ROLE_PROFILES } from '../config/constants';
import { useRole } from './role-context';

/**
 * 헤더의 계정 메뉴. **시연 계정에 관한 조작이 전부 여기 있다** — 역할 전환·계정 전환·로그아웃.
 *
 * 한때 역할 전환만 사이드바에 펼쳐 두었으나, 열린 이 메뉴와 사이드바가 역할·범위를 동시에
 * 보여 같은 것이 두 벌로 읽혔다. 한 자리로 합친다.
 *
 * **마크업이 역할을 모른다.** 서버는 localStorage를 읽을 수 없어 역할로 분기하면
 * hydration이 깨진다. 세 역할을 모두 그리고 `data-role`이 CSS로 고른다.
 */
export function ProfileMenu({ className }: { className?: string }) {
  const { setRole, setAdminAccount, signOut } = useRole();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // 바깥을 누르거나 Esc를 치면 닫힌다. 열림 상태는 모두에게 false로 시작하므로 SSR과 같다
  useEffect(() => {
    if (!open) return;

    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={boxRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex cursor-pointer items-center gap-1.5 rounded-[4px] border border-border bg-surface px-2 py-1.5 text-[11px] text-fg-muted transition-colors duration-200 hover:border-border-strong hover:text-fg"
      >
        <UserRound aria-hidden size={13} strokeWidth={1.9} />
        {ROLES.map((role) => (
          <span key={role} className={`role-only-${role}`}>
            {ROLE_PROFILES[role].label}
          </span>
        ))}
        <ChevronDown aria-hidden size={12} strokeWidth={2} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1.5 w-[228px] rounded-[6px] border border-border bg-surface p-3 shadow-lg"
        >
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[11px] text-fg-subtle">역할 전환</p>
            {/* 이 분기가 인가로 오해되면 안 된다. 화면에 적어 둔다(E6 예외) */}
            <p className="text-[10px] text-fg-subtle">인가 아님</p>
          </div>

          <div
            role="group"
            aria-label="시연 역할 전환"
            className="mt-1.5 flex rounded-[4px] border border-border bg-surface-2 p-0.5"
          >
            {ROLES.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => {
                  setRole(role);
                  setOpen(false);
                }}
                className={cn(
                  'flex-1 cursor-pointer rounded-[3px] px-1 py-1 text-[11px] text-fg-subtle',
                  'transition-colors duration-200 hover:text-fg-muted',
                  `role-pick-${role}`,
                )}
              >
                {ROLE_PROFILES[role].label}
              </button>
            ))}
          </div>

          <div className="mt-2">
            {ROLES.map((role) => (
              <div key={role} className={`role-only-${role}`}>
                <p className="truncate text-[12px] text-fg">{ROLE_PROFILES[role].who}</p>
                <p className="truncate text-[11px] text-fg-subtle">
                  {ROLE_PROFILES[role].scopeLabel}
                </p>
              </div>
            ))}
          </div>

          {/* 관리자일 때만 계정이 둘이다. 사업장이 달라 화면 값이 통째로 바뀐다 */}
          <div className="role-only-admin">
            <div className="mt-3 border-t border-border pt-2.5">
              <p className="text-[11px] text-fg-subtle">계정 전환</p>
              <div
                role="group"
                aria-label="관리자 계정 전환"
                className="mt-1.5 flex rounded-[4px] border border-border bg-surface-2 p-0.5"
              >
                {ADMIN_ACCOUNTS.map((account, index) => (
                  <button
                    key={account.key}
                    type="button"
                    onClick={() => {
                      setAdminAccount(account.key);
                      setOpen(false);
                    }}
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
          </div>

          <button
            type="button"
            onClick={signOut}
            className="mt-3 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-[4px] border border-border px-2 py-1.5 text-[11px] text-fg-subtle transition-colors duration-200 hover:border-border-strong hover:bg-surface-2 hover:text-fg"
          >
            <LogOut aria-hidden size={12} strokeWidth={1.9} />
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}
