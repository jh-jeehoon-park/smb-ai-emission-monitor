/**
 * **사업장 계정 2종.** 역할(`site`)은 하나이고 보는 사업장만 다르다 — 늘어난 것은
 * 역할이 아니라 범위다(docs/specs/README §4.4).
 *
 * 소속 사업장은 `[설계]`다. 원문에 계정↔사업장 매핑이 없다(TBD-08) — 계약 구조가
 * 정해져야 확정된다. 두 곳을 고른 기준은 **상태 대비**이며, 확정 시 이 배열만 고친다.
 *
 * **식별자에 `admin`이 남아 있는 것은 역사다.** 2026-08-20 회의가 `관리자`를 `사업장`으로
 * 바꿨지만 이 이름은 localStorage 키(`aquasense-admin`)와 CSS 클래스(`admin-only-N`·
 * `admin-pick-N`)까지 묶여 있어, 함께 고치려면 저장값이 날아가고 선택자 전부를 다시
 * 써야 한다. **뜻은 이 주석이 갖는다** — 지자체 계정 축을 만들 때 함께 정리한다.
 */
export type AdminAccountKey = 'admin-1' | 'admin-2';

export interface AdminAccount {
  key: AdminAccountKey;
  label: string;
  siteId: string;
}

export const ADMIN_ACCOUNTS: readonly AdminAccount[] = [
  /** 이상 88 위험 · 미확인 알람 2건 — 값이 가득한 화면을 확인한다 */
  { key: 'admin-1', label: '사업장1', siteId: 'S-02' },
  /** 이상 14 정상 · 알람 0건 — **빈 상태 처리**를 확인한다 */
  { key: 'admin-2', label: '사업장2', siteId: 'S-09' },
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
