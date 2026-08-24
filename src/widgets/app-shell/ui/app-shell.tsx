'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { BRAND_NAME } from '@/shared/config/constants';
import { DEMO_NOTICE, DEMO_NOW_ISO } from '@/shared/config/demo';
import { COLLECTION_INTERVAL_MINUTES } from '@/shared/config/measurement';
import { cn } from '@/shared/lib/cn';
import { BADGE_BASE } from '@/shared/ui/badge';
import { DISPLAY_TIMEZONE, formatDateTime } from '@/shared/lib/format';
import { BrandMark } from '@/shared/ui/brand-mark';
import { ThemeToggle } from '@/shared/ui/theme';
import { InfoTip } from '@/shared/ui/tooltip';
import { openAlarms } from '@/entities/alarm';
import { ADMIN_ACCOUNTS, ProfileMenu, ROLES, canRoleSee } from '@/entities/user';
import { getSite } from '@/entities/site';
import { ALL_ALARMS, useAlarmStates } from '@/features/alarm-ack';
import { SiteSelector, useSelectedSiteId, useSiteHref } from '@/features/site-selection';
import {
  ALARM_NAV_HREF,
  NAV_ITEMS,
  homeHrefFor,
  navLabelOf,
  type NavItem,
} from '../config/navigation';
import { useRoleRouteGuard } from '../lib/use-role-route-guard';
import { AlarmMenu } from './alarm-menu';
import { LiveClock } from './live-clock';

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

      <aside className="sticky top-0 hidden h-screen w-[296px] shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <BrandHome />
        <SiteNav pathname={pathname} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-border bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-4 lg:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <SiteSelector className="w-[208px]" />
              <span className={cn(BADGE_BASE, 'bg-surface-2 uppercase tracking-[0.1em] text-fg-subtle')}>
                Demo
              </span>
              <DemoNotice />
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-fg-subtle">
              <ReceiveIndicator />
              <LiveClock />
              <AlarmMenu />
              <ThemeToggle />
              <ProfileMenu />
            </div>
          </div>
        </header>

        <main id="main" tabIndex={-1} className="flex-1 px-4 py-4 lg:px-6 lg:py-6">
          {/*
           * 화면명은 본문의 첫 줄이다 `[사용자 지시 2026-08-24]`. 헤더에 두면 사업장 선택·
           * 시계·알림과 한 줄에서 자리를 다투고, 스크롤해도 붙어 있어 본문의 시작을 가린다.
           * 여기 두면 본문 콘텐츠와 왼쪽 끝이 맞고 스크롤과 함께 올라간다.
           */}
          <h1 className="mb-4 text-[20px] font-bold leading-tight tracking-tight text-fg lg:mb-5">
            {navLabelOf(pathname)}
          </h1>
          {children}
        </main>
      </div>
    </div>
  );
}

/**
 * 시연 데이터임과 **데이터 기준 시각**을 알린다.
 *
 * 헤더 시계는 현재 시각이고 본문 값은 고정 시점의 것이다. 둘을 구분해 주지 않으면
 * 차트 날짜가 오늘이 아닌 이유를 알 수 없다 — 예전에는 헤더 아래 띠로 상시 노출했는데
 * 전 화면에서 한 줄을 차지해 아이콘 + 툴팁으로 옮겼다 `[사용자 지시 2026-08-24]`.
 *
 * `Demo` 뱃지가 옆에 남아 **시연 데이터라는 사실 자체는 호버 없이도 보인다** —
 * 툴팁에는 기준 시각처럼 필요할 때 확인하는 것만 담는다.
 */
