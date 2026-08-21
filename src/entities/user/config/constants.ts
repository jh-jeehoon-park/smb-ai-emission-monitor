import type { Role, RoleProfile, RoleScope } from '../model/types';

/**
 * **순서가 사양이다.** `homeHrefFor(role)`이 `NAV_ITEMS`를 앞에서부터 훑어 그 역할의
 * 첫 화면을 정하는데, 이 배열의 순서는 그 결과를 바꾸지 않는다 — 다만 `hiddenForClass`가
 * 내는 클래스 문자열의 순서와 `BrandHome`이 렌더하는 링크 순서를 정한다.
 */
export const ROLES: readonly Role[] = ['system', 'site', 'gov'] as const;

/**
 * 누가 그 역할이고 무엇을 보는지 — **2026-08-20 회의가 셋을 함께 정했다.**
 * 근거는 `docs/specs/README.md` §4.4.
 */
export const ROLE_PROFILES: Record<Role, RoleProfile> = {
  system: {
    role: 'system',
    label: '시스템 관리자',
    who: '전체 총괄',
    scope: 'all-sites',
    scopeLabel: '전 사업장',
  },
  site: {
    role: 'site',
    label: '사업장',
    who: '사업주 · 현장 담당자',
    scope: 'own-site',
    scopeLabel: '자사 1개소',
  },
  gov: {
    role: 'gov',
    label: '지자체',
    who: '지자체 공무원',
    scope: 'own-province',
    scopeLabel: '관할 지역',
  },
};

/**
 * 시연에서 **전환할 수 있는** 역할.
 *
 * 지자체가 빠진다 `[사용자 지시 2026-08-20]`. 관할 지역 필터를 아직 만들지 않았으므로
 * 전환해도 시스템 관리자와 화면이 같다 — **전환해 봐야 구분되지 않는 것을 고를 수 있게
 * 두면 없는 기능이 있는 것처럼 읽힌다.** 게스트가 같은 이유로 막혀 있던 자리를 잇는다.
 *
 * **접근 권한(`SCREEN_ROLES`)은 건드리지 않는다.** 지자체가 볼 수 있는 화면의 정의는
 * 권한 매트릭스가 그대로 갖는다 — 전환 수단만 닫는 것이지 역할을 없애는 것이 아니다.
 */
export const SWITCHABLE_ROLES: readonly Role[] = ['system', 'site'] as const;

/** 전환 막힌 역할에 적는 이유. 화면이 근거를 갖고 있어야 한다 */
export const ROLE_SWITCH_BLOCKED_REASON =
  '지자체는 관할 지역 범위를 아직 구현하지 않아 시연에서 전환하지 않습니다';

/**
 * 화면별 접근 가능 역할. **출처는 docs/specs/screens.md §5 권한 매트릭스 하나다.**
 * 여기서 값을 바꾸면 그 표도 같이 고쳐야 한다 — 두 곳이 갈리면 어느 쪽이 맞는지 알 수 없다.
 *
 * 통합 관제만 사업장에 닫혀 있다 — 지도·10개소 월보드는 자사 1개소뿐인
 * 사업장 사용자에게 의미가 없다(회의 2026-08-13 → 2026-08-20).
 */
export const SCREEN_ROLES: Record<string, readonly Role[]> = {
  // 로그인은 역할이 생기기 전의 화면이라 역할로 가릴 수 없다
  'SCR-CO-001': ROLES,
  'SCR-OP-001': ['system', 'gov'],
  'SCR-OP-002': ROLES,
  'SCR-OP-003': ROLES,
  'SCR-OP-004': ROLES,
  'SCR-OP-005': ROLES,
  'SCR-OP-006': ROLES,
  'SCR-OP-007': ROLES,
  'SCR-OP-008': ROLES,
  'SCR-AD-001': ['site'],
  // 자사 요약이 들어간다 — SCR-AD-001과 같은 이유로 사업장만
  'SCR-AD-003': ['site'],
  // 조회는 전 역할. **메뉴 노출은 별개 축**이라 NavItem.menuRoles가 정한다
  'SCR-AD-002': ROLES,
  /*
   * 사업장 설정은 **시스템 관리자가 전권**을 갖고 사업장은 자기 기준치만 고친다
   * `[사용자 결정 2026-08-21: 각 사업장을 등록하고 설정하는 것은 회원 관리나 마찬가지니
   * 관리자의 권한]`.
   *
   * **예전에는 사업장만이었다.** 근거로 "허가증이 사업장 손에 있다"를 들었는데, 그것은
   * **값의 출처**에 대한 근거이지 **입력 주체**에 대한 근거가 아니다 — 허가증을 제출받아
   * 관리자가 등록하는 흐름이 일반적이고, 사업장 분류(지역구분·규모)는 값이 아니라 그
   * 사업장을 어느 기준표에 매핑할지 정하는 **등록 정보**다.
   *
   * 사업장이 볼 수 있는 것은 `방류 기준치` 탭 하나다 — 탭 가시성은 `SETTINGS_TAB_ROLES`가
   * 정한다. 접근 권한과 탭 가시성은 **다른 축이다**(`SCR-AD-002`의 메뉴 노출과 같은 구조).
   */
  'SCR-OP-010': ['system', 'site'],
};

export function canRoleSee(screenId: string, role: Role): boolean {
  return SCREEN_ROLES[screenId]?.includes(role) ?? false;
}

/**
 * 그 역할이 보는 범위. **역할 리터럴로 분기하지 않기 위해 있다** — 소비처가
 * `role === 'site'`를 쓰면 역할이 늘거나 이름이 바뀔 때마다 그 자리를 다시 찾아야 한다.
 */
export function scopeOf(role: Role): RoleScope {
  return ROLE_PROFILES[role].scope;
}
