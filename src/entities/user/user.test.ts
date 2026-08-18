import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { NAV_ITEMS } from '@/widgets/app-shell/config/navigation';
import {
  ROLES,
  ROLE_PROFILES,
  ROLE_SWITCH_BLOCKED_REASON,
  SCREEN_ROLES,
  SWITCHABLE_ROLES,
  canRoleSee,
} from './config/constants';
import {
  ADMIN_ACCOUNTS,
  DEFAULT_ADMIN_ACCOUNT,
  adminSiteId,
  normalizeAdminAccount,
} from './config/accounts';
import { DEFAULT_ROLE, SESSION_INIT_SCRIPT, normalizeRole } from './config/session';
import { SITES } from '@/entities/site';

const MATRIX = readFileSync(
  join(process.cwd(), 'docs/specs/screens.md'),
  'utf8',
);

/** `| SCR-OP-001 | 통합 관제 | ✕ | R | R | …` 에서 세 역할 칸을 뽑는다 */
function docAccess(screenId: string): Record<string, boolean> | null {
  const row = MATRIX.split('\n').find((l) => l.startsWith(`| ${screenId} |`));
  if (!row) return null;
  const cells = row.split('|').map((c) => c.trim());
  // 0 빈칸 · 1 화면ID · 2 화면명 · 3 관리자 · 4 운영자 · 5 게스트
  const allow = (cell: string) => !cell.includes('✕');
  return { admin: allow(cells[3]), operator: allow(cells[4]), guest: allow(cells[5]) };
}

describe('역할 — 문서와 코드가 갈리지 않는다', () => {
  it.each(Object.keys(SCREEN_ROLES))(
    '%s의 접근 역할이 screens.md 권한 매트릭스와 같다',
    (screenId) => {
      const doc = docAccess(screenId);
      expect(doc, `${screenId} 행이 screens.md에 없다`).not.toBeNull();
      for (const role of ROLES) {
        expect(canRoleSee(screenId, role), `${screenId} × ${role}`).toBe(doc![role]);
      }
    },
  );

  it('사이드바 메뉴가 전부 매트릭스에 등록되어 있다', () => {
    for (const item of NAV_ITEMS) {
      expect(SCREEN_ROLES[item.screenId], `${item.label}(${item.screenId})`).toBeDefined();
    }
  });

  it('통합 관제는 관리자에게 닫혀 있다 — 회의 2026-08-13', () => {
    expect(canRoleSee('SCR-OP-001', 'admin')).toBe(false);
    expect(canRoleSee('SCR-OP-001', 'operator')).toBe(true);
  });

  /**
   * 관리자의 첫 화면은 **현황**이지 손익이 아니다.
   *
   * 가드가 `NAV_ITEMS`의 첫 접근 가능 항목을 폴백으로 쓰므로 순서가 곧 첫 화면이다.
   * SCR-AD-003을 앞에서 치우면 다시 손익 화면으로 떨어진다 — 그때 여기서 걸린다.
   */
  it('관리자로 바꾸면 자사 현황으로 옮겨 간다 — 라우트 가드의 대체 화면', () => {
    expect(NAV_ITEMS.find((item) => canRoleSee(item.screenId, 'admin'))?.href).toBe('/overview');
  });

  it('운영자·게스트의 대체 화면은 그대로 통합 관제다', () => {
    for (const role of ['operator', 'guest'] as const) {
      expect(NAV_ITEMS.find((item) => canRoleSee(item.screenId, role))?.href).toBe('/');
    }
  });
});

describe('세션 — 하이드레이션이 깨지지 않게', () => {
  it('알 수 없는 값은 기본 역할로 떨어진다', () => {
    expect(normalizeRole('admin')).toBe('admin');
    expect(normalizeRole('root')).toBe(DEFAULT_ROLE);
    expect(normalizeRole(null)).toBe(DEFAULT_ROLE);
  });

  it('기본 역할은 운영자다 — 구현된 8개가 운영자 화면이라 진입 즉시 볼 것이 있다', () => {
    expect(DEFAULT_ROLE).toBe('operator');
  });

  it('INIT 스크립트가 첫 페인트 전에 data-role을 세운다', () => {
    // 이 속성이 없으면 CSS가 역할을 가르지 못하고 메뉴가 전부 보인다
    expect(SESSION_INIT_SCRIPT).toContain("setAttribute('data-role'");
    // 미로그인 리다이렉트도 같은 스크립트가 맡는다 — 본문이 그려지기 전이라 깜빡임이 없다
    expect(SESSION_INIT_SCRIPT).toContain('location.replace');
  });

  it('세 역할 모두 프로파일이 있다 — 하나라도 비면 전환 UI가 빈칸을 그린다', () => {
    for (const role of ROLES) {
      expect(ROLE_PROFILES[role].label).toBeTruthy();
      expect(ROLE_PROFILES[role].who).toBeTruthy();
      expect(ROLE_PROFILES[role].scopeLabel).toBeTruthy();
    }
  });
});

