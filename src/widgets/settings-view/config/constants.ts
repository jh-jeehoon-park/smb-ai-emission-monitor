import type { Role } from '@/entities/user';

export const SETTINGS_TAB_KEY = 'tab';

export const SETTINGS_TABS = ['classification', 'limits', 'process'] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number];

export const SETTINGS_TAB_OPTIONS: { value: SettingsTab; label: string }[] = [
  { value: 'classification', label: '사업장 분류' },
  { value: 'limits', label: '방류 기준치' },
  { value: 'process', label: '공정 구성' },
];

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
};
