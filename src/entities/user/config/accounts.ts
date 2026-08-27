import type { ScopeWithin } from '@/shared/config/scope';

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
 * 써야 한다. **뜻은 이 주석이 갖는다.**
 *
 * 한때 *"기초지자체 계정 축을 만들 때 함께 정리한다"* 고 적어 두었는데, **그 축을 만들지
 * 않았다** — 관할이 한 곳이라 상수 하나면 된다(아래 `GOV_MUNICIPALITY`). 이름을 고칠
 * 계기는 여전히 오지 않았고, 그때가 오면 저장값 마이그레이션이 함께 필요하다.
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

/**
 * **기초지자체 계정의 관할 시·군·구.** 시연은 **안동시 한 곳**이다 `[PROVISIONAL]` `[TBD-08]`.
 *
 * 원문에 계정↔관할 매핑이 없어 둘을 근거로 골랐다 — ① MOU·구매의향서 대상에 안동시가
 * 있고 `[원문 p.425]` ② 시연 10개소 중 **사업장이 둘인 유일한 시·군·구**다. 목록과 대조가
 * 성립하는 최소 조건이 둘이고, 그중 하나(S-04)가 통신 두절이라 **E4**를 화면이 실제로 밟는다.
 *
 * **계정 배열을 만들지 않았다.** 사업장이 둘이라 `ADMIN_ACCOUNTS`·`data-admin`·`admin-only-N`
 * 축이 필요했던 것이고, 관할이 하나면 그 축이 상수 하나와 같다. **둘째 관할이 생기면**
 * 그때 같은 모양(`data-municipality` + `gov-only-N`)을 만든다 — 셸 배지가 URL을 읽지 못해
 * 값마다 한 벌씩 그려야 하기 때문이다. 그 전에 만들면 쓰지 않는 축이 하나 는다.
 *
 * `Site.municipality`와 같은 표기여야 한다 — 관할 필터가 이 값으로 목록을 좁힌다.
 */
export const GOV_MUNICIPALITY = '안동시';

/**
 * 기초지자체로 들어왔을 때 처음 펼쳐 볼 사업장.
 *
 * **관할 목록에서 계산하지 않고 값으로 적는다.** `entities`끼리는 서로를 읽을 수 없어
 * (FSD §8 수평 import 금지) 여기서 `sitesIn('안동시')`을 부를 수 없다 — `ADMIN_ACCOUNTS`가
 * `siteId: 'S-02'`를 값으로 적어 둔 것과 같은 이유다. **둘이 어긋나지 않는지는 테스트가
 * 확인한다**(`user.test.ts`) — 관할 밖 사업장을 적으면 거기서 깨진다.
 *
 * S-04(안동 식품)가 아니라 S-01(안동 염색)인 이유: S-04는 통신 두절이라 첫 화면이 빈
 * 상태로 열린다. 두절 처리는 관내 표와 지도 핀이 보여 주고, 상세는 값이 있는 쪽을 편다.
 */
export const GOV_HOME_SITE_ID = 'S-01';

/**
 * 기초지자체의 범위를 한 값으로 묶은 것.
 *
 * **셸(사이드바·헤더 배지)이 쓴다** — 그쪽은 라우트 밖이라 `?scope=`를 읽지 못해 관할을
 * 손에 들고 있어야 한다. 화면 안에서는 URL이 정본이므로 이 상수를 쓰지 않는다.
 */
export const GOV_SCOPE: ScopeWithin = {
  siteId: GOV_HOME_SITE_ID,
  municipality: GOV_MUNICIPALITY,
};
