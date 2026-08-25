import { ROLES, canRoleSee, type Role } from '@/entities/user';
import {
  Activity,
  Bell,
  Cog,
  Coins,
  Droplets,
  Settings,
  SlidersHorizontal,
  Workflow,
  FileText,
  LayoutDashboard,
  LineChart,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** 접근 권한 판단에 쓴다. 매트릭스 원본은 docs/specs/screens.md §5 */
  screenId: string;
  /**
   * **메뉴에 보일 역할.** 접근 권한과 다른 축이다 — 볼 수는 있지만 메뉴에는 없는 화면이
   * 있다(수처리 공정: 시스템 관리자는 이상 탐지·알람에서 링크로 들어온다).
   *
   * 생략하면 접근 권한을 그대로 따른다. 접근은 `entities/user`가, 노출은 여기가 정한다.
   */
  menuRoles?: readonly Role[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * 사이드바 항목과 라우트를 한 곳에서 짝지어 둔다.
 * 화면 제목도 여기서 나오므로 라벨이 두 군데서 갈릴 일이 없다.
 *
 * **묶음은 주제이지 깊이가 아니다** `[사용자 지시 2026-08-25]`. 12개가 한 줄로 늘어서 있어
 * 무엇이 무엇의 이웃인지 읽히지 않았다. 접히는 2단 메뉴로 만들지 않은 이유는, 접으면 지금
 * 두 번에 닿던 화면이 세 번이 되고 **닫힌 묶음 안의 화면은 존재를 잃기** 때문이다 —
 * 머리글만 얹어 항목은 전부 펼쳐 둔다.
 *
 * 가르는 축은 **그 화면이 무엇을 말하는가**다:
 *   관제    지금 어떤가 — 개요와 원시 계측
 *   AI 분석 AI가 무엇을 말하는가 — 원문 AI 4종의 산출 화면
 *   이력    지나간 것 — 알람과 리포트
 *   관리    무엇으로 그렇게 판단하는가 — 공정 구성·기준치·등록
 *
 * **순서는 여전히 사양이다.** `NAV_ITEMS`는 이 묶음을 편 것이고, 라우트 가드와
 * `homeHrefFor`는 그 순서의 첫 항목을 역할의 첫 화면으로 쓴다. 묶음을 재배열하면
 * 첫 화면이 바뀐다 — `navigation.test.ts`가 그것을 못박는다.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: '관제',
    items: [
      /* **맨 앞이어야 한다.** 라우트 가드가 첫 접근 가능 항목을 폴백으로 쓴다 — 사업장의
         첫 화면이 손익(SCR-AD-001)이 아니라 현황이 되게 하는 것이 이 순서의 목적이다.
         통합 관제가 사업장에 닫혀 있어(회의 2026-08-20) 역할을 바꾸면 여기로 온다 */
      { screenId: 'SCR-AD-003', href: '/overview', label: '자사 현황', icon: LayoutDashboard },
      { screenId: 'SCR-OP-001', href: '/', label: '통합 관제', icon: LayoutDashboard },
      /* 계측값 그대로를 보는 화면이라 AI 묶음이 아니라 관제에 둔다 */
      { screenId: 'SCR-OP-003', href: '/timeseries', label: '시계열 변화', icon: LineChart },
    ],
  },
  {
    label: 'AI 분석',
    items: [
      { screenId: 'SCR-OP-002', href: '/anomaly', label: '이상 탐지', icon: Activity },
      { screenId: 'SCR-OP-004', href: '/prediction', label: '오염도 추정', icon: Droplets },
      /* 회의가 예지보전을 이상 탐지로 정리했다 `[회의 2026-08-20]` `[INC-107]` */
      { screenId: 'SCR-OP-005', href: '/equipment', label: '설비 이상 탐지', icon: Cog },
      {
        screenId: 'SCR-OP-006',
        href: '/optimization',
        label: '운영 최적화',
        icon: SlidersHorizontal,
      },
    ],
  },
  {
    label: '이력',
    items: [
      { screenId: 'SCR-OP-007', href: '/alarms', label: '알람 이력', icon: Bell },
      { screenId: 'SCR-OP-008', href: '/reports', label: '리포트', icon: FileText },
    ],
  },
  {
    label: '관리',
    items: [
      /* 조회는 전 역할이지만 메뉴에는 사업장만(사용자 결정 2026-08-14).
         시스템 관리자는 이상 탐지·알람에서 링크로 들어온다 */
      {
        screenId: 'SCR-AD-002',
        href: '/process',
        label: '수처리 공정',
        icon: Workflow,
        menuRoles: ['site'],
      },
      /*
       * **비용 절감 현황은 메뉴에서 감춘다** `[회의 2026-08-20: 검증이 힘든 페이지라 빼는 것이 맞다]`.
       *
       * 항목을 배열에서 **지우지 않는다.** 라우트 가드가 `NAV_ITEMS`에서 현재 경로를 찾아
       * 접근 여부를 판정하므로, 지우면 그 경로가 가드 대상에서 빠져 주소를 직접 입력하면 열린다.
       * `menuRoles: []`는 빈 배열이라 `??`를 통과해 **전 역할에서 감춰지고** 가드는 계속 돈다.
       *
       * 사업장에만 열린 화면이라 접근 축으로는 관리 묶음이 맞다 — 보이지 않지만 자리는 여기다.
       */
      {
        screenId: 'SCR-AD-001',
        href: '/cost-savings',
        label: '비용 절감 현황',
        icon: Coins,
        menuRoles: [],
      },
      /*
       * **맨 끝이어야 한다.** 라우트 가드가 첫 접근 가능 항목을 폴백으로 쓴다 — 앞에 두면
       * 사업장의 첫 화면이 자사 현황에서 설정으로 바뀐다. `navigation.test.ts`가 그것을 못박는다.
       *
       * **이름이 `시스템 설정`이 아니다** `[사용자 지적 2026-08-21]`. 시스템 관리자의 화면을
       * 뜻하는 이름인데 정작 그 역할이 막혀 있었고, 세 탭 모두 사업장 축이었다. 지금은 관리자가
       * 사업장을 등록·설정하는 화면이라 이름도 그것을 말한다.
       */
      { screenId: 'SCR-OP-010', href: '/settings', label: '사업장 설정', icon: Settings },
    ],
  },
];

