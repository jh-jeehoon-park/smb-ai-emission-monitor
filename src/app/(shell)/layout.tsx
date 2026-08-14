import type { ReactNode } from 'react';
import { AppShell } from '@/widgets/app-shell';

/**
 * 셸은 로그인 이후 화면에만 씌운다. 로그인 화면은 이 그룹 밖이라 사이드바가 없다.
 * root layout을 하나로 유지하므로 그룹을 오갈 때 전체 새로고침이 일어나지 않는다.
 */
export default function ShellLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
