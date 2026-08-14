/** 원문이 규정한 3역할이 전부다. 추가하지 않는다 (사업계획서 p.69) */
export type Role = 'admin' | 'operator' | 'guest';

/**
 * 역할이 보는 사업장 집합. 원문에는 없고 회의(2026-08-13)가 정했다.
 * 조작 축(Role)과 범위 축은 별개이며 곱해져야 실제 사용자가 된다.
 */
export type RoleScope = 'all-sites' | 'own-site';

export interface RoleProfile {
  role: Role;
  label: string;
  /** 그 역할이 실제로 누구인가 — 화면에 보이는 설명 */
  who: string;
  scope: RoleScope;
  scopeLabel: string;
}