describe('관리자 계정 — 범위 축', () => {
  it('두 계정이 서로 다른 실재 사업장을 가리킨다', () => {
    const ids = ADMIN_ACCOUNTS.map((a) => a.siteId);
    expect(new Set(ids).size).toBe(ADMIN_ACCOUNTS.length);
    for (const id of ids) {
      expect(SITES.some((s) => s.id === id), `${id}가 사업장 목록에 없다`).toBe(true);
    }
  });

  it('두 계정의 상태가 갈린다 — 한쪽만 보면 빈 상태 처리를 못 본다', () => {
    /**
     * 계정을 둘로 나눈 이유가 상태 대비다. 둘 다 값이 가득하거나 둘 다 비어 있으면
     * 시연에서 확인할 수 있는 것이 절반으로 준다.
     */
    const scores = ADMIN_ACCOUNTS.map(
      (a) => SITES.find((s) => s.id === a.siteId)?.anomalyScore ?? null,
    );
    expect(scores.every((s) => s !== null)).toBe(true);
    expect(Math.max(...(scores as number[])) - Math.min(...(scores as number[]))).toBeGreaterThan(
      40,
    );
  });

  it('알 수 없는 계정 키는 기본값으로 떨어진다', () => {
    expect(normalizeAdminAccount('admin-2')).toBe('admin-2');
    expect(normalizeAdminAccount('admin-9')).toBe(DEFAULT_ADMIN_ACCOUNT);
    expect(normalizeAdminAccount(null)).toBe(DEFAULT_ADMIN_ACCOUNT);
  });

  it('adminSiteId가 계정별 사업장을 준다', () => {
    for (const account of ADMIN_ACCOUNTS) {
      expect(adminSiteId(account.key)).toBe(account.siteId);
    }
  });

  it('INIT 스크립트가 첫 페인트 전에 data-admin을 세운다', () => {
    // 이 속성이 없으면 계정별 배지가 CSS로 갈리지 않아 숫자가 겹쳐 보인다
    expect(SESSION_INIT_SCRIPT).toContain("setAttribute('data-admin'");
    for (const account of ADMIN_ACCOUNTS) {
      expect(SESSION_INIT_SCRIPT).toContain(`'${account.key}'`);
    }
  });
});

/**
 * 게스트는 **전환만** 막는다. 역할 자체를 없애는 것이 아니다 —
 * 권한 매트릭스는 게스트가 볼 수 있는 화면을 그대로 규정하고 있고,
 * 저장된 역할이 게스트인 세션도 계속 동작해야 한다.
 */
describe('역할 전환 — 게스트는 시연에서 고를 수 없다', () => {
  it('전환 목록에 게스트가 없다', () => {
    expect(SWITCHABLE_ROLES).not.toContain('guest');
  });

  it('관리자·운영자는 전환할 수 있다', () => {
    expect(SWITCHABLE_ROLES).toEqual(expect.arrayContaining(['admin', 'operator']));
  });

  /** 전환 목록은 전체 역할의 부분집합이어야 한다 — 없는 역할을 고를 수 있으면 안 된다 */
  it('전환 목록이 역할 목록 안에 있다', () => {
    for (const role of SWITCHABLE_ROLES) expect(ROLES).toContain(role);
  });

  it('게스트는 여전히 유효한 역할이다 — 저장된 세션이 깨지지 않는다', () => {
    expect(normalizeRole('guest')).toBe('guest');
    expect(ROLES).toContain('guest');
  });

  it('게스트의 화면 접근 권한은 그대로다', () => {
    expect(canRoleSee('SCR-OP-001', 'guest')).toBe(true);
    expect(canRoleSee('SCR-AD-003', 'guest')).toBe(false);
  });

  /** 못 누르는 이유가 화면에 적혀야 한다 — 흐릿하기만 하면 고장으로 읽힌다 */
  it('막힌 이유 문구가 있다', () => {
    expect(ROLE_SWITCH_BLOCKED_REASON).toContain('게스트');
  });
});
