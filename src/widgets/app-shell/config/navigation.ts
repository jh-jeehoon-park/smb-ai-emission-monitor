import { canRoleSee, type Role } from '@/entities/user';
import {
  Activity,
  Bell,
  Cog,
  Coins,
  Droplets,
  FlaskConical,
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
   * 있다(수처리 공정: 운영자는 이상 탐지·알람에서 링크로 들어온다).
   *
   * 생략하면 접근 권한을 그대로 따른다. 접근은 `entities/user`가, 노출은 여기가 정한다.
   */
  menuRoles?: readonly Role[];
}

/**
 * 사이드바 항목과 라우트를 한 곳에서 짝지어 둔다.
 * 화면 제목도 여기서 나오므로 라벨이 두 군데서 갈릴 일이 없다.
 */
export const NAV_ITEMS: NavItem[] = [
  /* 관리자에게만 보인다. 맨 앞에 두는 이유는 이것이 관리자의 첫 화면이기 때문이다 —
     통합 관제가 관리자에게 닫혀 있어(회의 2026-08-13) 역할을 바꾸면 여기로 온다 */
  /* **맨 앞이어야 한다.** 라우트 가드가 첫 접근 가능 항목을 폴백으로 쓴다 — 관리자의
     첫 화면이 손익(SCR-AD-001)이 아니라 현황이 되게 하는 것이 이 순서의 목적이다 */
  { screenId: 'SCR-AD-003', href: '/overview', label: '자사 현황', icon: LayoutDashboard },
  { screenId: 'SCR-AD-001', href: '/cost-savings', label: '비용 절감 현황', icon: Coins },
  { screenId: 'SCR-OP-001', href: '/', label: '통합 관제', icon: LayoutDashboard },
  { screenId: 'SCR-OP-002', href: '/anomaly', label: '이상 탐지', icon: Activity },
  { screenId: 'SCR-OP-003', href: '/timeseries', label: '시계열 변화', icon: LineChart },
  { screenId: 'SCR-OP-004', href: '/prediction', label: '오염도 추정', icon: Droplets },
  { screenId: 'SCR-OP-005', href: '/equipment', label: '설비 예지보전', icon: Cog },
  { screenId: 'SCR-OP-006', href: '/optimization', label: '운영 최적화', icon: SlidersHorizontal },
  { screenId: 'SCR-OP-007', href: '/alarms', label: '알람 이력', icon: Bell },
  { screenId: 'SCR-OP-009', href: '/validation', label: '수분석 검증', icon: FlaskConical },
  { screenId: 'SCR-OP-008', href: '/reports', label: '리포트', icon: FileText },
  /* 조회는 전 역할이지만 메뉴에는 관리자만(사용자 결정 2026-08-14).
     맨 뒤에 두어야 한다 — 앞에 두면 라우트 가드의 관리자 폴백이 비용 절감 현황에서 여기로 바뀐다 */
  {
    screenId: 'SCR-AD-002',
    href: '/process',
    label: '수처리 공정',
    icon: Workflow,
    menuRoles: ['admin'],
  },
];

export const ALARM_NAV_HREF = '/alarms';

/**
 * 역할별 **첫 화면**. 로고 클릭과 라우트 가드의 폴백이 같은 값을 쓴다.
 *
 * 목록 순서가 곧 이 답이다 — 위 주석이 못박아 둔 대로 관리자는 `자사 현황`, 나머지는
 * `통합 관제`가 된다(관리자에게 통합 관제가 닫혀 있다). **정의를 두 곳에 두지 않는다** —
 * 로고가 가는 곳과 역할을 바꿨을 때 가는 곳이 갈리면 같은 앱이 '메인'을 두 개 갖는다.
 */
export function homeHrefFor(role: Role): string {
  return NAV_ITEMS.find((item) => canRoleSee(item.screenId, role))?.href ?? '/';
}

export function navLabelOf(pathname: string): string {
  return NAV_ITEMS.find((item) => item.href === pathname)?.label ?? '통합 관제';
}
