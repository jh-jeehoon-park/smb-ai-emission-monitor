'use client';

/**
 * 쿼리만 바꾸고 **서버를 거치지 않는다.** `router.replace`는 경로가 같아도 RSC 요청을
 * 보내는데, 이 저장소의 `page.tsx`는 `searchParams`를 읽지 않아 그 왕복이 헛일이다.
 *
 * `replaceState`는 Next 라우터에 통합돼 `useSearchParams`와 동기화된다
 * (`next/dist/docs/01-app/02-guides/single-page-applications.md`).
 * **경로가 바뀌는 이동에는 쓰지 않는다.**
 */
export function replaceQuery(params: URLSearchParams): void {
  const query = params.toString();
  window.history.replaceState(null, '', query ? `?${query}` : window.location.pathname);
}
