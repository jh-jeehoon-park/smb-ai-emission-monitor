/**
 * 플랫폼 국문 정식명 `[원문 p.37·118]`.
 *
 * 사이드바·로그인 두 곳·브라우저 탭 제목·로고 대체 텍스트가 같은 이름을 써야 한다.
 * 문자열로 흩어 두면 한 곳만 고쳐져 화면마다 이름이 갈린다 — 실제로 5곳에 있었다.
 *
 * **줄여 쓰지 않는다**(A2). 사이드바 폭이 좁아 줄이고 싶어지지만 원문 명칭이다.
 */
export const BRAND_NAME = 'AI 기반 지능형 배출관리 플랫폼';

/**
 * 브랜드 마크 파일 — **테마마다 한 벌씩**.
 *
 * 로고 초록이 한 벌뿐이면 한쪽 테마에서 묻힌다. 진한 초록은 어두운 배경에서 대비 3.9,
 * 밝은 초록은 흰 배경에서 2.5까지 떨어진다. 짝을 맞춰 쓰면 4.97 / 7.69다.
 *
 * 목록으로 두는 이유는 **대체 텍스트와 로딩 방식을 한 번만 쓰기 위해서다.** 두 장을 각각
 * 적으면 한쪽에만 alt가 붙거나 한쪽만 lazy로 남는다 — 실제로 두 번 다 그랬다.
 */
export const BRAND_MARK_VARIANTS = [
  { theme: 'light', src: '/logo-light.png', themeClass: 'theme-when-light' },
  { theme: 'dark', src: '/logo-dark.png', themeClass: 'theme-when-dark absolute inset-0' },
] as const;
