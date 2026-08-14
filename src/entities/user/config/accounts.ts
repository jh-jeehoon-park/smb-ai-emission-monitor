/**
 * 관리자 계정 2종. **역할은 3종을 유지한다**(원문 p.69) — 늘어난 것은 조작 축이 아니라
 * 범위 축이다. 두 계정 모두 조작은 `admin`이고 보는 사업장만 다르다(docs/specs/README §4.4).
 *
 * 소속 사업장은 `[설계]`다. 원문에 계정↔사업장 매핑이 없다(TBD-08) — 계약 구조가
 * 정해져야 확정된다. 두 곳을 고른 기준은 **상태 대비**이며, 확정 시 이 배열만 고친다.
 */
export type AdminAccountKey = 'admin-1' | 'admin-2';

export interface AdminAccount {
  key: AdminAccountKey;
  label: string;
  siteId: string;
}

export const ADMIN_ACCOUNTS: readonly AdminAccount[] = [
  /** 이상 88 위험 · 미확인 알람 2건 — 값이 가득한 화면을 확인한다 */
  { key: 'admin-1', label: '관리자1', siteId: 'S-02' },
  /** 이상 14 정상 · 알람 0건 — **빈 상태 처리**를 확인한다 */
  { key: 'admin-2', label: '관리자2', siteId: 'S-09' },
];

export const DEFAULT_ADMIN_ACCOUNT: AdminAccountKey = 'admin-1';

export function normalizeAdminAccount(value: string | undefined | null): AdminAccountKey {
  return ADMIN_ACCOUNTS.some((a) => a.key === value)
    ? (value as AdminAccountKey)
    : DEFAULT_ADMIN_ACCOUNT;
}

export function adminSiteId(key: AdminAccountKey): string {
  return ADMIN_ACCOUNTS.find((a) => a.key === key)?.siteId ?? ADMIN_ACCOUNTS[0].siteId;
}