function DemoNotice() {
  return (
    <InfoTip
      label="시연 데이터 안내"
      content={
        <>
          {DEMO_NOTICE}
          <br />
          데이터 기준 <span className="num">{formatDateTime(DEMO_NOW_ISO)}</span>{' '}
          {DISPLAY_TIMEZONE} · 헤더 시계는 현재 시각입니다
        </>
      }
    />
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
 * 미확인 알람 수. **역할·계정마다 숫자가 다르다** — 시스템 관리자·지자체는 전 사업장,
 * 사업장은 자사 1개소다. 서버는 둘 다 모르므로 세 벌을 렌더하고 CSS가 고른다.
 * 렌더 중에 역할로 분기해 숫자를 하나만 그리면 하이드레이션이 깨진다.
 */
function AlarmBadge() {
  /* 헤더 알림과 **같은 상태**를 본다. 정적 fixture를 읽으면 확인 처리를 해도 줄지 않는다 */
  const { alarms } = useAlarmStates(ALL_ALARMS);

  return (
    <>
      <Badge count={openAlarms(alarms).length} className="role-hide-site" />
      {ADMIN_ACCOUNTS.map((account, index) => (
        <Badge
          key={account.key}
          count={openAlarms(alarms, account.siteId).length}
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
        BADGE_BASE,
        'num min-w-5 justify-center rounded-full bg-critical/16 text-critical-ink',
        className,
      )}
    >
      {count}
    </span>
  );
}

/**
 * 로고와 시스템명을 눌러 첫 화면으로 간다 `[사용자 요청 2026-08-20]`.
 *
 * 목적지는 **역할이 정한다** — 사업장에는 통합 관제가 닫혀 있어 모두를 `/`로 보내면
 * 라우트 가드가 곧바로 되돌린다. 역할을 바꿨을 때 가는 곳과 같은 값을 쓴다(`homeHrefFor`).
 *
 * **그런데 렌더 중에 역할로 `href`를 가를 수 없다.** 서버는 localStorage를 모르므로 서버가
 * 그린 `/`와 클라이언트가 그릴 `/overview`가 어긋나 하이드레이션이 깨진다 — 실제로 깨졌고,
 * React가 "This won't be patched up"이라 경고하며 사업장 역할에 잘못된 링크가 남았다.
 * 그래서 **목적지마다 한 벌씩 그리고 CSS가 고른다**(`design-system §2.0`). 숨은 쪽은
 * `display:none`이라 탭 순서에도 남지 않는다.
 */
function BrandHome() {
  const withSite = useSiteHref();
  const targets = ROLES.map((role) => homeHrefFor(role));

  return (
    <>
      {[...new Set(targets)].map((href) => (
        <Link
          key={href}
          href={withSite(href)}
          className={cn(
            /* overflow-hidden은 안전망이다 — nowrap 텍스트가 예상보다 넓어도 본문 위로
               삐져나오지 않는다. 폭에 20px 여유를 두었으므로 실제로 잘릴 일은 없다 */
            'flex cursor-pointer items-center gap-2 overflow-hidden px-6 py-5',
            'focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-border-strong',
            /* 이 목적지를 쓰지 않는 역할에서는 감춘다 */
            ROLES.filter((role) => homeHrefFor(role) !== href)
              .map((role) => `role-hide-${role}`)
              .join(' '),
          )}
        >
          <BrandMark size={24} />
          {/*
           * 사업계획서 p.37·p.118의 국문 정식명. 폭이 좁아 줄여 쓰고 싶어지지만 줄이지 않는다(A2).
           * `whitespace-nowrap`이 두 줄을 막고, 13px `font-bold`에서 텍스트 폭이 약 202px이라
           * 마크·간격·여백을 뺀 216px에 14px 여유를 두고 들어간다 — 잘리지 않는다.
           * **더 키우려면 사이드바를 더 늘려야 한다** — 14px은 218px이 필요해 296px로는 넘친다.
           */}
          <p className="whitespace-nowrap text-[13px] font-bold leading-tight tracking-tight text-fg">
            {BRAND_NAME}
          </p>
        </Link>
      ))}
    </>
  );
}

function SiteNav({ pathname }: { pathname: string }) {
  const withSite = useSiteHref();

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3.5 pb-4">
      {NAV_ITEMS.map((item) => {
        const active = item.href === pathname;
        return (
          <Link
            key={item.href}
            href={withSite(item.href)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-[10px] p-2.5 text-[14px] font-medium',
              'transition-colors duration-200',
              active
                ? 'bg-surface-2 font-semibold text-fg'
                : 'text-fg-muted hover:bg-surface-2/60 hover:text-fg',
              hiddenForClass(item),
            )}
          >
            <item.icon size={20} strokeWidth={1.9} className="shrink-0" />
            <span className="min-w-0 flex-1 break-keep text-left">{item.label}</span>
            {item.href === ALARM_NAV_HREF && <AlarmBadge />}
          </Link>
        );
      })}
    </nav>
  );
}
