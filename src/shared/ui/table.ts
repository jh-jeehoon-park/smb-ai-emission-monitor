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

export const TABLE_HEAD_CELL = 'whitespace-nowrap px-3 py-2.5 text-center';

export const TABLE_ROW = '[&>*]:border-b [&>*]:border-border';
