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
