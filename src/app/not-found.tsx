'use client';

import Link from 'next/link';
import { BRAND_NAME } from '@/shared/config/constants';
import { NOTICE_NOT_FOUND } from '@/shared/config/notices';
import { ACTION_BUTTON } from '@/shared/ui/action-button';
import { BrandMark } from '@/shared/ui/brand-mark';
import { Notice } from '@/shared/ui/notice';
import { ROLES } from '@/entities/user';
import { homeHrefFor, navLabelOf } from '@/widgets/app-shell';

/**
 * 없는 주소 `[사용자 요청 2026-09-15]`.
 *
 * **이 파일 하나가 매칭되지 않는 모든 URL을 받는다**(Next 16 `not-found.js` 규약). root layout
 * 안에서 렌더되므로 `globals.css`·테마 토큰·프로바이더가 그대로 먹는다 — 여기 없을 때 뜨던
 * Next 기본 화면은 **영문이고 앱 테마를 읽지 않아**(OS `prefers-color-scheme`을 따른다) 다크로
 * 쓰는 사람에게 흰 화면이 떴다.
 *
 * **`global-not-found.js`를 쓰지 않는다.** 그것이 필요한 조건은 root layout이 여럿이거나
 * top-level dynamic segment가 있을 때인데(Next 문서), 이 앱은 root layout이 하나라 해당하지 않는다.
 * 켜면 `experimental` 플래그가 하나 늘고 전역 스타일·폰트를 직접 들여와야 한다.
 *
 * **셸을 그리지 않는다.** 로그인과 같은 자리다 — `(shell)/layout.tsx`의 세 프로바이더
 * (알람·기준치·공정) 밖이라 `AppShell`이 필요로 하는 것이 없고, 애초에 길을 잃은 사람에게
 * 메뉴보다 먼저 보여야 하는 것은 «여기가 어디인가»다.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-bg px-4">
      <Link
        href="/"
        aria-label={BRAND_NAME}
        className="flex items-center gap-2 rounded-chip text-[14px] font-bold text-fg-muted transition-colors duration-200 hover:text-fg"
      >
        <BrandMark size={28} />
        {BRAND_NAME}
      </Link>

      <Notice
        code={NOTICE_NOT_FOUND.code}
        title={NOTICE_NOT_FOUND.title}
        description={NOTICE_NOT_FOUND.description}
        actions={<HomeLinks />}
      />
    </main>
  );
}

/**
 * 역할마다 한 벌씩 그리고 CSS가 고른다.
 *
 * **`useRole()`로 읽지 않는 이유** — 서버는 localStorage를 모르므로 렌더 중에 역할로 분기하면
 * 하이드레이션이 깨지고, 클라이언트에서 읽으면 첫 프레임에 잘못된 목적지가 한 번 보인다.
 * `<head>` 스크립트가 첫 페인트 전에 `data-role`을 붙여 두므로 CSS가 고르는 쪽이 깜빡임이 없다 —
 * 셸의 사이드바 메뉴·인사말이 쓰는 방식 그대로다.
 *
 * **글자는 «가는 곳의 이름»이다** `[설계 2026-09-16: 리다이렉트 검토]`. 한때 이 화면만
 * «사업장 첫 화면으로»라 역할 이름을 적었고 403·500은 «사업장 상세 화면으로»라 화면 이름을
 * 적었다 — 같은 일을 하는 버튼이 화면마다 다른 말을 했다. 역할은 사용자가 이미 알고, 답은
 * 어디로 가는가다.
 */
function HomeLinks() {
  return (
    <>
      {ROLES.map((role) => (
        <Link
          key={role}
          href={homeHrefFor(role)}
          className={`role-only-${role} ${ACTION_BUTTON}`}
        >
          {navLabelOf(homeHrefFor(role))} 화면으로
        </Link>
      ))}
    </>
  );
}
