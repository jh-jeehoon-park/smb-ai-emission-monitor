'use client';

import { Waves } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { DEMO_NOTICE, DEMO_NOW_ISO } from '@/shared/config/demo';
import { COLLECTION_INTERVAL_MINUTES } from '@/shared/config/measurement';
import { cn } from '@/shared/lib/cn';
import { formatDateTime } from '@/shared/lib/format';
import { ThemeToggle } from '@/shared/ui/theme';
import { countOpenAlarms, countOpenAlarmsAcrossSites } from '@/entities/alarm';
import { ADMIN_ACCOUNTS, ROLES, RoleSwitch, canRoleSee } from '@/entities/user';
import { getSite } from '@/entities/site';
import { SiteSelector, useSelectedSiteId, useSiteHref } from '@/features/site-selection';
import { ALARM_NAV_HREF, NAV_ITEMS, navLabelOf, type NavItem } from '../config/navigation';
import { useRoleRouteGuard } from '../lib/use-role-route-guard';

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useRoleRouteGuard();

  return (
    <div className="flex min-h-screen bg-bg">
      {/* 사이드바가 모든 화면에 고정이라 키보드 사용자는 매번 링크 7개를 지나야 본문에 닿는다 */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-[4px] focus:border focus:border-border-strong focus:bg-surface focus:px-3 focus:py-2 focus:text-[12px] focus:text-fg"
      >
        본문으로 건너뛰기
      </a>

      <aside className="sticky top-0 hidden h-screen w-[212px] shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex items-center gap-2 border-b border-border px-4 py-4">
          <span className="flex size-7 items-center justify-center rounded-[5px] bg-normal/12 text-normal">
            <Waves size={15} strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            {/* 사업계획서 p.37·p.118의 국문 정식명. 폭이 좁아 줄여 쓰고 싶어지지만 줄이지 않는다(A2). */}
            <p className="break-keep text-[13px] font-semibold leading-[1.35] tracking-tight text-fg">
              AI 기반 지능형 배출관리 플랫폼
            </p>
          </div>
        </div>

        <SiteNav pathname={pathname} />

        {/* 서버가 없어 역할을 클라이언트가 들고 있다. 이건 인가가 아니라 시연 표시다(E6 예외). */}
        <RoleSwitch />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-border bg-bg">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-6">
            <div className="flex items-center gap-3">
              <h1 className="text-[14px] font-semibold tracking-tight text-fg">
                {navLabelOf(pathname)}
              </h1>
              <span className="rounded-[3px] border border-border-strong bg-surface-2 px-1.5 py-0.5 text-[11px] uppercase tracking-[0.1em] text-fg-subtle">
                Demo
              </span>
              <SiteSelector className="w-[208px]" />
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-fg-subtle">
              <ReceiveIndicator />
              <span className="num">{formatDateTime(DEMO_NOW_ISO)} KST</span>
              <ThemeToggle />
            </div>
          </div>

          <p className="border-t border-border bg-surface px-4 py-1.5 text-[12px] text-fg-subtle lg:px-6">
            {DEMO_NOTICE}
          </p>
        </header>

        <main id="main" tabIndex={-1} className="flex-1 px-4 py-4 lg:px-6 lg:py-5">
          {children}
        </main>
      </div>
    </div>
  );
}

/**
 * 선택 사업장의 수신 상태를 그대로 말한다. 두절된 사업장을 보는 동안에도 "수신 중"이라고
 * 적으면, 본문이 "통신이 두절되어 산출값이 없습니다"라고 말하는 것과 정면으로 어긋난다.
 * 결측을 0으로 그리지 않는 것과 같은 이유다(E4).
 */
function ReceiveIndicator() {
  const { siteId } = useSelectedSiteId();
  const online = getSite(siteId).online;

  if (!online) {
    return (
      <span className="flex items-center gap-1.5 text-critical-ink">
        <span className="size-1.5 rounded-full bg-critical" />
        수신 두절
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5 text-normal-ink">
      <span className="relative flex size-1.5">
        <span className="live-pulse absolute inset-0 rounded-full" />
        <span className="relative size-1.5 rounded-full bg-normal" />
      </span>
      수신 중 · {COLLECTION_INTERVAL_MINUTES}분 주기
    </span>
  );
}

/**
 * 역할별 **노출**을 CSS로 정한다. 서버는 localStorage를 모르므로 렌더 중에 역할로
 * 분기하면 하이드레이션이 깨진다 — 메뉴를 전부 그리고 `data-role`이 가린다.
 * 숨은 항목이 DOM에 남지만 인가가 아니라 시연 표시다(E6 예외).
 *
 * **노출과 접근은 다른 축이다.** `menuRoles`가 있으면 그쪽을 따르고, 없으면 접근 권한을
 * 그대로 쓴다 — 볼 수는 있지만 메뉴에는 없는 화면이 있다(수처리 공정).
 */
function hiddenForClass(item: NavItem): string {
  const visible = item.menuRoles ?? ROLES.filter((role) => canRoleSee(item.screenId, role));
  return ROLES.filter((role) => !visible.includes(role))
    .map((role) => `role-hide-${role}`)
    .join(' ');
}

/**
 * 미확인 알람 수. **역할·계정마다 숫자가 다르다** — 운영자·게스트는 전 사업장,
 * 관리자는 자사 1개소다. 서버는 둘 다 모르므로 세 벌을 렌더하고 CSS가 고른다.
 * 렌더 중에 역할로 분기해 숫자를 하나만 그리면 하이드레이션이 깨진다.
 */
function AlarmBadge() {
  const acrossSites = countOpenAlarmsAcrossSites();

  return (
    <>
      <Badge count={acrossSites} className="role-hide-admin" />
      {ADMIN_ACCOUNTS.map((account, index) => (
        <Badge
          key={account.key}
          count={countOpenAlarms(account.siteId)}
          className={`admin-only-${index + 1}`}
        />
      ))}
    </>
  );
}

/** 0건이면 아무것도 그리지 않는다 — 배지가 '0'을 달고 있으면 확인할 것이 있는 듯 보인다 */
function Badge({ count, className }: { count: number; className: string }) {
  if (count === 0) return null;

  return (
    <span
      className={cn(
        'num rounded-full bg-critical/16 px-1.5 py-px text-[11px] text-critical-ink',
        className,
      )}
    >
      {count}
    </span>
  );
}

function SiteNav({ pathname }: { pathname: string }) {
  const withSite = useSiteHref();

  return (
    <nav className="flex-1 space-y-0.5 p-2">
      {NAV_ITEMS.map((item) => {
        const active = item.href === pathname;
        return (
          <Link
            key={item.href}
            href={withSite(item.href)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-[4px] px-2.5 py-2 text-[12px]',
              'transition-colors duration-200',
              active ? 'bg-surface-2 text-fg' : 'text-fg-muted hover:bg-surface-2/60 hover:text-fg',
              hiddenForClass(item),
            )}
          >
            <item.icon size={14} strokeWidth={1.9} />
            <span className="flex-1 text-left">{item.label}</span>
            {item.href === ALARM_NAV_HREF && <AlarmBadge />}
          </Link>
        );
      })}
    </nav>
  );
}
