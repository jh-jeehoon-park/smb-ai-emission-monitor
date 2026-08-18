import type { Metadata } from 'next';
import { THEME_INIT_SCRIPT } from '@/shared/config/theme';
import { MotionPreferences } from '@/shared/ui/motion';
import { ThemeProvider } from '@/shared/ui/theme';
import { RoleProvider, SESSION_INIT_SCRIPT } from '@/entities/user';
import { BRAND_NAME } from '@/shared/config/constants';
import './globals.css';

/**
 * 선택 사업장이 URL 쿼리에 있고 사이드바가 그 값을 읽어 링크에 얹는다.
 * 정적 프리렌더는 쿼리를 모르므로 셸 전체가 스켈레톤으로 굳는다 — 요청마다 그린다.
 */
export const dynamic = 'force-dynamic';

const DESCRIPTION = 'AIoT 기반 소규모 사업장 오염물질 배출 관리 시스템 프로토타입';

/**
 * 공유 카드(`opengraph-image.png`)는 **절대 URL**로만 전달된다. 기준 주소가 없으면
 * 상대 경로가 그대로 나가 카톡·슬랙에서 이미지가 뜨지 않는다.
 *
 * 배포 주소를 코드에 박지 않는다 — Vercel이 넣어 주는 운영 도메인을 쓰고, 없으면
 * 로컬로 떨어진다. `VERCEL_URL`은 배포마다 바뀌므로 쓰지 않는다.
 */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: BRAND_NAME,
  description: DESCRIPTION,
  openGraph: {
    title: BRAND_NAME,
    description: DESCRIPTION,
    siteName: BRAND_NAME,
    locale: 'ko_KR',
    type: 'website',
  },
  /* 카드 이미지는 `opengraph-image.png` 파일 규약이 채운다 — 여기서 경로를 적지 않는다 */
  twitter: { card: 'summary_large_image', title: BRAND_NAME, description: DESCRIPTION },
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
