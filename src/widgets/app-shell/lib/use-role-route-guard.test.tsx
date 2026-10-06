// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRoleRouteGuard } from './use-role-route-guard';

/**
 * 라우터와 주소는 테스트가 쥔다 — Next는 실제 라우트 안에서만 그 값을 준다.
 * **역할만 갈아 끼우고 나머지는 진짜를 쓴다**(권한 매트릭스·범위 규칙·메뉴 순서) —
 * 그것까지 흉내 내면 흉내를 검사하게 된다.
 */
const stub = vi.hoisted(() => ({
  pathname: '/',
  search: '',
  role: 'system' as 'system' | 'site' | 'gov',
  adminAccount: 'admin-1' as const,
  replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => stub.pathname,
  useSearchParams: () => new URLSearchParams(stub.search),
  useRouter: () => ({ replace: stub.replace }),
}));

vi.mock('@/entities/user', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/entities/user')>()),
  useRole: () => ({ role: stub.role, adminAccount: stub.adminAccount }),
}));

function Probe() {
  useRoleRouteGuard();
  return null;
}

/** 마지막으로 옮겨 간 주소 */
function movedTo(): string | null {
  const calls = stub.replace.mock.calls;
  return calls.length === 0 ? null : String(calls[calls.length - 1]![0]);
}

beforeEach(() => {
  stub.replace.mockClear();
});

/**
 * **역할을 바꾸면 그 역할의 메인 대시보드로 간다** `[사용자 요청 2026-09-01]`.
 *
 * 그전에는 새 역할에도 열려 있는 화면이면 그 자리에 머물렀다 — 범위가 전국에서 자사
 * 1개소로 갈렸는데 화면은 그대로라 목록만 조용히 짧아졌다.
 */
describe('역할 전환 — 그 역할의 첫 화면으로 옮긴다', () => {
  it('알람 이력에서 사업장으로 바꾸면 자사 현황으로 간다', () => {
    stub.pathname = '/alarms';
    stub.search = '';
    stub.role = 'system';

    const view = render(<Probe />);
    /* 마운트만으로는 옮기지 않는다 — 그것까지 함께 못박는다 */
    expect(movedTo()).toBeNull();

    stub.role = 'site';
    view.rerender(<Probe />);

    expect(movedTo()).toMatch(/^\/overview\?/);
    /* 범위도 함께 실린다 — 경로만 옮기면 다음 틱에 가드가 한 번 더 돈다 */
    expect(movedTo()).toContain('site=S-02');
    expect(movedTo()).toContain('scope=site');
  });

  it('기초지자체로 바꾸면 관내 감독 현황으로 간다', () => {
    stub.pathname = '/alarms';
    stub.search = '';
    stub.role = 'system';

    const view = render(<Probe />);
    stub.role = 'gov';
    view.rerender(<Probe />);

    expect(movedTo()).toMatch(/^\/jurisdiction\?/);
    expect(movedTo()).toContain('scope=municipality');
  });

  /**
   * **직전 역할의 범위를 들고 가지 않는다.**
   *
   * `role-context`가 전환 즉시 걷지만 그것은 `history.replaceState`라, 이 effect가 그 갱신
   * 전에 도는 순서를 배제할 수 없다. 남으면 전 사업장 권한인데 통합 관제가 1개소만 보인다 —
   * 헤더 선택기·이상 탐지 순위표·알람·리포트가 전부 이 쿼리 하나를 읽는다.
   */
  it('시스템 관리자로 되돌아오면 좁혀 둔 범위가 따라오지 않는다', () => {
    stub.pathname = '/timeseries';
    stub.search = 'site=S-02&scope=site';
    stub.role = 'site';

    const view = render(<Probe />);
    stub.role = 'system';
    view.rerender(<Probe />);

    /* `/`(통합 관제) — 뒤에 쿼리가 오거나 아무것도 오지 않는다 */
    expect(movedTo()).toMatch(/^\/(\?|$)/);
    expect(movedTo()).not.toContain('scope=');
    expect(movedTo()).not.toContain('municipality=');
  });

  /**
   * **새로고침은 전환이 아니다.** 역할이 localStorage에 남아 있어 다시 들어온 것뿐인데
   * 여기서 옮기면 사업장 사용자가 새로고침할 때마다 보던 화면을 잃는다.
   */
  it('새로고침만으로는 옮기지 않는다', () => {
    stub.pathname = '/timeseries';
    stub.search = 'site=S-02&scope=site';
    stub.role = 'site';

    render(<Probe />);

    expect(movedTo()).toBeNull();
  });

  /**
   * 이미 그 역할의 홈이면 옮길 곳이 없다 — RSC 왕복만 한 번 더 치른다.
   *
   * **경로가 사업장의 홈이어야 뜻이 산다.** 홈이 아닌 경로를 두면 `pathname !== home`이라
   * **가드가 실제로 옮겨** `movedTo()`가 `null`이 아니게 된다 — 통과하더라도 검사하려던 것과
   * 다른 것을 검사하게 된다. 홈이 `/inout`이던 하루 동안 이 줄이 그쪽을 가리켰다.
   *
   * **직전 역할이 그 자리에 있을 수 있어야 한다.** `/overview`는 시스템 관리자도 접근할 수
   * 있어(메뉴에 없을 뿐) 첫 렌더에서 가드가 돌지 않는다 — 사업장 전용 경로를 쓰면 첫 렌더의
   * 되돌림이 섞여 무엇을 재는지 흐려진다.
   */
  it('이미 홈이면 그대로 둔다', () => {
    stub.pathname = '/overview';
    stub.search = 'site=S-02&scope=site';
    stub.role = 'system';

    const view = render(<Probe />);
    stub.role = 'site';
    view.rerender(<Probe />);

    expect(movedTo()).toBeNull();
  });
});


