import type { ReactNode } from 'react';
import { AlarmStateProvider } from '@/features/alarm-ack';
import { LimitSettingsProvider } from '@/features/discharge-limit-settings';
import { ProcessSettingsProvider } from '@/features/process-settings';
import { AppShell } from '@/widgets/app-shell';

/**
 * 셸은 로그인 이후 화면에만 씌운다. 로그인 화면은 이 그룹 밖이라 사이드바가 없다.
 * root layout을 하나로 유지하므로 그룹을 오갈 때 전체 새로고침이 일어나지 않는다.
 */
export default function ShellLayout({ children }: { children: ReactNode }) {
  /*
   * 확인 처리 결과를 헤더 알림·사이드바 배지·본문이 함께 봐야 한다.
   *
   * 기준치도 같은 이유로 셸에 둔다 — 시계열·오염도 추정·공정도·리포트가 **같은 기준**으로
   * 초과를 판정해야 한다. 화면마다 따로 읽으면 같은 항목이 화면마다 다른 기준을 갖는다.
   *
   * 공정 구성도 마찬가지다 — 사업장마다 켠 단계가 다르고(`[회의 2026-08-20]`) 공정도·단계
   * 상세·설정 화면이 **같은 구성**을 봐야 한다.
   */
  return (
    <AlarmStateProvider>
      <LimitSettingsProvider>
        <ProcessSettingsProvider>
          <AppShell>{children}</AppShell>
        </ProcessSettingsProvider>
      </LimitSettingsProvider>
    </AlarmStateProvider>
  );
}
