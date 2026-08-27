import { describe, expect, it } from 'vitest';
import { ROLES, canRoleSee } from '@/entities/user';
import {
  NAV_GROUPS,
  NAV_ITEMS,
  groupMenuRoles,
  homeHrefFor,
  menuRolesOf,
} from './config/navigation';

/**
 * 로고 클릭과 역할 전환이 **같은 목적지**를 써야 한다. 정의가 갈리면 같은 앱이 '메인'을
 * 두 개 갖는다 `[사용자 요청 2026-08-20]`.
 */
describe('역할별 첫 화면', () => {
  it('사업장은 자사 현황으로 간다 — 통합 관제가 닫혀 있다', () => {
    expect(homeHrefFor('site')).toBe('/overview');
  });

  it('시스템 관리자는 통합 관제로 간다', () => {
    expect(homeHrefFor('system')).toBe('/');
  });

  /**
   * **기초지자체의 첫 화면은 아직 대체물이다** `[설계 2026-08-24]`.
   *
   * 통합 관제를 기초지자체에 닫았다 — 전국 10개소가 `관할 시·군·구`라는 범위 정의와
   * 모순이다. 그 자리를 받을 `SCR-GU-001 관내 감독 현황`은 설계서만 있고 라우트가 없어
   * (`[사용자 결정 2026-08-24]`) 지금은 `NAV_ITEMS`의 다음 열린 항목으로 떨어진다.
   *
   * **그 항목은 묶음 순서가 정한다.** `관제`가 `자사 현황(사업장만) · 관내 감독 현황 ·
   * 통합 관제(닫힘) · 시계열 변화`라 답은 `/jurisdiction`이다.
   *
   * 한때 `/timeseries`였다 — `SCR-GU-001`에 라우트가 없어 다음 열린 항목으로 떨어졌기
   * 때문이다. **관내 화면이 앞쪽에 들어가면서 그 임시값이 사라졌다.**
   */
  it('기초지자체의 첫 화면은 관내 감독 현황이다', () => {
    expect(canRoleSee('SCR-OP-001', 'gov')).toBe(false);
    expect(homeHrefFor('gov')).toBe('/jurisdiction');
    expect(NAV_ITEMS.some((nav) => nav.screenId === 'SCR-GU-001')).toBe(true);
  });

  /** 관할 화면은 감독 기관만 본다 — 관할 밖 사업장이 들어가 범위가 무너진다 */
  it('관내 감독 현황은 기초지자체 전용이다', () => {
    expect(canRoleSee('SCR-GU-001', 'system')).toBe(false);
    expect(canRoleSee('SCR-GU-001', 'site')).toBe(false);
  });

  /** 목적지가 그 역할에 닫혀 있으면 라우트 가드가 곧바로 되돌려 무한히 튕긴다 */
  it('전 역할의 목적지가 그 역할에 열려 있다', () => {
    for (const role of ROLES) {
      const href = homeHrefFor(role);
      const item = NAV_ITEMS.find((nav) => nav.href === href);
      expect(item, `${role}: ${href}에 해당하는 메뉴가 없다`).toBeDefined();
      expect(canRoleSee(item!.screenId, role), `${role}: ${href}가 닫혀 있다`).toBe(true);
    }
  });

  /**
   * 순서가 곧 답이다 — `NAV_ITEMS` 맨 앞이 사업장의 첫 화면이어야 한다. 손익(SCR-AD-001)이
   * 앞으로 오면 사업장 사용자가 로그인 직후 손익부터 보게 된다.
   */
  it('목록 순서가 바뀌면 목적지도 바뀐다는 것을 못박는다', () => {
    expect(NAV_ITEMS[0]!.screenId).toBe('SCR-AD-003');
    expect(NAV_ITEMS.find((item) => canRoleSee(item.screenId, 'system'))!.href).toBe('/');
  });
});

/**
 * 화면을 **지우지 않고 감춘다** `[회의 2026-08-20]`.
 *
 * `menuRoles: []`가 그 수단이다 — 빈 배열은 `??`를 통과해 전 역할에서 감춰지고, 항목이
 * 배열에 남아 있어 **라우트 가드가 계속 돈다.** 배열에서 지우면 가드가 그 경로를 못 찾아
 * 주소를 직접 입력하면 열린다. 두 성질을 함께 못박는다.
 */
describe('비용 절감 현황 — 감췄지만 없앤 것은 아니다', () => {
  const item = NAV_ITEMS.find((nav) => nav.screenId === 'SCR-AD-001');

  it('메뉴 항목이 배열에 남아 있다 — 가드가 이 경로를 찾을 수 있어야 한다', () => {
    expect(item, 'SCR-AD-001 항목이 사라졌다 — 라우트 가드가 무력해진다').toBeDefined();
    expect(item!.href).toBe('/cost-savings');
  });

  it('어느 역할에도 노출되지 않는다', () => {
    expect(item!.menuRoles).toEqual([]);
  });

  /** 접근 권한은 그대로다 — 감춘 것이 인가는 아니다(E6 예외) */
  it('접근 권한은 사업장에 남아 있다', () => {
    expect(canRoleSee('SCR-AD-001', 'site')).toBe(true);
  });
});

describe('수분석 검증 — 화면을 제거했다', () => {
  it('메뉴에도 권한 매트릭스에도 없다', () => {
    expect(NAV_ITEMS.some((nav) => nav.screenId === 'SCR-OP-009')).toBe(false);
    for (const role of ROLES) expect(canRoleSee('SCR-OP-009', role)).toBe(false);
  });
});

/**
 * 사이드바를 **주제로 묶었다** `[사용자 지시 2026-08-25]`. 깊이를 만든 것이 아니라
 * 머리글만 얹었으므로 두 가지가 깨지기 쉽다 — 편 순서(첫 화면이 여기서 나온다)와
 * 빈 이름표(그 역할에서 항목이 전부 숨은 묶음).
 */
describe('사이드바 묶음', () => {
  it('묶음을 펴면 항목 전부이고 중복이 없다', () => {
    const flat = NAV_GROUPS.flatMap((group) => group.items);
    expect(flat).toEqual(NAV_ITEMS);
    expect(new Set(NAV_ITEMS.map((item) => item.href)).size).toBe(NAV_ITEMS.length);
  });

  /** 머리글만 남으면 누를 것이 없는 이름표가 된다 */
  it('보이는 묶음에는 그 역할에 보이는 항목이 하나 이상 있다', () => {
    for (const group of NAV_GROUPS) {
      for (const role of groupMenuRoles(group)) {
        const shown = group.items.filter((item) => menuRolesOf(item).includes(role));
        expect(shown.length, `${role}: ${group.label} 묶음이 비었다`).toBeGreaterThan(0);
      }
    }
  });

  /**
   * **기초지자체에게도 `관리`가 보인다** `[사용자 결정 2026-08-25]`. 예전에는 남는 것이
   * 없어 묶음째 감췄는데, 기준치 입력 주체가 기초지자체로 정해져 `사업장 설정`이 열렸다
   * — 지역별 방류 기준을 아는 주체가 지자체다. 들어갈 길이 없으면 그 결정이 화면에서
   * 성립하지 않는다.
   *
   * 수처리 공정은 여전히 사업장만이다.
   */
  it('관리 묶음은 사업장 설정 때문에 세 역할 모두에게 보인다', () => {
    const manage = NAV_GROUPS.find((group) => group.label === '관리');
    expect(manage).toBeDefined();
    expect(groupMenuRoles(manage!)).toEqual(expect.arrayContaining(['system', 'site', 'gov']));
  });
});
