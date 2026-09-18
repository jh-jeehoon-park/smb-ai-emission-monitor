/**
 * 카드 머리·목록 줄에 붙는 **작은 조작 버튼** 한 벌 `[사용자 지시 2026-08-25]`.
 *
 * 같은 크기의 버튼이 화면마다 조금씩 달랐다 — 모서리 3px/4px, 여백 두 가지, hover가 회색면인
 * 곳과 포인트색인 곳. 한 화면에서 두 종류가 나란히 놓이면 같은 무게의 조작이 다른 부품으로 보인다.
 *
 * **뱃지와 구분되는 것이 이 부품의 첫 일이다** `[사용자 지시 2026-08-25: 이미 처리된 칩처럼 보인다]`.
 * 포인트색 틴트를 채웠던 판본은 상태 칩(`미확인`·`조치 완료`)과 같은 모양이라 **이미 그 상태가
 * 된 표시**로 읽혔다. 뱃지는 납작한 틴트이고 버튼은 **면 위에 올라온 것**이다 —
 * 흰 면 + 또렷한 테두리 + 얕은 그림자로 그 차이를 만든다.
 *
 * 두 단이다. `ACTION_BUTTON`은 그 줄에서 하려던 일(확인 처리·조치 완료·보는 중),
 * `ACTION_BUTTON_QUIET`는 곁들이는 조작(내보내기·바로가기)이다.
 */
const BASE =
  'inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-chip border px-2.5 py-1 text-[12px] transition-colors duration-200';

/** 흰 면 · 또렷한 테두리 · 얕은 그림자 — 눌리는 것으로 보인다. hover에서 포인트색으로 바뀐다 */
export const ACTION_BUTTON = `${BASE} border-border-strong bg-surface font-medium text-fg shadow-panel hover:border-accent hover:bg-accent-weak hover:text-accent`;

/** 곁들이는 조작 — 그림자 없이 테두리만. 본 동작과 무게가 갈린다 */
export const ACTION_BUTTON_QUIET = `${BASE} border-border bg-surface text-fg-muted hover:border-accent/40 hover:bg-accent-weak hover:text-accent`;

/**
 * **셸 헤더의 아이콘 버튼** — 수신 점 · 알림 · 계정이 같은 크기·모서리·hover를 쓴다
 * `[사용자 요청 2026-09-18: 모바일 헤더 반응형]`.
 *
 * 셋이 각자 같은 문자열을 적고 있었고, 헤더를 한 줄로 줄이면서 **이 셋만 남았다** — 좁은
 * 화면에서 헤더의 유일한 조작이라 한 곳에서 정한다.
 *
 * **보이는 크기는 28px인데 누르는 자리는 44px이다.** `before:-inset-2`가 8px씩 넓혀 손가락
 * 최소(44px)를 채운다 — 이 저장소가 로그인 입력(46px)에서 지키고 영상 선택기(26px)에서
 * 결함으로 지목한 그 값이다. 헤더의 상하 여백(16px) 안으로 들어가 **헤더 높이를 바꾸지 않는다.**
 *
 * `shared/ui`에 두는 이유: 셋 중 계정 메뉴가 `entities/user`에 있어 **widgets를 import할 수
 * 없다**(FSD §3). 색은 쓰는 쪽이 정한다 — 수신 점만 상태에 따라 갈린다.
 */
export const ICON_BUTTON =
  'relative inline-flex size-7 cursor-pointer items-center justify-center rounded-chip transition-colors duration-200 hover:bg-surface-2 hover:text-fg before:absolute before:-inset-2 before:content-[""]';
