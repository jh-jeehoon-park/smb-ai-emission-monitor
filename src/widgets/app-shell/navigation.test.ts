import { describe, expect, it } from 'vitest';
import { ROLES, canRoleSee } from '@/entities/user';
import { NAV_ITEMS, homeHrefFor } from './config/navigation';

/**
 * 로고 클릭과 역할 전환이 **같은 목적지**를 써야 한다. 정의가 갈리면 같은 앱이 '메인'을
 * 두 개 갖는다 `[사용자 요청 2026-08-20]`.
 */
describe('역할별 첫 화면', () => {
  it('관리자는 자사 현황으로 간다 — 통합 관제가 닫혀 있다', () => {
    expect(homeHrefFor('admin')).toBe('/overview');
  });

  it('운영자·게스트는 통합 관제로 간다', () => {
    expect(homeHrefFor('operator')).toBe('/');
    expect(homeHrefFor('guest')).toBe('/');
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
   * 순서가 곧 답이다 — `NAV_ITEMS` 맨 앞이 관리자의 첫 화면이어야 한다. 손익(SCR-AD-001)이
   * 앞으로 오면 관리자가 로그인 직후 손익부터 보게 된다.
   */
  it('목록 순서가 바뀌면 목적지도 바뀐다는 것을 못박는다', () => {
    expect(NAV_ITEMS[0]!.screenId).toBe('SCR-AD-003');
    expect(NAV_ITEMS.find((item) => canRoleSee(item.screenId, 'operator'))!.href).toBe('/');
  });
});