/**
 * **닫힌 주소를 직접 열면 `/403`으로 보낸다** `[사용자 요청 2026-09-15]`.
 *
 * 한때 이 자리가 `replace(home)`이었고 말없이 튕겼다. 그리지 않는 일은 `RoleGate`가 맡고
 * **보내는 일은 여기 하나로 모았다** — 두 곳이 보내면 역할 전환과 겹쳐 경쟁이 된다.
 */
describe('닫힌 화면 — 403으로 보낸다', () => {
  it.each([
    ['site', '/jurisdiction'],
    ['gov', '/wallboard'],
    ['system', '/wallboard'],
  ] as const)('%s 역할로 %s를 직접 열면 403으로 간다', (role, pathname) => {
    stub.pathname = pathname;
    stub.search = '';
    stub.role = role;

    render(<Probe />);

    expect(movedTo()).toBe(`/403?from=${encodeURIComponent(pathname)}`);
  });

  /**
   * **범위 교정이 그 이동을 덮어쓰면 안 된다.** 실측에서 셋 중 셋이 그렇게 막힌 주소로
   * 되돌아왔다 — `withScope(pathname, …)`이 같은 자리로 다시 보내기 때문이다.
   */
  it('범위 교정이 뒤따라 막힌 주소로 되돌리지 않는다', () => {
    stub.pathname = '/jurisdiction';
    stub.search = '';
    stub.role = 'site';

    render(<Probe />);

    expect(stub.replace).toHaveBeenCalledTimes(1);
    expect(movedTo()?.startsWith('/403')).toBe(true);
  });
});

/**
 * **역할 전환이 403보다 먼저다** `[설계 2026-09-16: 리다이렉트 검토]`.
 *
 * 역할을 바꿔 지금 화면이 닫히는 순간, 두 갈래가 같은 effect 안에서 부딪힌다. 순서가
 * 뒤집히면 «전환했더니 403»이 되어 사용자가 무엇을 눌렀는지 알 수 없다.
 */
describe('역할 전환과 닫힌 화면이 겹칠 때 — 홈이 이긴다', () => {
  it('사업장 전용 화면에서 시스템 관리자로 바꾸면 403이 아니라 홈으로 간다', () => {
    /* 사업장 범위가 이미 박힌 주소로 시작한다 — 그래야 마운트 때 범위 교정이 돌지 않는다 */
    stub.pathname = '/inout';
    stub.search = 'site=S-02&scope=site';
    stub.role = 'site';

    const view = render(<Probe />);
    expect(movedTo(), '마운트만으로는 옮기지 않는다').toBeNull();

    stub.role = 'system';
    view.rerender(<Probe />);

    expect(movedTo()?.startsWith('/403')).toBe(false);
    expect(movedTo()?.startsWith('/')).toBe(true);
  });
});
