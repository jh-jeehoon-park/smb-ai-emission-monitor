// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ROLES, canRoleSee } from '@/entities/user';
import { NAV_ITEMS } from './config/navigation';
import { RoleGate } from './ui/role-gate';

/**
 * 403을 **첫 페인트부터** 가르는지 잠근다.
 *
 * 전에는 `useRoleRouteGuard`가 렌더 뒤에 홈으로 옮겼고, 실측하면 권한 없는 본문이
 * **1.61~11.75초** 그대로 보였다. 보내는 일만으로는 그 상태와 같다 — 클라이언트 이동은
 * 시간이 걸리고 **그동안 본문이 보인다.**
 *
 * **이 부품은 그리지 않는 일만 한다.** 보내는 것은 가드가 맡는다 — 둘이 함께 보내면 역할
 * 전환과 겹쳐 «마지막 `replace`가 이기는» 경쟁이 된다 `[설계 2026-09-16: 리다이렉트 검토]`. 여기서는
 * **보내지 않는다는 것까지** 단정한다.
 *
 * jsdom은 `globals.css`를 읽지 않으므로 «가려졌는가»는 **클래스 문자열로** 검사한다.
 * 실제로 감춰지는지는 `role-visibility.test.ts`가 CSS 쪽에서 따로 지킨다.
 */
const mockPath = vi.hoisted(() => ({ current: '/' }));
const mockRole = vi.hoisted(() => ({ current: 'system' as string }));
const replace = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  usePathname: () => mockPath.current,
  useRouter: () => ({ replace }),
}));

vi.mock('@/entities/user/ui/role-context', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useRole: () => ({ role: mockRole.current, adminAccount: 'admin-1' }),
}));

function draw(path: string, role: string) {
  mockPath.current = path;
  mockRole.current = role;
  return render(
    <RoleGate>
      <p>본문</p>
    </RoleGate>,
  );
}

const gate = () => document.querySelector('[data-role-gated]');
const sentTo = () => (replace.mock.calls.at(-1)?.[0] as string | undefined) ?? null;

beforeEach(() => replace.mockClear());

describe('RoleGate — 세 역할에게 열린 화면', () => {
  /** 15개 중 11개가 여기 해당한다. 트리가 지금과 완전히 같아야 한다(A2) */
  it('감싸지도 않고 보내지도 않는다', () => {
    draw('/timeseries', 'site');
    expect(screen.getByText('본문')).toBeInTheDocument();
    expect(gate()).toBeNull();
    expect(sentTo()).toBeNull();
  });
});

describe('RoleGate — 닫힌 화면', () => {
  /**
   * **현황판이 이 검사의 핵심이다.** `AppShell`이 그 경로에서 크롬을 걷으며 **먼저**
   * 반환하므로, 본문 쪽에만 얹으면 현황판은 하나도 고쳐지지 않는다 — 노출을 실측한
   * 세 경우 중 둘이 이 경로였다.
   */
  it('막힌 역할에서는 본문이 DOM에서 사라진다', () => {
    draw('/wallboard', 'gov');
    expect(screen.queryByText('본문')).toBeNull();
  });

  /**
   * **여기서 보내면 안 된다.** 가드도 같은 순간에 보내므로 둘이 경쟁하고, 역할 전환 때
   * «홈으로»와 «403으로»가 마지막 `replace` 순서로 갈린다 — 실측에서는 홈이 이겼지만
   * 그것은 자식 effect가 부모보다 먼저 도는 우연이었다.
   */
  it('막힌 역할에서도 스스로 보내지 않는다 — 이동은 가드의 일이다', () => {
    draw('/wallboard', 'gov');
    expect(sentTo()).toBeNull();
  });

  it('허용 역할에서는 본문이 그대로이고 보내지 않는다', () => {
    draw('/wallboard', 'site');
    expect(screen.getByText('본문')).toBeInTheDocument();
    expect(sentTo()).toBeNull();
  });

  /** 하이드레이션 전에도 가려야 한다 — 래퍼가 막힌 역할의 `role-hide-*`를 갖는다 */
  it('막히지 않은 역할로 열어도 래퍼가 남아 CSS가 가릴 수 있다', () => {
    draw('/wallboard', 'site');
    const wrapper = gate();
    expect(wrapper).not.toBeNull();
    expect(wrapper!.className).toContain('contents');
  });
});

describe('RoleGate — 메뉴에 없는 경로', () => {
  /**
   * `canRoleSee`는 미등재를 **전 역할 차단**으로 읽는다. 그대로 쓰면 목록 밖의 주소가
   * 전부 403이 되는데, 없는 주소는 404가 받을 일이다.
   */
  it('가르지도 보내지도 않는다', () => {
    draw('/nosuchpage', 'site');
    expect(screen.getByText('본문')).toBeInTheDocument();
    expect(sentTo()).toBeNull();
  });
});

describe('닫힌 화면은 전부 막힌 역할이 둘이다', () => {
  /**
   * `/403`이 **역할마다 다른 홈 버튼**을 그리는 근거를 값으로 잠근다 — 막힌 역할 둘의
   * 첫 화면이 서로 다르다(현황판은 시스템 관리자 `/`와 기초지자체 `/jurisdiction`).
   */
  it('그래서 403이 역할마다 다른 버튼을 그린다', () => {
    const closed = NAV_ITEMS.map((item) => ({
      href: item.href,
      blocked: ROLES.filter((role) => !canRoleSee(item.screenId, role)),
    })).filter((x) => x.blocked.length > 0);

    expect(closed.length).toBeGreaterThan(0);
    for (const { href, blocked } of closed) {
      expect(blocked.length, href).toBe(2);
    }
  });
});
