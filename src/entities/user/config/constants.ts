import type { Role, RoleProfile } from '../model/types';

export const ROLES: readonly Role[] = ['operator', 'admin', 'guest'] as const;

/**
 * 역할의 정의는 접근제어 3역할이 전부이고(사업계획서 p.69), 누가 그 역할인지와
 * 무엇을 보는지는 회의(2026-08-13)가 정했다. 근거는 docs/specs/README.md §4.4.
 */
export const ROLE_PROFILES: Record<Role, RoleProfile> = {
  operator: {
    role: 'operator',
    label: '운영자',
    who: '통합 관제 주체',
    scope: 'all-sites',
    scopeLabel: '전 사업장',
  },  
  admin: {
    role: 'admin',
    label: '관리자',
    who: '사업주 · 최고 책임자',
    scope: 'own-site',
    scopeLabel: '자사 1개소',
  },
  guest: {
    role: 'guest',
    label: '게스트',
    who: '감독기관 (추측)',
    scope: 'all-sites',
    scopeLabel: '전 사업장 · 조회만',
  },
};

/**
 * 시연에서 **전환할 수 있는** 역할.
 *
 * 게스트가 빠진다 `[사용자 결정 2026-08-18]`. 원문 p.69는 "조회만 가능"만 규정하고
 * 게스트의 화면·조작 범위를 정하지 않았다(`[TBD-07]`). 조작 차단도 아직 미구현이라
 * (`screens.md` §5) 게스트로 바꿔도 운영자와 화면이 같다 — **전환해 봐야 구분이
 * 되지 않는 것을 고를 수 있게 두면 없는 기능이 있는 것처럼 읽힌다.**
 *
 * **접근 권한(`SCREEN_ROLES`)은 건드리지 않는다.** 게스트가 볼 수 있는 화면의 정의는
 * 권한 매트릭스가 그대로 갖는다 — 전환 수단만 닫는 것이지 역할을 없애는 것이 아니다.
 */
export const SWITCHABLE_ROLES: readonly Role[] = ['operator', 'admin'] as const;

/** 전환 막힌 역할에 적는 이유. 화면이 근거를 갖고 있어야 한다 */
export const ROLE_SWITCH_BLOCKED_REASON =
  '게스트는 원문이 조작 범위를 정하지 않아 시연에서 전환하지 않습니다';

/**
 * 화면별 접근 가능 역할. **출처는 docs/specs/screens.md §5 권한 매트릭스 하나다.**
 * 여기서 값을 바꾸면 그 표도 같이 고쳐야 한다 — 두 곳이 갈리면 어느 쪽이 맞는지 알 수 없다.
 *
 * 통합 관제만 관리자에게 닫혀 있다 — 지도·10개소 월보드는 자사 1개소뿐인
 * 관리자에게 의미가 없다(회의 2026-08-13).
 */
export const SCREEN_ROLES: Record<string, readonly Role[]> = {
  // 로그인은 역할이 생기기 전의 화면이라 역할로 가릴 수 없다
  'SCR-CO-001': ROLES,
  'SCR-OP-001': ['operator', 'guest'],
  'SCR-OP-002': ROLES,
  'SCR-OP-003': ROLES,
  'SCR-OP-004': ROLES,
  'SCR-OP-005': ROLES,
  'SCR-OP-006': ROLES,
  'SCR-OP-007': ROLES,
  'SCR-OP-008': ROLES,
  // 검증 결과 조회는 전 역할. 값을 바꾸는 조작이 없다
  'SCR-OP-009': ROLES,
  'SCR-AD-001': ['admin'],
  // 자사 손익 요약이 들어간다 — SCR-AD-001과 같은 이유로 관리자만
  'SCR-AD-003': ['admin'],
  // 조회는 전 역할. **메뉴 노출은 별개 축**이라 NavItem.menuRoles가 정한다
  'SCR-AD-002': ROLES,
};

export function canRoleSee(screenId: string, role: Role): boolean {
  return SCREEN_ROLES[screenId]?.includes(role) ?? false;
}
