import type { Metadata } from 'next';
import { IBM_Plex_Mono } from 'next/font/google';
import { THEME_INIT_SCRIPT } from '@/shared/config/theme';
import { MotionPreferences } from '@/shared/ui/motion';
import { ThemeProvider } from '@/shared/ui/theme';
import { AppShell } from '@/widgets/app-shell';
import './globals.css';

/**
 * 선택 사업장이 URL 쿼리에 있고 사이드바가 그 값을 읽어 링크에 얹는다.
 * 정적 프리렌더는 쿼리를 모르므로 셸 전체가 스켈레톤으로 굳는다 — 요청마다 그린다.
 */
export const dynamic = 'force-dynamic';

/**
 * 계측 대시보드라 숫자와 항목 코드가 화면의 절반이다. 산업용 계기 표기에 가까운
 * Plex Mono 하나로 숫자·코드·라벨을 모두 받고, 한글 본문만 Pretendard가 맡는다.
 * (Inter·Geist·Space Grotesk 계열은 어느 화면에서나 보여 식별력이 없다.)
 */
const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'AquaSense AI Platform — 배출관리 관제',
  description: 'AIoT 기반 소규모 사업장 오염물질 배출 관리 시스템 프로토타입',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /* 테마는 localStorage에 있어 서버가 모른다. 이 스크립트가 붙이는 data-theme만
       서버 HTML과 다르며, 그 차이는 여기서만 허용한다. 하위 트리에는 전파되지 않는다. */
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={`${plexMono.variable} antialiased`}>
        <ThemeProvider>
          <MotionPreferences>
            <AppShell>{children}</AppShell>
          </MotionPreferences>
        </ThemeProvider>
      </body>
    </html>
  );
}
