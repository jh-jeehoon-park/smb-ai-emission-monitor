'use client';

import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { SERVER_ERROR_PATH } from '@/widgets/app-shell';

/**
 * 셸 안의 화면 하나가 렌더 중에 무너졌을 때 `[사용자 요청 2026-09-15]`.
 *
 * **여기서 그리지 않고 `/500`으로 보낸다** — 404·403·500을 한 가지 생김새로 두기로 했다.
 * 그리는 것은 그쪽 페이지가 하고 이 파일은 **잡아서 넘기는 일만** 한다.
 *
 * **`retry`를 쓰지 않는 대신 주소를 넘긴다.** Next가 주는 `retry()`는 이 바운더리 안에서만
 * 살아 `/500`까지 따라가지 못한다. 무너진 주소를 `?from=`에 실어 보내면 그쪽 버튼이 **그
 * 주소로 다시 들어가** 같은 세그먼트를 다시 요청한다 — 결과가 같다.
 *
 * `?digest=`는 서버 로그와 맞출 해시다. **원문 메시지는 싣지 않는다** — 주소창에 남고 공유되며,
 * 프로덕션에서는 어차피 가려진다.
 *
 * **그래서 콘솔에는 남긴다** `[설계 2026-09-16: 리다이렉트 검토]`. `digest`는 **서버에서 난
 * 오류에만** 붙는다 — 클라이언트 렌더 중에 터지면 실어 보낼 것이 없어 `/500`이 오류 번호를
 * 적지 못하고, 우리가 화면을 옮기며 오류 객체를 버리므로 **아무 데도 기록이 남지 않는다.**
 * 프로덕션에서 그 실패는 완전히 조용하다. 화면은 사람에게 말하고 콘솔은 고치는 사람에게 말한다.
 *
 * **여기 없을 때는 잡을 것이 아무것도 없었다** — `<Suspense>`도 `ErrorBoundary`도 쓰이지 않아,
 * Provider 밖 사용처럼 코드가 스스로 던지는 `throw` 다섯 자리 중 하나가 터지면 트리 전체가
 * 무너져 영문 기본 화면으로 떨어졌다.
 */
export default function ShellError({ error }: { error: Error & { digest?: string } }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    console.error(error);

    const query = new URLSearchParams({ from: pathname });
    if (error.digest) query.set('digest', error.digest);
    /* `replace`다 — 뒤로 가기가 무너진 화면과 오류 화면 사이를 오가지 않게 한다 */
    router.replace(`${SERVER_ERROR_PATH}?${query.toString()}`);
  }, [error, pathname, router]);

  /*
   * 옮겨 가는 동안의 한 프레임. **여기에 «오류입니다»를 적지 않는다** — 곧 사라질 글이
   * 깜빡이면 오류가 둘인 것처럼 보인다. 자리만 잡아 두고 화면은 그대로 비운다.
   */
  return null;
}
