/**
 * 조회 범위를 **URL 쿼리로** 표현한다. 알람 이력에서 시작해 리포트까지 쓰게 되어
 * `shared/config`로 올렸다(code-organization.rule.md §3 — 2개 이상에서 쓰이면 공통).
 *
 * 범위를 URL에 두는 것은 취향이 아니라 제약이다. 서버는 역할을 모르므로(역할은 첫
 * 페인트 전 `data-role`로만 들어온다) 역할로 행 수를 가르면 하이드레이션이 깨진다.
 * **URL은 서버도 읽는다** — 그래서 행 수가 달라지는 필터는 전부 여기를 거친다.
 */
export const SCOPE_QUERY_KEY = 'scope';

export const SCOPE_FILTERS = ['all', 'site'] as const;
export type ScopeFilter = (typeof SCOPE_FILTERS)[number];

export const SCOPE_OPTIONS: { value: ScopeFilter; label: string }[] = [
  { value: 'all', label: '전 사업장' },
  { value: 'site', label: '선택 사업장' },
];
