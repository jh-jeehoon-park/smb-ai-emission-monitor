import { ROLES, canRoleSee, type Role } from '@/entities/user';
import {
  Activity,
  Bell,
  Cog,
  Droplets,
  Waves,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Workflow,
  FileText,
  ArrowLeftRight,
  LayoutDashboard,
  LineChart,
  MonitorPlay,
  type LucideIcon,
} from 'lucide-react';

/**
 * 현황판의 화면 ID — **셸이 이 값으로 그 화면을 알아본다.**
 *
 * `AppShell`이 이 경로에서만 사이드바·헤더를 그리지 않는다. 경로 문자열을 셸에 또 적으면
 * 둘이 갈릴 수 있어, 아래 `WALLBOARD_HREF`가 배열에서 끌어온다.
 */
export const WALLBOARD_SCREEN_ID = 'SCR-AD-006';

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
  /**
   * **이 화면이 계측 서버를 읽는가.** 생략하면 읽는다(15개 중 13개가 그렇다).
   *
   * 셸의 계측 고지 띠가 이 값을 본다. 읽지 않는 화면에 «계측 서버에 닿지 못했습니다»를
   * 띄우면 **일어나지 않은 장애를 주장하는 것**이다 — 설비·알람·이상 점수·예측은 애초에
   * API가 없는 fixture라 «실패»라는 상태가 성립하지 않는다(**E4**).
   *
   * 실제로 그렇게 만들었다가 잡았다: 셸에 띠를 한 번 두면 «계측을 쓰지 않는 도메인은 저절로
   * 빠진다»고 적었는데, 셸은 **모든 화면 위**에 있으므로 정반대였다.
   *
   * **값이 코드와 갈리지 않게 검사가 대조한다**(`navigation.test.ts`) — 라우트의 위젯을 열어
   * `useSiteSeries`를 실제로 쓰는지 보고 이 표식과 맞춘다.
   */
  readsTelemetry?: false;
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
      /*
       * **맨 앞이어야 한다 — 여기가 사업장의 첫 화면이다.** 라우트 가드와 `homeHrefFor`가
       * 메뉴에 보이는 첫 항목을 폴백으로 쓴다.
       *
       * 하루 동안 그 자리를 `유입·유출 비교`(SCR-AD-005)에게 내줬다가 되받았다
       * `[사용자 요청 2026-09-10]`. 내준 근거는 *"첫 화면이 손익이 아니라 현황이 되게"* 를
       * 그 화면도 만족한다는 것이었고 그 판단 자체는 틀리지 않았다 — 다만 사용자가 그 화면을
       * **4번째**로 지정하면서 순서가 곧 첫 화면이라는 이 규칙이 자리를 되돌렸다. 규칙을
       * 예외로 우회하지 않고 순서를 그대로 따른 것이다.
       *
       * **접근은 세 역할, 메뉴는 사업장뿐이다** `[사용자 요청 2026-08-28]` — 나머지 둘은
       * 통합 관제·관내 감독에서 사업장을 고른 뒤 `상세 보기`로 들어온다. 수처리 공정
       * (SCR-AD-002)이 같은 방식이다.
       *
       * **그래서 `menuRoles: ['site']`가 유일한 방어선이다.** 이 항목은 맨 앞이면서 접근은
       * 세 역할이라, 이 줄을 지우면 `menuRolesOf`가 접근 권한을 따라가 **세 역할의 홈이 전부
       * `/overview`가 된다.** 실제로 2026-08-28에 그렇게 깨져 `navigation.test.ts`가 3건으로
       * 잡았다(아래 `homeHrefFor` 주석).
       */
      {
        screenId: 'SCR-AD-003',
        href: '/overview',
        label: '사업장 상세',
        icon: LayoutDashboard,
        menuRoles: ['site'],
      },
      /* 같은 이유로 기초지자체의 첫 화면이 여기여야 한다 — 통합 관제는 그 역할에 닫혀 있다 */
      {
        screenId: 'SCR-GU-001',
        href: '/jurisdiction',
        label: '관내 감독 현황',
        icon: ShieldCheck,
      },
      { screenId: 'SCR-OP-001', href: '/', label: '통합 관제', icon: LayoutDashboard },
      /* 계측값 그대로를 보는 화면이라 AI 묶음이 아니라 관제에 둔다 */
      { screenId: 'SCR-OP-003', href: '/timeseries', label: '시계열 변화', icon: LineChart },
      /*
       * **묶음 앞쪽으로 옮기지 않는다.** 접근이 세 역할이라 `homeHrefFor`가 세 역할의 홈으로
       * 집어 간다 — 앞으로 옮겨 실제로 4건이 깨지는 것을 확인했다. 한때 «맨 뒤여야 한다»고
       * 적었는데 지금은 아래 `유입·유출 비교`가 뒤에 있다 `[사용자 요청 2026-09-10]`. 근거가
       * 뒤집힌 것이 아니라 조건이 정확해진 것이다 — 막아야 하는 것은 «맨 뒤가 아닌 것»이
       * 아니라 **사업장 전용 항목보다 앞서는 것**이고, 뒤에 오는 항목은 `menuRoles: ['site']`라
       * 다른 역할의 홈을 건드리지 않는다.
       *
       * 계측값을 그대로 보는 화면이라 시계열 변화와 같은 자리(관제)에 둔다.
       */
      { screenId: 'SCR-OP-011', href: '/discharge', label: '금일 배출 현황', icon: Waves },
      /*
       * **사업장에게 4번째로 보인다** `[사용자 요청 2026-09-10]` — 사업장에게 보이는 관제
       * 항목이 `사업장 상세 · 시계열 변화 · 금일 배출 현황 · 유입·유출 비교` 넷이라 이 자리가
       * 곧 그 순서다. 하루 동안 맨 앞이었고 그때는 이 화면이 사업장의 첫 화면이었다.
       *
       * **`menuRoles`를 생략하면 안 된다.** 사업장 전용 화면이라 결과가 같아 보이지만,
       * 생략하면 접근 권한을 따라가 나중에 다른 역할을 열 때 이 항목이 그 역할의 메뉴에
       * 딸려 나온다.
       */
      {
        screenId: 'SCR-AD-005',
        href: '/inout',
        label: '유입·유출 비교',
        icon: ArrowLeftRight,
        menuRoles: ['site'],
      },
      /*
       * **현황판은 관제 묶음 맨 끝이다** `[사용자 요청 2026-09-10]`.
       *
       * 앞으로 옮기면 안 된다 — `homeHrefFor`가 **메뉴에 보이는 첫 항목**을 그 역할의 첫
       * 화면으로 쓰므로, 사업장에게 보이는 항목을 `사업장 상세`보다 앞에 두면 로그인 직후
       * 벽 화면이 열린다. `[사용자 결정 2026-09-10: 사업장 상세는 그대로]`가 그것을 막는다.
       *
       * **`menuRoles`를 생략하면 안 된다** — 위 `유입·유출 비교`와 같은 이유다.
       *
       * 이 화면만 셸 크롬을 그리지 않는다(`app-shell.tsx`가 `WALLBOARD_HREF`를 본다).
       * 그래도 **메뉴와 가드는 다른 화면과 똑같이 걸린다** — 셸 밖 route group으로 나가면
       * 가드를 따로 만들어야 하고 `verify:docs` 검사 3의 «셸 라우트 수 = 메뉴 수»가 깨진다.
       */
      {
        screenId: WALLBOARD_SCREEN_ID,
        /* 경로는 **문자열 그대로** 적는다 — `verify-docs` 검사 3이 이 배열의 경로 리터럴을
           정규식으로 세어 셸 라우트 수와 맞춘다. 상수로 바꾸면 세지 못해 수가 어긋난다 */
        href: '/wallboard',
        label: '현황판',
        icon: MonitorPlay,
        menuRoles: ['site'],
      },
    ],
  },
  {
    label: 'AI 분석',
    items: [
      { screenId: 'SCR-OP-002', href: '/anomaly', label: '이상 탐지', icon: Activity },
      { screenId: 'SCR-OP-004', href: '/prediction', label: '오염도 추정', icon: Droplets },
      /* 회의가 예지보전을 이상 탐지로 정리했다 `[회의 2026-08-20]` `[INC-107]` */
      {
        screenId: 'SCR-OP-005',
        href: '/equipment',
        label: '설비 이상 탐지',
        icon: Cog,
        /* 설비 상태는 `getEquipment` fixture다 — 계측 서버에 채널이 없다 */
        readsTelemetry: false,
      },
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
       * **`SCR-AD-001 비용 절감 현황`이 여기 있었다** `[사용자 요청 2026-09-15: 페이지만 살려
       * 놓고 사용하지 않으면 관련 파일 전체 제거]`.
       *
       * `[회의 2026-08-20: 검증이 힘든 페이지라 빼는 것이 맞다]`로 **메뉴에서만 감췄고**
       * (`menuRoles: []`) 항목은 남겨 두었다 — *"지우면 그 경로가 가드 대상에서 빠져 주소를
       * 직접 입력하면 열린다"* 가 그때의 이유였다. **화면을 통째로 지우면 그 이유가 사라진다**:
       * 라우트가 없으니 열릴 경로 자체가 없다.
       */
      /*
       * **맨 끝이어야 한다.** 라우트 가드가 첫 접근 가능 항목을 폴백으로 쓴다 — 앞에 두면
       * 사업장의 첫 화면이 자사 현황에서 설정으로 바뀐다. `navigation.test.ts`가 그것을 못박는다.
       *
       * **이름이 `시스템 설정`이 아니다** `[사용자 지적 2026-08-21]`. 시스템 관리자의 화면을
       * 뜻하는 이름인데 정작 그 역할이 막혀 있었고, 세 탭 모두 사업장 축이었다. 지금은 관리자가
       * 사업장을 등록·설정하는 화면이라 이름도 그것을 말한다.
       */
      {
        screenId: 'SCR-OP-010',
        href: '/settings',
        label: '사업장 설정',
        icon: Settings,
        /* 기준치·분류·공정 설정 화면이라 계측을 읽지 않는다 */
        readsTelemetry: false,
      },
    ],
  },
];

