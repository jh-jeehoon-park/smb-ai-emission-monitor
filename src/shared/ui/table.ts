/**
 * 표 스타일 한 벌 `[사용자 지시 2026-08-24: 정책을 세워 모든 페이지에 일괄 적용]`.
 *
 * 표는 9군데에 있고 그동안 같은 클래스 문자열을 9번 복사해 두었다. 한 곳이 빠지면
 * 그 표만 다른 모양이 되는데 화면을 다 열어 보지 않으면 알 수 없다 — 상수로 묶는다.
 *
 * **머리 줄은 어떤 면에 놓이든 같은 띠 색(`--table-head`)을 쓴다.** 옅은 면 위의 표에서
 * 머리와 바탕이 같은 색이라 스크롤할 때 본문 줄이 머리 글자 위로 지나가 보였다.
 * **아래 테두리는 두지 않는다** `[사용자 지시 2026-08-24]` — 띠 색만으로 가른다. 그래서 띠 색을 더
 * 진하게 밀 수 없다: 한 단 더 어두우면(#d9e3ef) 그 위의 `--fg-subtle` 글자가 4.44:1로 떨어져 본문
 * 기준을 밑돈다. 지금 값이 "글자가 읽히는 가장 진한 띠"다.
 *
 * 모서리는 `border-separate`로만 살아난다. `border-collapse`는 칸의 `border-radius`를
 * 무시하기 때문이다. 그 대가로 `<tr>`에 준 테두리가 그려지지 않아 줄 구분선은
 * **칸(`[&>*]`)에 준다** — `[&>td]`만으로는 첫 칸이 `<th scope="row">`인 표에서 선이 끊긴다.
 */
export const TABLE_ROOT = 'w-full border-separate border-spacing-0';

export const TABLE_HEAD_ROW =
  'text-[12px] font-semibold text-fg-muted [&>th]:bg-table-head [&>th:first-child]:rounded-l-nested [&>th:last-child]:rounded-r-nested';

/**
 * 머리 칸. **값이 한때 실제와 갈려 있었다** — 선언은 `whitespace-nowrap px-3 py-2.5`인데
 * 표 53곳이 전부 `px-3 py-3`을 쓰고 있었다. 아무 데서도 안 쓰이니 갈린 것을 알 방법이
 * 없었다 — 이 파일이 존재하는 이유(*"한 곳이 빠져도 알 수 없다"*)를 스스로 어긴 셈이라
 * 실제 값에 맞추고 전 표가 이것을 쓰게 했다 `[사용자 요청 2026-08-25]`.
 *
 * `whitespace-nowrap`은 넣지 않는다 — 지금 어느 표도 쓰지 않고, 넣으면 좁은 화면에서
 * 긴 머리글(`알람 (긴급·주의·정보)`)이 표를 밀어낸다.
 */
export const TABLE_HEAD_CELL = 'px-3 py-3 text-center';

export const TABLE_ROW = '[&>*]:border-b [&>*]:border-border';

/**
 * 고정 폭 표를 담는 가로 스크롤 상자 `[사용자 지시 2026-08-24]`(`screens.md` §8 `반응형`).
 *
 * **`relative`가 장식이 아니다.** 상자가 `position: static`이면 안쪽의 **절대배치 요소가
 * 이 상자를 기준면으로 삼지 않아 잘리지 않는다** — 표의 오른쪽 끝 칸에 있는 `sr-only`가
 * 720px·640px 자리에 그대로 앉아 **문서 전체를 그만큼 넓힌다.** 눈에는 아무것도 보이지
 * 않고 증상은 «모바일에서 화면이 가로로 밀린다» 하나뿐이라 원인을 찾기 어렵다.
 *
 * 실측으로 두 곳이 그렇게 깨져 있었다 — `/equipment` 390px에서 문서가 675px(가동 격자의
 * 시각 `sr-only` 75개), `/jurisdiction` 360px에서 719px(마지막 열의 `상세` 한 개).
 * `screens.md` §8이 *"390px에서 가로 스크롤 없음"* 이라 못박은 바로 그 약속을 어기고 있었다.
 *
 * 상자마다 손으로 적지 않고 이름을 붙이는 이유가 그것이다 — 클래스 하나가 빠진 것을
 * 화면을 열어서는 알 수 없다(이 파일이 만들어진 것과 같은 이유다).
 */
export const TABLE_SCROLL = 'relative overflow-x-auto';
