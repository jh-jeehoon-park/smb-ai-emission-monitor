import type { Role } from '@/entities/user';

export const SETTINGS_TAB_KEY = 'tab';

export const SETTINGS_TABS = ['classification', 'limits', 'process', 'instruments', 'metering'] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number];

export const SETTINGS_TAB_OPTIONS: { value: SettingsTab; label: string }[] = [
  { value: 'classification', label: '사업장 규제정보' },
  { value: 'limits', label: '방류 기준치' },
  { value: 'process', label: '공정 구성' },
  { value: 'instruments', label: '계측 구성' },
  { value: 'metering', label: '설비 전력 계측' },
];

/**
 * 목차의 **묶음** `[사용자 요청 2026-09-29: 사업장 설정 UI/UX 개편]`.
 *
 * «사업장»은 그 곳이 어떤 곳이고 어떤 기준을 받는가 — 규정·판정에 닿는다. «설비·계측»은 무엇을
 * 달았는가 — 장비 구성이다. 고치는 사람도 시점도 다르다(허가증이 갱신될 때 vs 장비를 설치할 때).
 * 탭 순서(`SETTINGS_TABS`)와 이 묶음의 순서가 같다 — 어긋나면 목차와 기본 탭이 따로 논다.
 */
export const SETTINGS_TAB_GROUPS: readonly { label: string; tabs: readonly SettingsTab[] }[] = [
  { label: '사업장', tabs: ['classification', 'limits'] },
  { label: '설비·계측', tabs: ['process', 'instruments', 'metering'] },
];

/**
 * **`classification`은 이제 «분류»보다 넓다** `[사용자 요청 2026-09-28: 설정 재설계 검토]`.
 *
 * 처음에는 기준치표를 고르는 두 축(지역구분·배출량 규모)뿐이라 그 이름이 맞았다. 지금은
 * **1일 폐수배출량 원시값**과 **방류·처리 경로**까지 담아 «그 사업장이 어떤 곳인가»를
 * 적는 칸이 됐고, 라벨을 **사업장 규제정보**로 바꿨다. 키는 그대로 둔다 — 주소
 * (`?tab=classification`)를 저장해 둔 사람의 링크가 깨진다.
 */
/**
 * 역할이 어느 탭을 다루는가.
 *
 * **시스템 관리자가 전권을 갖는다** `[사용자 결정 2026-08-21: 각 사업장을 등록하고 설정하는
 * 것은 회원 관리나 마찬가지니 관리자의 권한]`. 사업장 분류(지역구분·배출량 규모)와 공정
 * 구성은 그 사업장을 **등록하는 정보**라 프로비저닝에 속한다.
 *
 * **사업장은 `방류 기준치`만 고친다** — 허가증이 갱신되면 사업장이 먼저 알기 때문이다.
 * 계정 관리의 통상 형태와 같다(시스템 관리자가 계정을 만들고 사용자는 자기 정보를 고친다).
 *
 * **접근 권한과 다른 축이다.** 화면에 들어올 수 있는지는 `SCREEN_ROLES`가 정하고, 들어온 뒤
 * 무엇을 보는지는 이 표가 정한다 — `SCR-AD-002`가 접근은 전 역할이면서 메뉴 노출만 사업장인
 * 것과 같은 구조다.
 *
 * **기초지자체도 `방류 기준치`를 고친다** `[사용자 결정 2026-08-25]`. 지역별 방류 기준을 아는
 * 주체가 지자체이고, `[TBD-45]`를 회의가 *"사용자 설정값으로 받는다"* 로 우회했을 때
 * `[회의 2026-08-20]` 그 사용자가 누구인지가 비어 있었다. **조회 전용의 유일한 예외이며**,
 * 이 값은 사업장의 데이터가 아니라 **사업장에 적용할 판정 기준**이라 조작이 아니라 감독의
 * 일부다. 한때 이 파일 주석이 *"기초지자체는 화면 자체에 들어오지 못한다"* 라 적었는데
 * `SCREEN_ROLES`와 정반대였다.
 *
 * **사업장에서 내리지 않았다** `[사용자 결정 2026-08-26]`. 내리면 사업장에게 볼 탭이 하나도
 * 안 남고, 사업장의 시스템 설정 권한은 **별도 설계가 필요해 추후로 미뤘다.** 두 주체가 같은
 * 값을 고치면 마지막에 쓴 쪽이 이긴다 — 그 사실은 미정으로 열어 둔다.
 */
export const SETTINGS_TAB_ROLES: Record<SettingsTab, readonly Role[]> = {
  classification: ['system'],
  limits: ['system', 'site', 'gov'],
  process: ['system'],
  /*
   * **계측 구성도 프로비저닝이다** `[사용자 요청 2026-09-28]`. 어떤 계측기를 달았는지는
   * 사업장을 **등록하는 정보**라 위 `classification`·`process`와 같은 칸에 선다 — 사업장이
   * 바꿀 값이 아니라 설치한 사실의 기록이다 `[사용자 결정 2026-08-21: 각 사업장을 등록하고
   * 설정하는 것은 회원 관리나 마찬가지니 관리자의 권한]`.
   */
  instruments: ['system'],
  /*
   * **설비 전력 계측 대상도 프로비저닝이다** `[사용자 요청 2026-09-21]`. 현장조사가 이 결정을
   * «JH솔루션 검토 후 확정»이라 적었고, 고른 결과가 **설치 범위와 비용**이 된다 — 사업장이
   * 바꿀 값이 아니다.
   */
  metering: ['system'],
};