/** 묶음을 편 것. **순서가 사양이다**(위 주석) — 가드와 `homeHrefFor`가 이 순서를 읽는다 */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

/**
 * 현황판 경로 — **배열에서 끌어온다.**
 *
 * 셸이 이 경로에서만 크롬을 그리지 않는다. 문자열을 셸에 다시 적으면 경로를 바꿀 때 한쪽만
 * 고쳐져 **크롬이 사라지지 않거나 엉뚱한 화면에서 사라진다.** 항목이 사라지면 즉시 터지는
 * 편이 조용히 어긋나는 것보다 낫다.
 */
export const WALLBOARD_HREF: string = NAV_ITEMS.find(
  (item) => item.screenId === WALLBOARD_SCREEN_ID,
)!.href;

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
 * 오류 화면의 주소 `[사용자 요청 2026-09-15]`.
 *
 * **메뉴에 넣지 않는다** — 사람이 골라 들어가는 곳이 아니다. `NAV_ITEMS` 밖이므로
 * `verify:docs` 검사 3의 «셸 라우트 수 = 사이드바 메뉴 수»(③)도 건드리지 않는다.
 *
 * 문자열을 여기 한 곳에 두는 이유는 보내는 쪽(`RoleGate`·`error.tsx`)과 받는 쪽(라우트)이
 * 갈리면 **조용히 404가 되기** 때문이다 — 오류를 알리려다 오류를 하나 더 만든다.
 */
