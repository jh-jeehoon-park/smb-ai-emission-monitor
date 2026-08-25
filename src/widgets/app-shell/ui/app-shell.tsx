'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BRAND_NAME } from '@/shared/config/constants';
import { DEMO_NOTICE, DEMO_NOW_ISO } from '@/shared/config/demo';
import { COLLECTION_INTERVAL_MINUTES } from '@/shared/config/measurement';
import { cn } from '@/shared/lib/cn';
import { BADGE_BASE } from '@/shared/ui/badge';
import { DISPLAY_TIMEZONE, formatDateTime } from '@/shared/lib/format';
import { BrandMark } from '@/shared/ui/brand-mark';
import { TopButton } from '@/shared/ui/top-button';
import { ThemeToggle } from '@/shared/ui/theme';
import { InfoTip } from '@/shared/ui/tooltip';
import { openAlarms } from '@/entities/alarm';
import { ADMIN_ACCOUNTS, ProfileMenu, ROLES, ROLE_PROFILES } from '@/entities/user';
import { getSite } from '@/entities/site';
import { ALL_ALARMS, useAlarmStates } from '@/features/alarm-ack';
import { useSelectedSiteId, useSiteHref } from '@/features/site-selection';
import {
  ALARM_NAV_HREF,
  NAV_GROUPS,
  groupMenuRoles,
  homeHrefFor,
  menuRolesOf,
  navLabelOf,
  type NavGroup,
  type NavItem,
} from '../config/navigation';
import { useRoleRouteGuard } from '../lib/use-role-route-guard';
import { AlarmMenu } from './alarm-menu';
import { LiveClock } from './live-clock';

export function AppShell({ children }: { children: ReactNode }) {
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = headerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const ro = new ResizeObserver(() => {
      document.documentElement.style.setProperty('--header-h', `${el.offsetHeight}px`);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty('--header-h');
    };
  }, []);

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

      <aside className="sticky top-0 hidden h-screen w-[280px] shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <BrandHome />
        <SiteNav pathname={pathname} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/*
         * **헤더 높이를 재서 `--header-h`에 넣는다** `[사용자 지시 2026-08-24: 반응형 점검]`.
         *
         * 이 값은 본문 안에서 `sticky`로 붙는 요소(구역의 탭 줄, 지도 레일)가 얼마나 내려가야
         * 하는지를 정한다. 토큰에 61px을 박아 두고 "헤더는 `xl` 이상에서 줄바꿈하지 않는다"고
         * 적어 두었는데, **좁은 화면에서는 오른쪽 상태 묶음이 아래로 접혀 헤더가 두 줄(90px+)이
         * 된다** — 그때 탭 줄이 61px에 붙어 헤더 뒤로 들어갔다.
         *
         * 재서 넣으면 그 가정이 사라진다. CSS의 61px은 서버가 보내는 첫 화면용 초기값으로 남는다.
         */}
        {/*
         * **겹침 순서** `[사용자 지시 2026-08-25]`:
         *   10 본문 안에서 붙는 것(구역 탭 줄, 표 머리, 이력의 날짜 띠)
         *   20 화면 구석에 뜨는 것(맨 위로 버튼) · 헤더 안에서 열리는 드롭다운
         *   30 셸 헤더 — **그 안의 드롭다운이 본문 위에 떠야 한다.** 드롭다운의 `z-20`은
         *      헤더의 쌓임 맥락 **안**이라 바깥과 겨루지 않고 헤더의 30을 함께 쓴다
         *   40 모달 오버레이 · 50 그 위의 것(모달 본문·툴팁·건너뛰기 링크)
         *
         * **층끼리 값을 겹치지 않게 둔다** — 같은 값이면 순서가 DOM 위치로 정해져,
         * 나중에 마크업을 옮기는 것만으로 겹침이 뒤집힌다.
         *
         * 헤더가 `z-10`이던 판본은 같은 값의 탭 줄이 뒤에 그려져 이겼고, 역할 전환을 열고
         * 스크롤하면 목록이 탭 줄 뒤로 들어가 잘렸다.
         */}
        <header ref={headerRef} className="sticky top-0 z-30 border-b border-border bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-4 lg:px-6">
            <NavDrawer pathname={pathname} />
            <Greeting />

            <div className="ml-auto flex flex-wrap items-center justify-end gap-x-3 gap-y-2 text-[12px] font-medium text-fg-subtle">
              <ReceiveIndicator />
              <LiveClock />
              <DemoNotice />
              <AlarmMenu />
              <ThemeToggle />
              <ProfileMenu />
            </div>
          </div>
        </header>

        <main id="main" tabIndex={-1} className="flex-1 px-4 py-4 lg:px-6 lg:py-6">
          {/* 본문 맨 위에 두는 표식 + 되감기 버튼. 셸에 한 번만 두면 모든 화면이 함께 얻는다 */}
          <TopButton />
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
 * 인사말 `[사용자 지시 2026-08-24]`.
 *
 * 사업장 선택기와 `Demo` 뱃지를 걷어낸 자리다. 선택기는 통합 관제의 사업장 탭이 대신하고,
 * 시연 데이터라는 사실은 시계 옆 인포 툴팁이 말한다.
 *
 * **역할마다 한 벌씩 그리고 CSS가 고른다.** 서버는 localStorage를 모르므로 렌더 중에
 * 역할로 분기하면 하이드레이션이 깨진다 — 사이드바 메뉴·로고 링크와 같은 방식이다.
 * 이름은 시연 문구이며 계정 체계가 서면 서버 값으로 바뀐다(`RoleProfile.demoName`).
 */
