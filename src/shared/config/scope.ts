/**
 * 조회 범위를 **URL 쿼리로** 표현한다. 알람 이력에서 시작해 리포트까지 쓰게 되어
 * `shared/config`로 올렸다(code-organization.rule.md §3 — 2개 이상에서 쓰이면 공통).
 *
 * 범위를 URL에 두는 것은 취향이 아니라 제약이다. 서버는 역할을 모르므로(역할은 첫
 * 페인트 전 `data-role`로만 들어온다) 역할로 행 수를 가르면 하이드레이션이 깨진다.
 * **URL은 서버도 읽는다** — 그래서 행 수가 달라지는 필터는 전부 여기를 거친다.
 */
export const SCOPE_QUERY_KEY = 'scope';

/** 관할 시·군·구 이름이 담기는 쿼리 키. `scope=municipality`와 짝으로만 뜻이 있다 */
export const MUNICIPALITY_QUERY_KEY = 'municipality';

/**
 * 선택 사업장을 URL에 두는 키. 화면을 옮겨도 선택이 유지되고,
 * 특정 사업장 화면을 그대로 공유·북마크할 수 있다.
 *
 * **`features/site-selection`에서 여기로 올렸다** — 범위를 URL에 박는 자리가 셋인데
 * (`entities/user`의 역할 전환 · 라우트 가드 · 그 feature) `entities`는 `features`를
 * 읽을 수 없어 한 곳이 문자열을 손으로 적고 있었다. 세 URL 키를 한 파일에 모은다.
 */
export const SITE_QUERY_KEY = 'site';

export const SCOPE_FILTERS = ['all', 'site', 'municipality'] as const;
export type ScopeFilter = (typeof SCOPE_FILTERS)[number];

/**
 * 범위를 **고르는 자리**의 선택지.
 *
 * `municipality`가 여기 없는 것은 빠뜨린 것이 아니다 — 관할은 **계정이 정하는 것**이지
 * 사용자가 세그먼트로 고르는 값이 아니다. 라우트 가드가 URL에 박고, 기초지자체에게는
 * 이 세그먼트 자체가 보이지 않는다(`role-hide-*`).
 */
export const SCOPE_OPTIONS: { value: ScopeFilter; label: string }[] = [
  { value: 'all', label: '전 사업장' },
  { value: 'site', label: '선택 사업장' },
];

/**
 * 이 범위에서 보이는 사업장 id. `null`이면 거르지 않는다(전 사업장).
 *
 * **소비처가 삼항으로 쓰지 않게 하려고 함수로 둔다.** 예전에는 두 화면이
 * `scope === 'site' ? 좁힘 : 전체`로 적혀 있었는데, 그 모양에서는 허용 목록에 새 범위를
 * 더해도 **else(전 사업장)로 떨어져 조용히 틀린다** — 기초지자체가 전국을 보게 된다.
 *
 * 실체는 `entities/site`가 갖는다(사업장 목록을 아는 쪽이라야 관할을 풀 수 있다).
 */
export type ScopeWithin = { siteId: string; municipality: string | null };

/**
 * 관할 잠금이 URL에 남아 있는가. **이것만 계정 축의 흔적이다.**
 *
 * `scope=site`는 세지 않는다 — 알람·리포트의 범위 세그먼트가 같은 키를 쓰고 사용자가 고른
 * 값일 수 있다. 관할은 그 세그먼트에 없어(`SCOPE_OPTIONS`) 계정이 정하는 값임이 확실하다.
 */
export function hasMunicipalityLock(params: URLSearchParams): boolean {
  return (
    params.get(SCOPE_QUERY_KEY) === 'municipality' || params.get(MUNICIPALITY_QUERY_KEY) !== null
  );
}

/**
 * 관할 잠금을 걷은 쿼리.
 *
 * **좁은 범위로 들어가는 길만 있고 나오는 길이 없었다.** 기초지자체를 거쳐 시스템 관리자로
 * 돌아오면 `scope=municipality`가 URL에 남아, 전 사업장 권한인데 관내 2개소만 보였다 —
 * 헤더 사업장 선택기·이상 탐지 순위표·알람·리포트가 전부 이 쿼리 하나를 읽기 때문이다.
 *
 * 역할 전환(`role-context`)과 라우트 가드가 같은 규칙을 써야 해서 여기 둔다. 두 곳이 각자
 * 적으면 한쪽만 고쳐져 같은 증상이 되돌아온다.
 */
export function clearMunicipalityLock(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params.toString());
  if (next.get(SCOPE_QUERY_KEY) === 'municipality') next.delete(SCOPE_QUERY_KEY);
  next.delete(MUNICIPALITY_QUERY_KEY);
  return next;
}

/**
 * 범위를 **전 사업장으로 되돌린다.** 역할 전환에서만 쓴다.
 *
 * `clearMunicipalityLock`과 달리 `scope=site`까지 걷는다. 한 키가 두 뜻을 겸하는 탓에
 * 가드는 그것을 구분할 수 없지만(사용자가 알람 필터에서 고른 값일 수 있다) **역할 전환은
 * 한 번의 분명한 동작**이라 새 역할의 기본 범위로 리셋하는 것이 맞다.
 *
 * 이것이 없으면 사업장을 거쳐 시스템 관리자로 돌아왔을 때 `scope=site`가 남아 전 사업장
 * 권한인데 1개소만 보인다 — 관할 축에서 난 것과 같은 증상이다.
 */
export function resetScopeToAllSites(params: URLSearchParams): URLSearchParams {
  const next = clearMunicipalityLock(params);
  next.delete(SCOPE_QUERY_KEY);
  return next;
}