export const FORBIDDEN_PATH = '/403';
export const SERVER_ERROR_PATH = '/500';

/**
 * 이 역할에게 **닫힌 화면인가.**
 *
 * 메뉴에 없는 경로는 가르지 않는다 — `canRoleSee`가 미등재를 전 역할 차단으로 읽어서, 그대로
 * 쓰면 목록 밖의 주소가 전부 403이 된다. 없는 주소는 404가 받을 일이다.
 *
 * **가드와 `RoleGate`가 같은 답을 써야 한다** — 한쪽은 보내고 한쪽은 그리지 않는 일을 하는데,
 * 판단이 갈리면 «보내지 않고 그리지도 않는» 빈 화면이나 그 반대가 생긴다.
 */
export function isBlockedFor(pathname: string, role: Role): boolean {
  const item = NAV_ITEMS.find((nav) => nav.href === pathname);
  return item ? !canRoleSee(item.screenId, role) : false;
}

/**
 * `?from=`이 가리키는 **우리 화면**. 모르는 값이면 `null`이다.
 *
 * **바깥 주소를 걸러 내는 자리다.** 이것이 없으면 `/500?from=https://…`을 연 사람이
 * 「다시 시도」를 눌렀을 때 그 주소로 나간다 — 열린 리다이렉트이고 **실측으로 확인했다**
 * `[설계 2026-09-16: 리다이렉트 검토]`. `//example.com`도 같은 길이다: 프로토콜만 생략한 절대 주소다.
 *
 * 문자열 모양을 검사하지 않고 **아는 경로인지** 묻는다 — `시작이 /인가` 같은 규칙은 예외를
 * 하나 만들 때마다 다시 뚫린다. 오류가 난 화면·막힌 화면은 **늘 메뉴에 있는 경로**다.
 */
