import type { Role, RoleProfile, RoleScope } from '../model/types';

/**
 * 헤더 인사말·계정 메뉴에 적는 **시연용 이름** `[사용자 지시 2026-08-25: 가명은 다 이 이름으로]`.
 *
 * 역할마다 다른 이름(홍길동·박민재·김서준)을 두던 판본은 역할을 바꿀 때마다 사람이 바뀌어,
 * **한 사람이 권한을 갈아 끼우는 시연**이 세 사람의 계정으로 읽혔다. 계정은 원래 하나다
 * (`DEMO_ACCOUNT`). 계정 체계가 서면 서버 값으로 바뀐다.
 */
export const DEMO_PERSON_NAME = '허창무';

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
    demoName: DEMO_PERSON_NAME,
    scope: 'all-sites',
    scopeLabel: '전 사업장',
  },
  site: {
    role: 'site',
    label: '사업장',
    who: '사업주 · 현장 담당자',
    demoName: DEMO_PERSON_NAME,
    scope: 'own-site',
    scopeLabel: '자사 1개소',
  },
  gov: {
    role: 'gov',
    label: '기초지자체',
    who: '기초지자체 공무원',
    demoName: DEMO_PERSON_NAME,
    scope: 'own-municipality',
    scopeLabel: '관할 시·군·구',
  },
};

/**
 * 시연에서 **전환할 수 있는** 역할 — 지금은 셋 다다.
 *
 * 기초지자체가 한동안 빠져 있었다 `[사용자 지시 2026-08-20]`. 관할 범위 필터가 없어 전환해도
 * 시스템 관리자와 화면이 같았고, **전환해 봐야 구분되지 않는 것을 고를 수 있게 두면 없는
 * 기능이 있는 것처럼 읽히기** 때문이다.
 *
 * **그 조건이 해소됐다** `[사용자 결정 2026-08-26]` — `scope=municipality` 필터와 관내 감독
 * 화면(`SCR-GU-001`)이 생겨 전환하면 화면이 실제로 갈린다. 관할은 안동시이고 관내가 두
 * 곳이다(S-01 · S-04).
 *
 * **접근 권한(`SCREEN_ROLES`)은 이 값과 다른 축이다** — 전환 수단을 닫아 두는 동안에도
 * 매트릭스는 최종 형태 그대로였다.
 */
export const SWITCHABLE_ROLES: readonly Role[] = ROLES;

/**
 * 전환 막힌 역할에 적는 이유. 화면이 근거를 갖고 있어야 한다.
 *
 * **지금은 막힌 역할이 없다.** 문구를 지우지 않는 이유는 역할이 늘거나 범위가 미구현인
 * 상태가 다시 생길 수 있어서다 — 그때 문구를 새로 지어내면 근거가 사라진다.
 */
export const ROLE_SWITCH_BLOCKED_REASON = '해당 역할은 범위 구현 전이라 시연에서 전환하지 않습니다';

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
  /*
   * **기초지자체에도 닫혀 있다** `[설계 2026-08-24]`. 전국 10개소를 보여 주는 것이
   * `관할 시·군·구`라는 범위 정의와 모순이다 — 사업장에 닫은 것과 같은 논리이며,
   * 그 자리를 `SCR-GU-001 관내 감독 현황`이 받는다(아직 미구현).
   */
  'SCR-OP-001': ['system'],
  /*
   * **미구현이다.** 화면 설계서만 있고 라우트·위젯이 없다 `[사용자 결정 2026-08-24]`.
   * 여기에 미리 적어 두는 이유는 `screens.md` §5 권한 매트릭스와 이 표를 `user.test.ts`가
   * 칸 단위로 대조하기 때문이다 — 표에만 넣으면 그 테스트가 깨진다.
   */
  'SCR-GU-001': ['gov'],
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
  /*
   * **기초지자체가 기준치를 입력한다** `[사용자 결정 2026-08-25]` — 지역별 방류 기준을
   * 아는 주체가 지자체다. `[TBD-45]`를 회의가 "사용자 설정값으로 받는다"로 우회했고
   * `[회의 2026-08-20]` 그 사용자가 누구인지를 여기서 정했다.
   *
   * **조회 전용의 유일한 예외다.** 이 값은 사업장의 데이터가 아니라 사업장에 적용할
   * **판정 기준**이라 조작이 아니라 감독의 일부다. 탭 가시성(`SETTINGS_TAB_ROLES`)이
   * 기준치 탭만 열어 준다 — 접근 권한과 다른 축이다.
   */
  'SCR-OP-010': ['system', 'site', 'gov'],
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
