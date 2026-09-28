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
/**
 * **좁은 화면에서는 40px을 채운다** `[사용자 요청 2026-09-21: 나머지 전체 화면 반응형]`.
 *
 * 글자 12px + `py-1` + 테두리면 실높이가 **28px**이다(실측). 이 껍데기가 `확인 처리`·
 * `조치 완료`·`CSV 내보내기`·화면 바로가기를 전부 만드는데, 그중 알람 조치는 **현장에서
 * 손가락으로 누르는 조작**이라 이 값이 그대로 결함이 된다.
 *
 * 높이만 키우고 글자·여백은 그대로다. `lg` 이상은 `min-h-0`으로 되돌려 **넓은 화면이
 * 한 픽셀도 달라지지 않는다** — 세그먼트 알약이 쓰는 것과 같은 짜임이다.
 */
const BASE =
  'inline-flex min-h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-chip border px-2.5 py-1 text-[12px] transition-colors duration-200 lg:min-h-0';

/** 흰 면 · 또렷한 테두리 · 얕은 그림자 — 눌리는 것으로 보인다. hover에서 포인트색으로 바뀐다 */
export const ACTION_BUTTON = `${BASE} border-border-strong bg-surface font-medium text-fg shadow-panel hover:border-accent hover:bg-accent-weak hover:text-accent`;

/** 곁들이는 조작 — 그림자 없이 테두리만. 본 동작과 무게가 갈린다 */
export const ACTION_BUTTON_QUIET = `${BASE} border-border bg-surface text-fg-muted hover:border-accent/40 hover:bg-accent-weak hover:text-accent`;

/**
 * **면을 갖지 않는 셋째 단** — 화살표가 붙은 글자 버튼(`상세 ›`).
 *
 * 알람 줄과 사업장 점수표가 **같은 문자열을 각자 적고 있었다.** 둘 다 `확인 처리`·`상세`처럼
 * 본 동작 옆에서 «읽으러 가는» 조작이라 면을 갖지 않는 것이 규약인데(§8 `조작 버튼`),
 * 이름이 없으니 한쪽만 바뀌어도 알 수 없었다 — 실제로 둘 다 실높이 **22px**이었다(실측).
 *
 * 위 둘과 달리 테두리·면이 없으므로 `BASE`를 쓰지 않는다. 좁은 화면의 40px 규약만 같다.
 */
export const ACTION_LINK =
  'inline-flex min-h-10 cursor-pointer items-center justify-center gap-0.5 rounded-chip py-0.5 pl-1.5 pr-0.5 text-[12px] transition-colors duration-200 hover:bg-accent-weak hover:text-accent lg:min-h-0';

/**
 * **보이는 크기는 그대로 두고 누르는 자리만 위아래로 넓히는 겹**
 * `[사용자 요청 2026-09-23: PC·모바일 QA]`.
 *
 * 본문 안의 글자 링크(`공정에서 보기`·`사업장 상세`·`이상 탐지에서 보기`·`…로 돌아가기`)와
 * 설비 카드의 이름 버튼은 **한 줄 글자라 실높이가 14~18px**이다(실측). 높이를 키우면
 * 문단의 줄 간격과 카드 높이가 함께 움직이므로 **`before`로 히트 영역만** 넓힌다.
 *
 * **좌우는 넓히지 않는다.** 글자 링크는 문장 안에 있어 옆으로 넓히면 앞뒤 글자를 덮는다 —
 * 세로로만 늘려도 40px을 채운다(11 + 18 + 11). 위아래로 겹치는 것은 **투명한 히트 영역이고
 * 그 자리에 다른 조작이 없는 것을 확인한 자리에만** 쓴다.
 *
 * **판 밖에 걸터앉은 것에는 쓰지 않는다** — 캐러셀 화살표처럼 경계에 걸친 요소는 사방
 * 확장이 페이지를 가로로 민다(그쪽은 안쪽으로만 넓힌다).
 */
export const TAP_AREA_Y =
  'relative before:absolute before:-inset-y-[11px] before:inset-x-0 before:content-[""] lg:before:content-none';

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