/** 묶음을 편 것. **순서가 사양이다**(위 주석) — 가드와 `homeHrefFor`가 이 순서를 읽는다 */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

/**
 * 그 항목이 **메뉴에 보이는** 역할. 접근 권한과 다른 축이다(`NavItem.menuRoles`).
 * 화면이 아니라 여기 있는 이유는 테스트가 닿아야 해서다.
 */
export function menuRolesOf(item: NavItem): readonly Role[] {
  return item.menuRoles ?? ROLES.filter((role) => canRoleSee(item.screenId, role));
}

/**
 * 그 묶음이 보이는 역할 — **항목 하나라도 보이면 보인다.**
 * 전부 숨은 역할에서 머리글만 남으면 빈 이름표가 된다(지자체에게 관리 묶음이 그렇다).
 */
export function groupMenuRoles(group: NavGroup): readonly Role[] {
  return ROLES.filter((role) => group.items.some((item) => menuRolesOf(item).includes(role)));
}

export const ALARM_NAV_HREF = '/alarms';

/**
 * 역할별 **첫 화면**. 로고 클릭과 라우트 가드의 폴백이 같은 값을 쓴다.
 *
 * 목록 순서가 곧 이 답이다 — 위 주석이 못박아 둔 대로 사업장은 `자사 현황`, 나머지는
 * `통합 관제`가 된다(관리자에게 통합 관제가 닫혀 있다). **정의를 두 곳에 두지 않는다** —
 * 로고가 가는 곳과 역할을 바꿨을 때 가는 곳이 갈리면 같은 앱이 '메인'을 두 개 갖는다.
 */
export function homeHrefFor(role: Role): string {
  return NAV_ITEMS.find((item) => canRoleSee(item.screenId, role))?.href ?? '/';
}

export function navLabelOf(pathname: string): string {
  return NAV_ITEMS.find((item) => item.href === pathname)?.label ?? '통합 관제';
}
