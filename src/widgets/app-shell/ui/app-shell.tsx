'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BRAND_NAME } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { ICON_BUTTON } from '@/shared/ui/action-button';
import { BADGE_BASE } from '@/shared/ui/badge';
import { BrandMark } from '@/shared/ui/brand-mark';
import { AnimatePresence, drawerPanel, drawerScrim, motion } from '@/shared/ui/motion';
import { TopButton } from '@/shared/ui/top-button';
import { openAlarms } from '@/entities/alarm';
import { ADMIN_ACCOUNTS, GOV_SCOPE, ProfileMenu, ROLES, ROLE_PROFILES } from '@/entities/user';
import { siteIdsInScope, withinScope } from '@/entities/site';
import { ALL_ALARMS, useAlarmStates } from '@/features/alarm-ack';
import { SiteSelector, useSiteHref } from '@/features/site-selection';
import {
  ALARM_NAV_HREF,
  NAV_GROUPS,
  groupMenuRoles,
  homeHrefFor,
  menuRolesOf,
  navLabelOf,
  WALLBOARD_HREF,
  type NavGroup,
  type NavItem,
} from '../config/navigation';
import { useRoleRouteGuard } from '../lib/use-role-route-guard';
import { AlarmMenu } from './alarm-menu';
import { ReceiveIndicator } from './receive-indicator';
import { RoleGate } from './role-gate';
import { TelemetryNotice } from './telemetry-notice';
import { WallboardExit } from './wallboard-exit';

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

  /*
   * **현황판만 셸을 그리지 않는다** `[사용자 결정 2026-09-10: TV 상시 표출 — 전체화면 고정]`.
   *
   * 사이드바 280px과 헤더가 빠져 1920px을 다 쓴다. 그 화면은 벽에 걸어 두고 아무도 누르지
   * 않으므로 메뉴·시계·알림이 자리를 차지할 이유가 없고, 셸이 하던 일(사업장 이름·원천·
   * 시각)은 그 화면의 머리줄이 직접 맡는다.
   *
   * **`(shell)` 밖으로 내보내지 않은 이유가 있다.** route group을 따로 두면 ① 메뉴 항목이
   * 성립하지 않고 ② `useRoleRouteGuard`가 `NAV_ITEMS`에 있는 경로만 보므로 전용 가드를 또
   * 만들어야 하며 ③ `verify:docs` 검사 3의 «셸 라우트 수 = 사이드바 메뉴 수»가 깨진다.
   * 여기서 한 줄로 분기하면 셋 다 그대로 두고 크롬만 걷을 수 있다.
   *
   * **훅보다 아래에 둔다** — 훅은 조건부로 부를 수 없다. 가드·헤더 관측은 그대로 돌고
   * 그리는 것만 달라진다.
   *
   * **나가는 길은 셸이 함께 얹는다** `[사용자 지적 2026-09-11: 현황판 페이지에서 나갈 수
   * 있는 방법이 없다]`. 크롬을 걷으면서 돌아갈 곳까지 함께 걷혀 있었다 — 전체화면으로
   * 띄우면 주소창도 없어 갇힌다. 평소에는 보이지 않고 사람이 만질 때만 드러난다.
   */
  if (pathname === WALLBOARD_HREF) {
    return (
      <>
        {/*
         * **여기에도 `RoleGate`가 붙는다** `[사용자 결정 2026-09-15]`. 이 조기 리턴은 아래
         * 본문보다 **먼저** 돌아, 아래에만 얹으면 현황판은 하나도 고쳐지지 않는다 — 노출을
         * 실측한 세 경우 중 **둘이 이 경로였다**(기초지자체 1.61초 · 시스템 관리자 6.05초).
         */}
        <RoleGate>{children}</RoleGate>
        <WallboardExit />
      </>
    );
  }

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
        <NavColumn pathname={pathname} />
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
         * **접히는 일 자체가 2026-09-18에 없어졌다** — 우측을 108px로 줄여 어느 폭에서도 한
         * 줄이다(바로 아래 주석). 그래도 관측기를 걷지 않는 이유는 남는다: `lg` 미만은 서랍
         * 버튼이 4px 더 커 **65px**이고, 브라우저 글꼴 확대·사용자 지정 글꼴이면 한 줄의
         * 높이 자체가 달라진다. 박아 둔 숫자로는 여전히 못 맞춘다.
         *
         * CSS의 61px은 서버가 보내는 첫 화면용 초기값으로 남고, 이제 `lg` 이상에서는 **실제로
         * 맞는 값**이다.
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
          {/*
           * **어느 폭에서도 한 줄이다** `[사용자 요청 2026-09-18: 모바일 헤더 반응형]`.
           *
           * 한때 이 줄이 `flex-wrap`이었고 우측에 일곱이 있었다 — 전부 고정폭이라 폭이
           * 모자라면 아래로 접혔다. 실측: **390px에서 3줄 167px**(화면의 20%) · 600px 141px ·
           * **1024px에서도 2줄 94px**. `sticky`라 그 높이를 모든 화면에서 상시 가져갔다.
           *
           * 폭을 먹던 넷(사업장 선택 210 · 수신 문구 142 · 시계 146 · 시연 안내 16)을 내보내
           * 우측이 **670px → 108px**이 됐다. 그러면 **접힐 일이 없으므로 `flex-wrap`이 필요
           * 없다** — 그것을 걷은 것이 이 변경의 실체다. `justify-between`도 함께 걷었다:
           * `ml-auto`가 이미 같은 일을 하고 있어 둘이 겹쳐 있었다.
           *
           * **넷 중 사업장 선택만 `lg` 이상에서 돌아왔다** `[사용자 요청 2026-09-18: PC는 헤더,
           * Mobile은 사이드바]`. 3줄을 만든 것은 선택기 하나가 아니라 **일곱의 합**이었고,
           * 108px 묶음에 210px를 더해도 330px이라 자리가 남는다 — **가장 빡빡한 1024px에서도
           * 696px 중 541px만 쓴다**(실측: 1024~1920px 전 구간 한 줄 · 가로 스크롤 없음).
           *
           * `flex-wrap`이 없으므로 **넘치면 접히는 대신 가로로 밀린다.** 그래서 「자리가 있다」를
           * 산술이 아니라 라이브 DOM 실험으로 먼저 쟀다.
           *
           * 높이는 `py-4`(32) + 가장 키 큰 자식 + 테두리 1이다 — 서랍 버튼과 선택기가 둘 다
           * 32px이라 **어느 폭에서도 65px**이고, 선택기가 없는 사업장 역할의 `lg` 이상만 61px이다.
           */}
          <div className="flex items-center gap-x-4 px-4 py-4 lg:px-6">
            <NavDrawer pathname={pathname} />
            <Greeting />

            <div className="ml-auto flex shrink-0 items-center gap-x-3 text-[12px] font-medium text-fg-subtle">
              {/*
               * **헤더는 «지금 무엇을 보는가», 기둥은 «어디로 가는가»** `[사용자 요청 2026-09-18]`.
               * 수신 점·알림·계정이 이미 전역 맥락이라 사업장도 같은 축이다. 좁은 화면에서는
               * 그 자리가 없어 `NavColumn`이 받는다 — **한 자리에만 보이도록 CSS가 고른다.**
               *
               * 사업장 역할은 자사 1개소라 고를 것이 없어 `role-hide-site`가 여전히 감춘다 —
               * 그 규칙이 `display:none`을 (0,3,0)으로 걸어 `lg:inline-flex`(0,1,0)를 이긴다.
               */}
              <SiteSelector className="hidden w-[210px] shrink-0 lg:inline-flex" />
              <ReceiveIndicator />
              <AlarmMenu />
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
          {/*
           * 값이 어디서 왔는지는 헤더 배지 하나만 말하고 있었다 — 12px 우측 상단이라 차트를
           * 읽는 사람 눈에 들어오지 않는다. 화면당 한 줄을 제목 바로 아래 둔다.
           *
           * **`RoleGate` 안에 둔다** — 막힌 화면에서는 값이 그려지지 않으므로 그 값의 출처를
           * 말할 일도 없다. 밖에 두면 403 위에 «계측 서버에 닿지 못했습니다»가 함께 떠,
           * 볼 수도 없는 화면의 데이터 사정을 알리게 된다.
           */}
          <RoleGate>
            <TelemetryNotice />
            {children}
          </RoleGate>
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
   *
   * **공용 `useMediaQuery`를 쓰지 않는다.** 그쪽으로 바꾸면 «넓어졌으면 닫는다»가
   * `useEffect` 본문의 `setOpen(false)`가 되는데, `react-hooks/set-state-in-effect`가
   * 그것을 막는다(실제로 걸려 되돌렸다). 여기서는 값을 **읽는** 것이 아니라 변화에
   * **반응**하는 것이라, 구독 콜백 안에서 닫는 지금 꼴이 그 규칙과도 맞는다.
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
        className={cn(ICON_BUTTON, '-ml-1 size-8 text-fg-muted lg:hidden')}
      >
        <Menu aria-hidden size={20} strokeWidth={1.9} />
      </Dialog.Trigger>

      {/*
       * **서랍이 밀려 들어오고 밀려 나간다** `[사용자 요청 2026-09-16]`.
       *
       * Radix는 닫는 순간 내용을 걷어내므로 그대로 두면 나가는 모습을 그릴 수 없다 —
       * `forceMount`로 마운트를 `AnimatePresence`에게 넘겨, 나가는 전이가 끝난 뒤에 걷힌다.
       * `asChild`라 Radix의 동작(초점 가둠·ESC·스크롤 잠금)은 그대로 있고 겉껍데기만 `motion`이다.
       *
       * 값과 감속 설정 처리는 `shared/ui/motion.tsx`가 갖는다 — framer-motion을 직접 부르는
       * 파일을 늘리지 않는다는 규약이고, 그래야 `MotionPreferences`를 우회하는 모션이 생기지 않는다.
       */}
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                variants={drawerScrim}
                initial="hidden"
                animate="show"
                exit="hidden"
                className="fixed inset-0 z-40 bg-black/40 lg:hidden"
              />
            </Dialog.Overlay>
            <Dialog.Content
              asChild
              forceMount
              aria-describedby={undefined}
              className="fixed left-0 top-0 z-50 flex h-full w-[min(280px,calc(100vw-3rem))] flex-col border-r border-border bg-surface lg:hidden"
            >
              <motion.div variants={drawerPanel} initial="hidden" animate="show" exit="hidden">
                <Dialog.Title className="sr-only">메뉴</Dialog.Title>
                <Dialog.Close
                  aria-label="메뉴 닫기"
                  className="absolute right-3 top-3 cursor-pointer rounded-chip p-1.5 text-fg-subtle transition-colors duration-200 hover:bg-surface-2 hover:text-fg"
                >
                  <X aria-hidden size={16} strokeWidth={1.9} />
                </Dialog.Close>

                <NavColumn pathname={pathname} onNavigate={() => setOpen(false)} />
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
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
 * 미확인 알람 수. **역할·계정마다 숫자가 다르다** — 시스템 관리자는 전 사업장,
 * 기초지자체는 **관할 시·군·구**, 사업장은 자사 1개소다.
 *
 * **셸은 `?scope=`를 읽지 않는다** — 화면이 아니라 껍데기라 라우트 밖에 있다. 그래서
 * 값마다 한 벌씩 렌더하고 CSS가 고른다. 렌더 중에 역할로 분기해 숫자를 하나만 그리면
 * 하이드레이션이 깨진다(서버는 `data-role`을 모른다).
 *
 * **`role-hide-*`를 겹쳐 쓴다.** 세 벌 중 둘을 감추면 남는 하나가 그 역할의 숫자다.
 *
 * (한때 여기 *"`role-only-*`는 `display: block`을 강제해 인라인 배지가 줄에서 떨어져
 * 나간다"* 고 적어 두었다. 그 함정은 계정 축에도 그대로 있어 **이 배지가 실제로 깨졌다** —
 * 원 안의 숫자가 왼쪽 위로 밀렸다 `[사용자 지적 2026-09-07]`. `globals.css`의 두 규칙을
 * 감추기 전용으로 바꿔 함정 자체를 없앴고, 그래서 이제 어느 쪽을 써도 된다.)
 */
