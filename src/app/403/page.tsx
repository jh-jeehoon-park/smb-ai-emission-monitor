'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BRAND_NAME } from '@/shared/config/constants';
import { NOTICE_FORBIDDEN, forbiddenDescription } from '@/shared/config/notices';
import { ACTION_BUTTON } from '@/shared/ui/action-button';
import { BrandMark } from '@/shared/ui/brand-mark';
import { Notice } from '@/shared/ui/notice';
import { ROLES, ROLE_PROFILES, canRoleSee } from '@/entities/user';
import { NAV_ITEMS, homeHrefFor, knownRoute, navLabelOf } from '@/widgets/app-shell';

/**
 * 역할에 닫힌 화면 `[사용자 요청 2026-09-15: 403, 500 에러 페이지도 404처럼 별도의 페이지로]`.
 *
 * **셸 밖 전체화면이다** — 404와 같은 자리이고 같은 모양이다. 한때 셸 안에서 본문만 바꿨는데,
 * 사용자가 세 오류를 **한 가지 생김새**로 보기를 택했다.
 *
 * `?from=`이 막힌 주소다. 그것으로 화면 이름과 허용 역할을 찾는다 — 문자열로 다시 적지 않는다.
 *
 * **여기로 오기 전에 이미 막혔다.** `RoleGate`가 첫 페인트부터 본문을 가리고
 * `useRoleRouteGuard`가 이리로 보낸다 — 그 둘 중 앞의 것이 빠지면 권한 없는 화면이
 * **1.61~11.75초** 보이던 옛 상태로 돌아간다(실측).
 */
export default function ForbiddenPage() {
  /* 아는 경로일 때만 화면 이름을 말한다 — `/500`과 같은 판단을 쓴다 */
  const from = knownRoute(useSearchParams().get('from')) ?? '';
  const item = NAV_ITEMS.find((nav) => nav.href === from);
  const allowed = item ? ROLES.filter((r) => canRoleSee(item.screenId, r)) : [];

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
        code={NOTICE_FORBIDDEN.code}
        title={NOTICE_FORBIDDEN.title}
        description={
          item
            ? forbiddenDescription(
                navLabelOf(from),
                allowed.map((r) => ROLE_PROFILES[r].label),
              )
            : '지금 역할로는 열 수 없는 화면입니다.'
        }
        actions={<HomeLinks />}
      />
    </main>
  );
}

/**
 * 역할마다 한 벌씩 그리고 CSS가 고른다.
 *
 * 막힌 역할이 **둘이고 그 둘의 첫 화면이 서로 다르므로**(현황판은 시스템 관리자 `/`와
 * 기초지자체 `/jurisdiction`) 버튼 하나로는 담을 수 없다. 서버는 localStorage를 모르므로
 * 렌더 중에 역할로 분기하면 하이드레이션이 깨진다 — `<head>` 스크립트가 붙인 `data-role`을
 * 보고 CSS가 고르는 쪽이 깜빡임도 없다.
 */
function HomeLinks() {
  return (
    <>
      {ROLES.map((role) => (
        <Link key={role} href={homeHrefFor(role)} className={`role-only-${role} ${ACTION_BUTTON}`}>
          {navLabelOf(homeHrefFor(role))} 화면으로
        </Link>
      ))}
    </>
  );
}
