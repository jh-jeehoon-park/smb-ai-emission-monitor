import {
  Activity,
  Bell,
  Cog,
  Droplets,
  FileText,
  LayoutDashboard,
  LineChart,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * 사이드바 항목과 라우트를 한 곳에서 짝지어 둔다.
 * 화면 제목도 여기서 나오므로 라벨이 두 군데서 갈릴 일이 없다.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: '통합 관제', icon: LayoutDashboard },
  { href: '/anomaly', label: '이상 탐지', icon: Activity },
  { href: '/timeseries', label: '시계열 변화', icon: LineChart },
  { href: '/prediction', label: '오염도 추정', icon: Droplets },
  { href: '/equipment', label: '설비 예지보전', icon: Cog },
  { href: '/alarms', label: '알람 이력', icon: Bell },
  { href: '/reports', label: '리포트', icon: FileText },
];

export const ALARM_NAV_HREF = '/alarms';

export function navLabelOf(pathname: string): string {
  return NAV_ITEMS.find((item) => item.href === pathname)?.label ?? '통합 관제';
}