export function knownRoute(value: string | null | undefined): string | null {
  return value && NAV_ITEMS.some((item) => item.href === value) ? value : null;
}

/** 이 경로의 화면이 계측 서버를 읽는가. 메뉴에 없는 경로는 셸이 띠를 띄울 일이 없다 */
export function readsTelemetry(pathname: string): boolean {
  return NAV_ITEMS.find((item) => item.href === pathname)?.readsTelemetry !== false;
}

/**
 * 역할별 **첫 화면**. 로고 클릭과 라우트 가드의 폴백이 같은 값을 쓴다.
 *
 * 목록 순서가 곧 이 답이다 — 사업장은 `사업장 상세`, 기초지자체는 `관내 감독 현황`,
 * 시스템 관리자는 `통합 관제`가 된다. **정의를 두 곳에 두지 않는다** — 로고가 가는 곳과
 * 역할을 바꿨을 때 가는 곳이 갈리면 같은 앱이 '메인'을 두 개 갖는다.
 *
 * **`menuRolesOf`로 찾는다. 접근 권한이 아니다.** 첫 화면은 *들어갈 수 있는* 첫 항목이
 * 아니라 **메뉴에 보이는** 첫 항목이다 — 메뉴에 없는 화면을 홈으로 주면 사이드바에서
 * 지금 위치를 찾을 수 없다.
 *
 * 이 구분이 없으면 **화면 하나를 다른 역할에 열 때마다 첫 화면이 딸려 움직인다.**
 * `SCR-AD-003`을 세 역할에 열자 목록 맨 앞이라는 이유만으로 시스템 관리자·기초지자체의
 * 홈이 `/overview`로 바뀌었다 — 실제로 그렇게 됐고 `navigation.test.ts`가 3건으로 잡았다.
 */
export function homeHrefFor(role: Role): string {
  return NAV_ITEMS.find((item) => menuRolesOf(item).includes(role))?.href ?? '/';
}

export function navLabelOf(pathname: string): string {
  return NAV_ITEMS.find((item) => item.href === pathname)?.label ?? '통합 관제';
}

