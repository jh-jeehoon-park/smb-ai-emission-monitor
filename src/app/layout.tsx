import type { Metadata } from 'next';
import { THEME_INIT_SCRIPT } from '@/shared/config/theme';
import { MotionPreferences } from '@/shared/ui/motion';
import { ThemeProvider } from '@/shared/ui/theme';
import { RoleProvider, SESSION_INIT_SCRIPT } from '@/entities/user';
import './globals.css';

/**
 * 선택 사업장이 URL 쿼리에 있고 사이드바가 그 값을 읽어 링크에 얹는다.
 * 정적 프리렌더는 쿼리를 모르므로 셸 전체가 스켈레톤으로 굳는다 — 요청마다 그린다.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'AI 기반 지능형 배출관리 플랫폼',
  description: 'AIoT 기반 소규모 사업장 오염물질 배출 관리 시스템 프로토타입',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /* 테마·역할은 localStorage에 있어 서버가 모른다. 두 스크립트가 붙이는
       data-theme·data-role만 서버 HTML과 다르며, 그 차이는 여기서만 허용한다.
       하위 트리에는 전파되지 않는다. */
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: SESSION_INIT_SCRIPT }} />
      </head>
      {/* 폰트는 globals.css가 Pretendard 하나로 불러온다 — 한글 계측 라벨의 가독성이 우선이다 */}
      <body className="antialiased">
        <ThemeProvider>
          <RoleProvider>
            <MotionPreferences>{children}</MotionPreferences>
          </RoleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
