'use client';

import { LogOut, UserRound } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { DEMO_NOTICE, DEMO_NOW_ISO } from '@/shared/config/demo';
import { cn } from '@/shared/lib/cn';
import { DISPLAY_TIMEZONE, formatDateTime } from '@/shared/lib/format';
import { useDismiss } from '@/shared/lib/use-dismiss';
import { ACTION_BUTTON_QUIET, ICON_BUTTON } from '@/shared/ui/action-button';
import { BADGE_BASE } from '@/shared/ui/badge';
import { Eyebrow } from '@/shared/ui/eyebrow';
import { LiveClock } from '@/shared/ui/live-clock';
import { ThemeToggle } from '@/shared/ui/theme';
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
 * 헤더의 계정 메뉴 — **지금 이 세션이 무엇으로 서 있는가**를 담는다.
 *
 * | 묶음 | 무엇 |
 * |---|---|
 * | 계정 | 역할 전환 · 지금 누구 · 계정 전환 · 로그아웃 |
 * | 화면 | 테마 |
 * | 시각 | 현재 시각 · 데이터 기준 시각 · 시연 고지 |
 *
 * 한때 **시연 계정에 관한 조작만** 있었다. 「화면」·「시각」이 2026-09-18에 헤더에서 내려왔다
 * `[사용자 요청 2026-09-18: 모바일 헤더 반응형]` — 그 셋이 헤더에서 190px을 차지해 좁은
 * 화면에서 헤더가 3줄(167px · 화면의 20%)이 됐다. 옛 범위를 지우지 않고 넓힌 이유를 남긴다.
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

  /*
   * 바깥을 누르거나 Esc를 치면 닫힌다 — 규약은 `shared/lib/use-dismiss.ts`가 갖는다.
   * 열림 상태는 모두에게 false로 시작하므로 SSR과 같다.
   */
  const close = useCallback(() => setOpen(false), []);
  useDismiss({ open, onDismiss: close, boxRef, triggerRef });

  return (
    <div ref={boxRef} className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="계정과 화면 설정"
        className={cn(ICON_BUTTON, 'text-fg-muted')}
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

          {/*
           * **「화면」과 「시각」이 헤더에서 내려왔다** `[사용자 요청 2026-09-18: 모바일 헤더
           * 반응형]`. 헤더에서 테마 28px · 시계 146px · 시연 안내 16px을 차지해 좁은 화면에서
           * 헤더가 3줄(167px · 화면의 20%)이 됐다.
           *
           * **잡화점이 되지 않게 가로줄로 가른다.** 축이 셋으로 분명하다 — 나(계정) ·
           * 화면(표시) · 시각(기준). 셋 다 «지금 이 세션이 무엇으로 서 있는가»의 답이라
           * 한 메뉴에 있는 것이 맞고, 묶이지 않은 채 쌓이는 것만 피하면 된다.
           */}
          <div className="mt-4 border-t border-border pt-3">
            <Eyebrow>화면</Eyebrow>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-[13px] text-fg-muted">테마</span>
              <ThemeToggle />
            </div>
          </div>

          <div className="mt-3 border-t border-border pt-3">
            <Eyebrow>시각</Eyebrow>
            {/*
             * **현재 시각과 데이터 기준 시각을 나란히 둔다**(E5). 헤더에 있을 때부터 둘은
             * 붙어 있어야 했다 — 시계는 지금이고 화면의 값은 고정 시점의 것이라, 따로 두면
             * 차트 날짜가 오늘이 아닌 이유를 알 수 없다.
             *
             * 기준 시각이 **글자가 된 것이 이번의 이득**이다. 헤더에서는 아이콘 툴팁 안에만
             * 있어 `tooltip.tsx`가 적어 둔 «툴팁에 값을 담지 않는다(E3)»를 이 자리가 어기고
             * 있었다.
             */}
            <dl className="mt-2 space-y-1 text-[13px]">
              <div className="flex items-baseline justify-between gap-2">
                <dt className="shrink-0 text-fg-subtle">현재</dt>
                <dd className="num text-right text-fg-muted">
                  <LiveClock />
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="shrink-0 text-fg-subtle">데이터 기준</dt>
                <dd className="num text-right text-fg-muted">
                  {formatDateTime(DEMO_NOW_ISO)} {DISPLAY_TIMEZONE}
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-[12px] leading-relaxed text-fg-subtle">{DEMO_NOTICE}</p>
          </div>

          <button
            type="button"
            onClick={signOut}
            className={cn(ACTION_BUTTON_QUIET, 'mt-4 w-full justify-center')}
          >
            <LogOut aria-hidden size={14} strokeWidth={1.9} />
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}