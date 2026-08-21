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
 * 계정 관리의 통상 형태와 같다(관리자가 계정을 만들고 사용자는 자기 정보를 고친다).
 *
 * **접근 권한과 다른 축이다.** 화면에 들어올 수 있는지는 `SCREEN_ROLES`가 정하고, 들어온 뒤
 * 무엇을 보는지는 이 표가 정한다 — `SCR-AD-002`가 접근은 전 역할이면서 메뉴 노출만 사업장인
 * 것과 같은 구조다.
 *
 * 지자체는 화면 자체에 들어오지 못한다(`SCREEN_ROLES`) — 남의 사업장 설정을 고칠 이유가 없다.
 */
export const SETTINGS_TAB_ROLES: Record<SettingsTab, readonly Role[]> = {
  classification: ['system'],
  limits: ['system', 'site'],
  process: ['system'],
};
