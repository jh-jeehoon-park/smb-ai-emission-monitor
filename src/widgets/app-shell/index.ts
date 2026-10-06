/** slice Public API — 바깥에서는 이 파일만 import 한다(FSD §6) */
export { AppShell } from './ui/app-shell';
/**
 * 오류 화면(`/404`·`/403`·`/500`)이 쓰는 것.
 *
 * `homeHrefFor`·`navLabelOf`는 **로고 클릭·라우트 가드와 같은 정의**여야 한다 — 갈리면 앱이
 * «메인»을 둘 갖는다. 두 경로 상수는 보내는 쪽과 받는 쪽이 갈려 조용히 404가 되는 것을 막는다.
 */
export {
  FORBIDDEN_PATH,
  NAV_ITEMS,
  SERVER_ERROR_PATH,
  homeHrefFor,
  isBlockedFor,
  knownRoute,
  navLabelOf,
} from './config/navigation';
