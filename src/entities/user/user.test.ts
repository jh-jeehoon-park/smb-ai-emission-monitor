import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { NAV_ITEMS, homeHrefFor } from '@/widgets/app-shell/config/navigation';
import {
  DEMO_PERSON_NAME,
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
import type { Role } from './model/types';
import { SITES } from '@/entities/site';

const MATRIX = readFileSync(join(process.cwd(), 'docs/specs/screens.md'), 'utf8');

/**
 * §5 권한 매트릭스에서 그 화면의 역할별 접근 가능 여부를 뽑는다.
 *
 * **열 위치를 가정하지 않고 헤더의 역할 라벨로 찾는다.** 예전에는 `cells[3]/[4]/[5]`를
 * 관리자·운영자·게스트로 고정해 읽었는데, 2026-08-20 회의가 역할을 교체하면서 열 이름과
 * 순서가 함께 바뀌자 **파서가 조용히 다른 열을 읽었다.** 라벨로 찾으면 순서가 바뀌어도 맞다.
 */
const ROLE_BY_LABEL = new Map(ROLES.map((role) => [ROLE_PROFILES[role].label, role]));

function docAccess(screenId: string): Partial<Record<Role, boolean>> | null {
  const rows = MATRIX.split('\n');
  const header = rows.find((l) => l.startsWith('| 화면 ID | 화면 |'));
  const row = rows.find((l) => l.startsWith(`| ${screenId} |`));
  if (!header || !row) return null;

  const headerCells = header.split('|').map((c) => c.trim());
  const cells = row.split('|').map((c) => c.trim());
  const out: Partial<Record<Role, boolean>> = {};
  headerCells.forEach((label, index) => {
    const role = ROLE_BY_LABEL.get(label);
    if (role) out[role] = !cells[index]?.includes('✕');
  });
  return out;
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
      /* 라벨로 찾으므로 세 역할이 다 잡혔는지 확인한다 — 못 찾으면 undefined가 되어 조용히 통과한다 */
      expect(Object.keys(doc!).length, `${screenId} 열 매칭 실패`).toBe(ROLES.length);
    },
  );

  it('사이드바 메뉴가 전부 매트릭스에 등록되어 있다', () => {
    for (const item of NAV_ITEMS) {
      expect(SCREEN_ROLES[item.screenId], `${item.label}(${item.screenId})`).toBeDefined();
    }
  });

  it('통합 관제는 사업장에 닫혀 있다 — 지도·10개소 월보드가 자사 1개소에 의미가 없다', () => {
    expect(canRoleSee('SCR-OP-001', 'site')).toBe(false);
    expect(canRoleSee('SCR-OP-001', 'system')).toBe(true);
  });

  /**
   * 사업장의 첫 화면은 **손익이 아니다.**
   *
   * 가드가 `NAV_ITEMS`에서 **메뉴에 보이는** 첫 항목을 폴백으로 쓰므로 순서가 곧 첫 화면이다.
   * 맨 앞을 치우면 다시 손익 화면(`SCR-AD-001`)으로 떨어진다 — 그때 여기서 걸린다.
   *
   * **하루 동안 `/inout`이었다** `[사용자 결정 2026-09-09]` → 되돌림 `[사용자 요청 2026-09-10]`.
   * 그 화면이 4번째로 지정되며 순서가 되돌았고, 「손익이 아니어야 한다」는 원래 근거는 두
   * 판본 모두에서 지켜졌다.
   */
  it('사업장으로 바꾸면 사업장 상세로 옮겨 간다 — 라우트 가드의 대체 화면', () => {
    expect(homeHrefFor('site')).toBe('/overview');
  });

  it('시스템 관리자의 대체 화면은 통합 관제다', () => {
    expect(homeHrefFor('system')).toBe('/');
  });

  /**
   * 통합 관제를 닫은 자리를 `SCR-GU-001`이 받는다. 한때 그 화면에 라우트가 없어
   * `/timeseries`로 떨어졌는데 **그 임시값은 사라졌다.**
   */
  it('기초지자체의 대체 화면은 관내 감독 현황이다', () => {
    expect(homeHrefFor('gov')).toBe('/jurisdiction');
  });
});

