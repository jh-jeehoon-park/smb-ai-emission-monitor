/**
 * 사용자 3종. **2026-08-20 회의가 정했다** — 사업장 / 지자체 공무원 / 시스템 관리자.
 *
 * 원문 p.69의 `관리자 / 운영자 / 게스트`를 대체한다. 회의가 "게스트라는 표현은
 * 적절하지 않다"고 정리했고, 규약대로 회의가 원문을 이긴다(`docs/specs/README.md` §3.0).
 * 원문 이름이 사라진 사실은 `source-inconsistencies.md`에 남긴다.
 */
export type Role = 'site' | 'gov' | 'system';

/**
 * 역할이 보는 사업장 집합. 역할마다 하나로 정해진다 — 회의가 사용자 유형과 범위를
 * 함께 못박아, 예전처럼 조작 축과 범위 축을 곱하지 않는다.
 *
 * `own-province`는 **아직 동작하지 않는다.** 지자체 구현을 뒤로 미뤘으므로
 * (`[사용자 지시 2026-08-20]`) 타입에만 있고 필터가 없다 — 최종 형태를 미리 두어
 * 권한 매트릭스·문서를 두 번 고치지 않으려는 것이다.
 */
export type RoleScope = 'all-sites' | 'own-province' | 'own-site';

export interface RoleProfile {
  role: Role;
  label: string;
  /** 그 역할이 실제로 누구인가 — 화면에 보이는 설명 */
  who: string;
  scope: RoleScope;
  scopeLabel: string;
}
