'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BRAND_NAME } from '@/shared/config/constants';
import { NOTICE_ERROR, NOTICE_RETRY_LABEL } from '@/shared/config/notices';
import { ACTION_BUTTON, ACTION_BUTTON_QUIET } from '@/shared/ui/action-button';
import { BrandMark } from '@/shared/ui/brand-mark';
import { Notice } from '@/shared/ui/notice';
import { ROLES } from '@/entities/user';
import { homeHrefFor, knownRoute, navLabelOf } from '@/widgets/app-shell';

/**
 * 렌더가 무너졌을 때 `[사용자 요청 2026-09-15: 403, 500 에러 페이지도 404처럼 별도의 페이지로]`.
 *
 * **셸 밖 전체화면이다** — 404·403과 같은 자리이고 같은 모양이다.
 *
 * **`retry()`를 잃지 않는다.** `error.tsx`가 주는 그 함수는 세그먼트를 다시 받게 하는데, 이리로
 * 옮겨 오면 그 함수가 여기까지 따라오지 못한다. 대신 `?from=`에 무너진 주소를 싣고 **그 주소로
 * 다시 들어가는 버튼**을 둔다 — 같은 세그먼트를 다시 요청하므로 결과가 같다.
 *
 * `?digest=`는 서버 로그와 맞출 해시다. 프로덕션에서 원문 메시지는 가려지고 이것만 온다.
 */
export default function ServerErrorPage() {
  const params = useSearchParams();
  const router = useRouter();
  /*
   * **`?from=`을 그대로 믿지 않는다** `[설계 2026-09-16: 리다이렉트 검토]`. 그대로 `router.replace`에 넘기면
   * `/500?from=https://…`을 연 사람이 「다시 시도」를 눌렀을 때 그 주소로 나간다 —
   * 열린 리다이렉트이고 실측으로 확인했다(`//example.com`도 같은 길이다). 아는 경로가
   * 아니면 버튼을 아예 두지 않는다.
   */
  const from = knownRoute(params.get('from'));
  const digest = params.get('digest');

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
        code={NOTICE_ERROR.code}
        title={NOTICE_ERROR.title}
        description={NOTICE_ERROR.description}
        actions={
          <>
            {from && (
              /* `replace`다 — 뒤로 가기가 무너진 화면과 이 화면 사이를 오가지 않게 한다 */
              <button
                type="button"
                onClick={() => router.replace(from)}
                className={ACTION_BUTTON}
              >
                {NOTICE_RETRY_LABEL}
              </button>
            )}
            {ROLES.map((role) => (
              <Link
                key={role}
                href={homeHrefFor(role)}
                className={`role-only-${role} ${ACTION_BUTTON_QUIET}`}
              >
                {navLabelOf(homeHrefFor(role))} 화면으로
              </Link>
            ))}
          </>
        }
        footnote={digest ? `오류 번호 ${digest}` : null}
      />
    </main>
  );
}