describe('세션 — 하이드레이션이 깨지지 않게', () => {
  it('알 수 없는 값은 기본 역할로 떨어진다', () => {
    expect(normalizeRole('site')).toBe('site');
    /* 회의 이전 값이다. 키에 판을 붙여 읽지 않지만, 읽더라도 기본 역할로 떨어져야 한다 */
    expect(normalizeRole('admin')).toBe(DEFAULT_ROLE);
    expect(normalizeRole('root')).toBe(DEFAULT_ROLE);
    expect(normalizeRole(null)).toBe(DEFAULT_ROLE);
  });

  it('기본 역할은 시스템 관리자다 — 구현된 화면 대부분이 전 사업장 관제라 진입 즉시 볼 것이 있다', () => {
    expect(DEFAULT_ROLE).toBe('system');
  });

  /**
   * 역할 리터럴이 `<head>` 인라인 문자열 안에 박혀 있던 적이 있다. 그때 이름을 바꾸면
   * 컴파일은 통과하고 **역할 전환만 조용히 안 먹었다.** 이제 `ROLES`에서 만든다.
   */
  it('INIT 스크립트가 현재 역할 세 개를 전부 담는다', () => {
    for (const role of ROLES) {
      expect(SESSION_INIT_SCRIPT, `${role}가 INIT 스크립트에 없다`).toContain(`'${role}'`);
    }
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

describe('사업장 계정 — 범위 축', () => {
  it('두 계정이 서로 다른 실재 사업장을 가리킨다', () => {
    const ids = ADMIN_ACCOUNTS.map((a) => a.siteId);
    expect(new Set(ids).size).toBe(ADMIN_ACCOUNTS.length);
    for (const id of ids) {
      expect(
        SITES.some((s) => s.id === id),
        `${id}가 사업장 목록에 없다`,
      ).toBe(true);
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
 * 기초지자체 전환이 **열렸다** `[사용자 결정 2026-08-26]`.
 *
 * 한동안 전환만 막아 두었다 — 관할 범위 필터가 없어 전환해도 시스템 관리자와 화면이 같았고
 * `[사용자 지시 2026-08-20]`, 구분되지 않는 것을 고를 수 있게 두면 없는 기능이 있는 것처럼
 * 읽히기 때문이다. `scope=municipality`와 `SCR-GU-001`이 생겨 그 조건이 사라졌다.
 */
describe('역할 전환', () => {
  it('세 역할 모두 전환할 수 있다', () => {
    expect(SWITCHABLE_ROLES).toEqual(expect.arrayContaining([...ROLES]));
  });

  /**
   * 전환 탭은 `ROLES` 순서 그대로 그려진다(`profile-menu.tsx`). **범위가 넓은 쪽에서 좁은
   * 쪽으로** 간다 `[사용자 요청 2026-08-27]` — 전국 → 관할 시·군·구 → 자사 1개소.
   *
   * 이 배열은 클래스 문자열·메뉴 필터에도 쓰여 순서를 무심코 바꾸기 쉬운데, 그러면 **화면의
   * 탭 순서가 함께 움직인다.** 요구된 순서를 여기서 못박는다.
   */
  it('전환 탭이 범위 넓은 순이다 — 시스템 관리자 · 기초지자체 · 사업장', () => {
    expect([...ROLES]).toEqual(['system', 'gov', 'site']);
  });

  /** 전환 목록은 전체 역할의 부분집합이어야 한다 — 없는 역할을 고를 수 있으면 안 된다 */
  it('전환 목록이 역할 목록 안에 있다', () => {
    for (const role of SWITCHABLE_ROLES) expect(ROLES).toContain(role);
  });

  it('기초지자체는 유효한 역할이다 — 권한 매트릭스가 이미 규정한다', () => {
    expect(normalizeRole('gov')).toBe('gov');
    expect(ROLES).toContain('gov');
  });

  /**
   * **통합 관제는 기초지자체에도 닫혀 있다** `[설계 2026-08-24]`. 전국 10개소를 보여 주는
   * 것이 `관할 시·군·구`라는 범위 정의와 모순이라, 사업장에 닫은 것과 같은 논리로 닫았다.
   * 그 자리를 `SCR-GU-001 관내 감독 현황`이 받는다.
   */
  it('기초지자체의 화면 접근 권한은 정의돼 있다', () => {
    expect(canRoleSee('SCR-OP-001', 'gov')).toBe(false);
    expect(canRoleSee('SCR-GU-001', 'gov')).toBe(true);
    /* 접근은 열려 있다 — 관내 감독에서 사업장을 고른 뒤 `상세 보기`로 들어온다.
       메뉴에 없는 것은 별개 축이다(`navigation.ts`의 menuRoles) */
    expect(canRoleSee('SCR-AD-003', 'gov')).toBe(true);
  });

  /** 관내 화면은 기초지자체만 본다 — 관할 밖 사업장이 들어가므로 전 사업장 역할에도 닫는다 */
  it('관내 감독 현황은 기초지자체 전용이다', () => {
    expect(canRoleSee('SCR-GU-001', 'system')).toBe(false);
    expect(canRoleSee('SCR-GU-001', 'site')).toBe(false);
  });

  /** 범위 축이 역할마다 하나로 정해진다 — 회의가 사용자 유형과 범위를 함께 못박았다 */
  it('세 역할의 범위가 서로 다르다', () => {
    expect(new Set(ROLES.map((role) => ROLE_PROFILES[role].scope)).size).toBe(ROLES.length);
  });

  /**
   * 못 누르는 이유가 화면에 적혀야 한다 — 흐릿하기만 하면 고장으로 읽힌다.
   * **지금은 막힌 역할이 없지만** 문구는 남긴다: 그때 새로 지어내면 근거가 사라진다.
   */
  it('막힌 이유 문구가 남아 있다', () => {
    expect(ROLE_SWITCH_BLOCKED_REASON).toContain('범위');
    expect(ROLES.every((role) => SWITCHABLE_ROLES.includes(role))).toBe(true);
  });
});

/**
 * **시연 이름은 하나다** `[사용자 지시 2026-08-25]`. 역할마다 다른 이름을 두면
 * 권한을 갈아 끼우는 시연이 세 사람의 계정으로 읽힌다 — 계정은 원래 하나뿐이다.
 */
describe('시연 이름', () => {
  it('세 역할이 같은 이름을 쓴다', () => {
    for (const role of ROLES) {
      expect(ROLE_PROFILES[role].demoName).toBe(DEMO_PERSON_NAME);
    }
  });
});