function Greeting() {
  return (
    <div className="min-w-0">
      {ROLES.map((role) => {
        const profile = ROLE_PROFILES[role];
        return (
          <p
            key={role}
            className={`role-only-${role} truncate text-[14px] font-medium text-fg-muted`}
          >
            <span className="font-bold text-fg">
              {profile.label} {profile.demoName}
            </span>
            님, 안녕하세요
          </p>
        );
      })}
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
          데이터 기준 <span className="num">{formatDateTime(DEMO_NOW_ISO)}</span> {DISPLAY_TIMEZONE}{' '}
          · 헤더 시계는 현재 시각입니다
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
  const visible = menuRolesOf(item);
  return ROLES.filter((role) => !visible.includes(role))
    .map((role) => `role-hide-${role}`)
    .join(' ');
}

/**
 * **좁은 화면의 메뉴** `[사용자 지시 2026-08-25: 마지막 점검]`.
 *
 * 사이드바가 `lg` 미만에서 통째로 감춰져 있었다 — 그 폭에서는 **화면을 옮길 방법이 없었다.**
 * 첫 화면에 들어온 사람이 알람도 리포트도 볼 수 없으니 반응형이 깨진 정도가 아니라 앱이 멈춘다.
 *
 * 서랍은 Radix Dialog로 연다 — 초점 가둠·ESC·바깥 스크롤 잠금·초점 복원을 이미 한다.
 * 안에 드는 것은 **사이드바와 같은 `SiteNav`**다: 묶음도 역할 가림도 한 곳에서만 정의된다.
 * 항목을 누르면 닫는다 — 라우트가 바뀌어도 서랍이 남아 있으면 새 화면을 가린다.
 */
function NavDrawer({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);

  /*
   * **넓어지면 스스로 닫는다.** 서랍은 `lg` 이상에서 `display:none`이 되는데, 열어 둔 채
   * 창을 넓히면 **보이지 않는 채로 초점이 갇히고 본문 스크롤이 잠긴다** — 화면이 멈춘 것처럼
   * 보이고 원인은 화면에 없다. 사이드바가 나타나는 바로 그 폭에서 닫는다.
   */
  useEffect(() => {
    if (!open) return;

    const wide = window.matchMedia(SIDEBAR_QUERY);
    const close = () => {
      if (wide.matches) setOpen(false);
    };
    close();
    wide.addEventListener('change', close);
    return () => wide.removeEventListener('change', close);
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {/* 사이드바가 보이는 폭에서는 필요 없다 */}
      <Dialog.Trigger
        aria-label="메뉴 열기"
        className="-ml-1 inline-flex size-8 cursor-pointer items-center justify-center rounded-chip text-fg-muted transition-colors duration-200 hover:bg-surface-2 hover:text-fg lg:hidden"
      >
        <Menu aria-hidden size={20} strokeWidth={1.9} />
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 lg:hidden" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-0 top-0 z-50 flex h-full w-[min(280px,calc(100vw-3rem))] flex-col border-r border-border bg-surface lg:hidden"
        >
          <Dialog.Title className="sr-only">메뉴</Dialog.Title>
          <Dialog.Close
            aria-label="메뉴 닫기"
            className="absolute right-3 top-3 cursor-pointer rounded-chip p-1.5 text-fg-subtle transition-colors duration-200 hover:bg-surface-2 hover:text-fg"
          >
            <X aria-hidden size={16} strokeWidth={1.9} />
          </Dialog.Close>

          <BrandHome />
          <SiteNav pathname={pathname} onNavigate={() => setOpen(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** 묶음 안의 항목이 **하나도** 보이지 않는 역할에서는 머리글까지 감춘다 */
function hiddenForGroupClass(group: NavGroup): string {
  const visible = groupMenuRoles(group);
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
          <BrandMark size={28} />
          {/*
           * 사업계획서 p.37·p.118의 국문 정식명. 폭이 좁아 줄여 쓰고 싶어지지만 줄이지 않는다(A2).
           * **폭이 크기를 정한다.** 이름은 한글 12자 + 라틴 2자 + 공백 4개라 약 14.3em이고,
           * `tracking-tight`가 6px쯤 줄여 준다. 사이드바 300px에서 여백 48 · 마크 24 · 간격 8을
           * 빼면 220px이 남으므로 15px(약 208px)까지가 들어간다 — 16px은 222px이라 2px 넘친다.
           * `overflow-hidden`이 안전망이지만 넘치면 이름이 잘리고, 그것은 이름을 줄이지
           * 않는다는 A2를 어긴다.
           */}
          <p className="whitespace-nowrap text-[14px] font-bold leading-tight tracking-tight text-fg">
            {BRAND_NAME}
          </p>
        </Link>
      ))}
    </>
  );
}

/**
 * 묶음 머리글. **깊이가 아니라 이름표다** — 접히지 않고 항목은 늘 펼쳐져 있다.
 * 항목(14px)보다 작고 가라앉혀, 훑을 때 걸리지 않고 찾을 때만 눈에 들어오게 한다.
 * 한글이라 자간을 벌리지 않는다(`Eyebrow`와 같은 이유 — 낱글자로 흩어져 읽힌다).
 */
/** 사이드바가 나타나는 폭. Tailwind의 `lg`와 같은 값이라 한쪽만 바뀌면 어긋난다 */
const SIDEBAR_QUERY = '(min-width: 64rem)';

const NAV_GROUP_LABEL = 'px-2.5 pb-1 text-[11px] font-semibold text-fg-faint';

function SiteNav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const withSite = useSiteHref();

  return (
    <nav className="flex-1 space-y-4 overflow-y-auto px-3.5 pb-4">
      {NAV_GROUPS.map((group, index) => (
        <div
          key={group.label}
          role="group"
          aria-labelledby={`nav-group-${index}`}
          /*
           * **묶음도 역할로 가린다.** 항목만 가리면 그 역할에서 전부 숨은 묶음의 머리글이
           * 홀로 남아 빈 이름표가 된다 — 지자체에게 관리 묶음이 그렇다(수처리 공정은
           * 사업장만, 사업장 설정은 관리자·사업장).
           */
          className={cn('space-y-1', hiddenForGroupClass(group))}
        >
          <p id={`nav-group-${index}`} className={NAV_GROUP_LABEL}>
            {group.label}
          </p>
          {group.items.map((item) => {
            const active = item.href === pathname;
            return (
              <Link
                key={item.href}
                href={withSite(item.href)}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-[10px] p-2.5 text-[14px] font-medium',
                  'transition-colors duration-200',
                  active
                    ? 'bg-accent-weak font-semibold text-accent'
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
        </div>
      ))}
    </nav>
  );
}
