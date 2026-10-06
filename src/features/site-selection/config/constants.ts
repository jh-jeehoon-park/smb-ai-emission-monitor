/**
 * 키의 실체는 `shared/config/scope.ts`가 갖는다 — 범위를 URL에 박는 자리가 셋이고
 * 그중 `entities/user`는 이 feature를 읽을 수 없다(FSD). 이 재export는 기존 소비처를
 * 위해 남긴다.
 */
export { SITE_QUERY_KEY } from '@/shared/config/scope';

/**
 * 좁은 화면 사업장 목록(`SiteList`)의 **세 줄 창** `[사용자 요청 2026-09-18: 사업장이 3개
 * 이상일 때는 스크롤]`.
 *
 * 줄 실높이를 재서 낸 값이다 — 첫 줄 46px + 구분선을 얹은 둘째·셋째 47px씩 = **140px**.
 * 그래서 **남는 곳이 셋 이하면 스크롤바가 아예 뜨지 않고**, 넷째부터 상자 안에서 밀린다.
 *
 * `Panel`의 알람 미리보기(`ALARM_PREVIEW_MAX_HEIGHT`)와 같은 자리에 두는 값이다 — 상한을
 * 컴포넌트에 인라인으로 박으면 줄 높이가 바뀔 때 두 곳을 따로 고쳐야 한다.
 */
export const SITE_LIST_MAX_HEIGHT = 'max-h-[140px]';
