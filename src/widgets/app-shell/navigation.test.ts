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

  it('시스템 관리자·지자체는 통합 관제로 간다', () => {
    expect(homeHrefFor('system')).toBe('/');
    expect(homeHrefFor('gov')).toBe('/');
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

  /** 수처리 공정은 사업장만, 사업장 설정은 관리자·사업장 — 지자체에게는 남는 것이 없다 */
  it('지자체에게는 관리 묶음이 통째로 감춰진다', () => {
    const manage = NAV_GROUPS.find((group) => group.label === '관리');
    expect(manage).toBeDefined();
    expect(groupMenuRoles(manage!)).not.toContain('gov');
    expect(groupMenuRoles(manage!)).toContain('system');
  });
});