function AlarmBadge() {
  /* 헤더 알림과 **같은 상태**를 본다. 정적 fixture를 읽으면 확인 처리를 해도 줄지 않는다 */
  const { alarms } = useAlarmStates(ALL_ALARMS);
  const inMunicipality = withinScope(alarms, siteIdsInScope('municipality', GOV_SCOPE));

  return (
    <>
      <Badge count={openAlarms(alarms).length} className="role-hide-site role-hide-gov" />
      <Badge
        count={openAlarms(inMunicipality).length}
        className="role-hide-site role-hide-system"
      />
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
 * 왼쪽 기둥 — **사이드바와 서랍이 같은 것을 담는다.**
 *
 * 브랜드 · 사업장 선택 · 메뉴가 한 벌이다. 두 자리에 손으로 적으면 갈리고, 그러면 넓은
 * 화면과 좁은 화면이 **다른 것을 담게 된다** — `SiteNav`를 둘이 공유하기로 한 애초의 근거가
 * 그것이다.
 *
 * **사업장 선택이 헤더에서 여기로 왔다** `[사용자 결정 2026-09-18]`.
 *
 * 옛 자리의 근거는 이랬다 — *"헤더에서 사업장을 바꾼다"* `[사용자 요청 2026-08-27]`. 걷어냈던
 * 것을 되돌린 자리였고(`[사용자 지시 2026-08-24]`), 상세 화면(시계열·오염도 추정·리포트)에서
 * 사업장을 바꾸려면 통합 관제로 돌아갔다 와야 하는 왕복이 되돌린 이유였다. 그때 *"헤더에
 * 조작이 몰려 붐빈다"* 는 걷어냈던 근거가 사라지지 않았다고 적어 두었는데, **그 붐빔이 결국
 * 헤더를 3줄로 만들었다**(390px 실측 167px · 화면의 20%).
 *
 * **왕복은 여기서도 생기지 않는다** — 기둥은 어느 화면에서든 열려 있다(`lg` 이상은 상시,
 * 그 아래는 헤더의 메뉴 버튼 한 번). 오히려 「어디로 갈지」와 「어느 사업장을 볼지」가 한
 * 자리에 모인다. 280px 기둥이라 폭도 210px에서 **252px로 넓어진다.**
 *
 * **그 자리를 좁은 화면으로 좁혔다** `[사용자 요청 2026-09-18: PC는 헤더, Mobile 반응형은
 * 사이드바]`. 바로 위 판단(기둥 한 자리)은 3줄 헤더를 전제로 한 것이었고, 실측으로 **`lg`
 * 이상 헤더에 자리가 남는다**(1024px에서 696px 중 541px)는 것이 확인되면서 전제가 걷혔다.
 *
 * 남은 구분은 **역할이다** — 헤더는 「지금 무엇을 보는가」(수신·알림·계정과 같은 축),
 * 기둥은 「어디로 가는가」. 이동 목록 맨 위에 폼 컨트롤이 끼면 메뉴 리듬이 끊기고 항목이
 * 아래로 밀리는데, **`lg` 이상에서는 그럴 이유가 없어졌다.**
 */
function NavColumn({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <>
      <BrandHome />
      {/*
       * **래퍼에도 `role-hide-site`를 건다.** 부품만 감추면 이 블록의 여백이 빈 틈으로 남아
       * 사업장 역할에서 브랜드와 메뉴 사이가 벌어진다.
       *
       * **`lg:hidden`이 이 부품을 서랍 전용으로 만든다.** 이 기둥은 사이드바(`lg` 이상)와
       * 서랍(`lg` 미만) **둘이 함께 쓰는 한 벌**이라, 클래스 하나로 「사이드바에서는 숨고
       * 서랍에서는 남는다」가 된다 — 헤더 쪽과 합쳐 **한 자리에만 보인다.** 두 곳에 따로
       * 적지 않으므로 정의는 여전히 한 곳이다.
       *
       * `px-3.5`는 `SiteNav`와 같은 값이라 셀렉트의 왼쪽 끝이 메뉴 항목 hover 면과 맞는다.
       */}
      <div className="role-hide-site px-3.5 pb-3 lg:hidden">
        {/*
         * **범위는 부품이 스스로 정한다** — 목록이 `useScopedSites()`라 URL의 `scope`를
         * 따르고, 역할로 분기하지 않는다(서버는 역할을 모른다).
         */}
        <SiteSelector className="w-full" />
      </div>
      <SiteNav pathname={pathname} onNavigate={onNavigate} />
    </>
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

/** 사이드바가 나타나는 폭. Tailwind의 `lg`와 같은 값이라 한쪽만 바뀌면 어긋난다 */
const SIDEBAR_QUERY = '(min-width: 64rem)';

/**
 * 묶음 머리글. **깊이가 아니라 이름표다** — 접히지 않고 항목은 늘 펼쳐져 있다.
 * 항목(14px)보다 작고 가라앉혀, 훑을 때 걸리지 않고 찾을 때만 눈에 들어오게 한다.
 * 한글이라 자간을 벌리지 않는다(`Eyebrow`와 같은 이유 — 낱글자로 흩어져 읽힌다).
 *
 * **12px이다.** 한때 11px이었는데 §8 `글자 최소`가 *"예외는 그래프 안의 글자뿐"* 이라
 * 못박고 있어 예외 대상이 아니었다 — 규칙과 코드가 갈린 채였다. 항목(14px)과는
 * `font-semibold` + `--fg-faint`로 갈리므로 한 단 올려도 이름표로 남는다.
 */
const NAV_GROUP_LABEL = 'px-2.5 pb-1 text-[12px] font-semibold text-fg-faint';

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
