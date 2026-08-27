'use client';

import { LogOut, UserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { ACTION_BUTTON_QUIET } from '@/shared/ui/action-button';
import { BADGE_BASE } from '@/shared/ui/badge';
import { Eyebrow } from '@/shared/ui/eyebrow';
import { SEG_ITEM, SEG_ITEM_OFF, SEG_TRACK } from '@/shared/ui/segmented-control';
import { ADMIN_ACCOUNTS } from '../config/accounts';
import {
  ROLES,
  ROLE_PROFILES,
  ROLE_SWITCH_BLOCKED_REASON,
  SWITCHABLE_ROLES,
} from '../config/constants';
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
  const triggerRef = useRef<HTMLButtonElement>(null);

  // 바깥을 누르거나 Esc를 치면 닫힌다. 열림 상태는 모두에게 false로 시작하므로 SSR과 같다
  useEffect(() => {
    if (!open) return;

    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    /*
     * **Esc로 닫으면 초점을 열던 버튼으로 되돌린다.** 닫기만 하면 초점이 사라진 요소에
     * 남아 `body`로 튀고, 키보드 사용자는 헤더 맨 앞부터 다시 Tab 해야 한다
     * (모달에서 같은 것을 이미 고쳤다 — `shared/ui/modal.tsx`).
     * 바깥을 눌러 닫을 때는 되돌리지 않는다 — 그 누름이 이미 초점을 옮겼다.
     */
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
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
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="계정과 역할"
        className="inline-flex size-7 cursor-pointer items-center justify-center rounded-chip text-fg-muted transition-colors duration-200 hover:bg-surface-2 hover:text-fg"
      >
        <UserRound aria-hidden size={16} strokeWidth={1.9} />
      </button>

      {open && (
        /*
         * **화면의 카드와 같은 어휘로 짠다** `[사용자 지시 2026-08-25]` — 카드 모서리
         * (`--radius-panel`), 카드 테두리·그림자, 구역마다 `Eyebrow` 제목.
         * 예전에는 이 메뉴만 8px 모서리에 11px 글자, 회색 칩 줄이라 다른 앱처럼 보였다.
         *
         * **폭을 넓혔다(240 → 272px).** 역할 이름이 `시스템 관리자`(6자)라 세 칸이 240px에서
         * 두 줄로 접혔다 — 탭 한 칸에 최소 78px이 필요하고 여백을 빼면 272px이 그 하한이다.
         */
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-[min(272px,calc(100vw-2rem))] rounded-panel border border-card-border bg-surface p-4 shadow-lg"
        >
          <div className="flex items-center justify-between gap-2">
            <Eyebrow>역할 전환</Eyebrow>
            {/* 이 분기가 인가로 오해되면 안 된다. 화면에 적어 둔다(E6 예외) */}
            <span className={`${BADGE_BASE} bg-surface-3 text-fg-muted`}>인가 아님</span>
          </div>

          {/*
           * 탭 껍데기는 화면의 다른 탭·필터와 **같은 것**을 쓴다(`SEG_*`).
           * 칸을 `flex-1`로 늘려 세 역할이 같은 폭을 갖고, 라벨은 줄바꿈하지 않는다.
           */}
          <div
            role="group"
            aria-label="시연 역할 전환"
            className={cn(SEG_TRACK, 'mt-2 w-full flex-nowrap')}
          >
            {ROLES.map((role) => {
              const blocked = !SWITCHABLE_ROLES.includes(role);
              return (
                <button
                  key={role}
                  type="button"
                  disabled={blocked}
                  title={blocked ? ROLE_SWITCH_BLOCKED_REASON : undefined}
                  onClick={() => {
                    setRole(role);
                    setOpen(false);
                  }}
                  className={cn(
                    SEG_ITEM,
                    'flex-1 whitespace-nowrap px-1.5 text-center',
                    blocked ? 'cursor-not-allowed opacity-40' : SEG_ITEM_OFF,
                    /* 지금 역할은 CSS가 고른다 — 마크업은 역할을 모른다(hydration) */
                    `role-pick-${role}`,
                  )}
                >
                  {ROLE_PROFILES[role].label}
                </button>
              );
            })}
          </div>

          {/*
           * 왜 못 누르는지 화면이 말한다 — 흐릿하게만 두면 고장으로 읽힌다.
           * **막힌 역할이 하나도 없으면 문단을 두지 않는다** — 아무것도 막혀 있지 않은데
           * 이유만 남으면 무엇을 말하는지 알 수 없다.
           */}
          {ROLES.some((role) => !SWITCHABLE_ROLES.includes(role)) && (
            <p className="mt-2 text-[12px] leading-relaxed text-fg-subtle">
              {ROLE_SWITCH_BLOCKED_REASON}
            </p>
          )}

          {/*
           * 지금 누구로 보고 있는지. **역할마다 한 벌을 그리고 CSS가 고른다** —
           * 서버는 localStorage를 읽을 수 없어 렌더 중 분기하면 hydration이 깨진다.
           */}
          <div className="mt-3 rounded-nested bg-surface-2 p-3">
            {ROLES.map((role) => (
              <div key={role} className={`role-only-${role} flex items-center justify-between gap-2`}>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-fg">
                    {ROLE_PROFILES[role].demoName}
                  </p>
                  <p className="truncate text-[12px] text-fg-subtle">{ROLE_PROFILES[role].who}</p>
                </div>
                <span className={`${BADGE_BASE} shrink-0 bg-surface text-fg-muted`}>
                  {ROLE_PROFILES[role].scopeLabel}
                </span>
              </div>
            ))}
          </div>

          {/* 사업장 역할일 때만 계정이 둘이다. 사업장이 달라 화면 값이 통째로 바뀐다 */}
          <div className="role-only-site mt-3">
            <Eyebrow>계정 전환</Eyebrow>
            <div
              role="group"
              aria-label="사업장 계정 전환"
              className={cn(SEG_TRACK, 'mt-2 w-full flex-nowrap')}
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
                    SEG_ITEM,
                    'flex-1 whitespace-nowrap text-center',
                    SEG_ITEM_OFF,
                    `admin-pick-${index + 1}`,
                  )}
                >
                  {account.label}
                </button>
              ))}
            </div>
          </div>

          <button type="button" onClick={signOut} className={cn(ACTION_BUTTON_QUIET, 'mt-4 w-full justify-center')}>
            <LogOut aria-hidden size={14} strokeWidth={1.9} />
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}