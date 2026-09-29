// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ROLES } from '@/entities/user';
import { LimitSettingsProvider } from '@/features/discharge-limit-settings';
import { ProcessSettingsProvider } from '@/features/process-settings';
import { ProvisioningProvider } from '@/features/site-provisioning';
import { SETTINGS_TABS, SETTINGS_TAB_ROLES } from './config/constants';
import { SettingsView } from './ui/settings-view';

/**
 * **서버가 그린 것과 클라이언트가 그린 것이 같아야 한다** `[설계 2026-09-16: 하이드레이션 불일치 수정]`.
 *
 * 이 화면이 `useRole()`로 탭을 거르고 그 첫 탭을 URL 기본값으로 삼던 때, 서버는 역할을 몰라
 * 기본 역할(시스템 관리자)로 **세 탭과 «사업장 분류» 패널**을 그렸고 사업장 사용자의 클라이언트는
 * **«방류 기준치» 하나**를 그렸다 — 트리가 달라 하이드레이션이 깨졌다(실측: `/settings`에서만
 * 예외가 났고, React가 트리를 다시 그리며 루트의 `<script>`까지 건드려 경고를 하나 더 냈다).
 *
 * 그래서 여기서 잠그는 것은 «무엇이 보이는가»가 아니라 **«역할이 달라도 같은 트리를 그리는가»**다.
 * 보이는 것을 고르는 일은 CSS(`data-role`)가 하고 jsdom은 그 스타일시트를 읽지 않으므로,
 * 눈에 보이는 결과는 브라우저 실측이 따로 확인한다.
 */
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(search.current),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/settings',
}));

const search = { current: '' };

/**
 * 공정 폼이 장치의 채널 목록을 조회한다. **조회를 켜지 않는다** — 검사가 네트워크에 닿으면 결과가
 * 서버 상태에 따라 갈린다. 꺼 두면 늘 «알려진 목록»으로 그려진다.
 */
const queryClient = new QueryClient({ defaultOptions: { queries: { enabled: false } } });

/** 설정 화면은 저장소 위에서만 산다 — 감싸지 않으면 훅이 던진다 */
function Wrapped({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <LimitSettingsProvider>
        <ProcessSettingsProvider>
          <ProvisioningProvider>{children}</ProvisioningProvider>
        </ProcessSettingsProvider>
      </LimitSettingsProvider>
    </QueryClientProvider>
  );
}

/**
 * `useId`가 붙인 번호를 지운다.
 *
 * **이 번호는 트리의 차이가 아니다.** React가 트리 위치에서 만들고 한 파일 안에서 여러 번
 * 그리면 계속 커지기만 한다 — 서버와 클라이언트는 같은 위치에서 같은 값을 받으므로
 * 하이드레이션과 무관하다. 지우지 않으면 «같은 트리인가»를 묻는 단정이 번호만 비교하게 된다.
 */
function stableIds(html: string): string {
  return html.replace(/_r_[0-9a-z]+_/g, '_id_');
}

/** 역할은 DOM의 `data-role`이 정한다 — 화면은 그것을 읽지 않아야 한다 */
function draw(role: string, query = '') {
  search.current = query;
  document.documentElement.setAttribute('data-role', role);
  return render(
    <Wrapped>
      <SettingsView />
    </Wrapped>,
  );
}

describe('사업장 설정 — 역할로 분기하지 않는다', () => {
  /**
   * **이것이 하이드레이션 불일치를 막는 단정이다.** 역할이 무엇이든 같은 마크업이어야
   * 서버(역할을 모름)와 클라이언트(역할을 앎)가 어긋나지 않는다.
   */
  it('세 역할이 같은 트리를 그린다', () => {
    const drawn = ROLES.map((role) => {
      const html = draw(role).container.innerHTML;
      /* 한 `it` 안에서 여러 번 그리므로 손으로 걷는다 — 자동 정리는 테스트 사이에만 돈다 */
      cleanup();
      return stableIds(html);
    });
    for (const html of drawn) expect(html).toBe(drawn[0]);
  });

  /*
   * **탭 줄이 왼쪽 목차가 됐다** `[사용자 요청 2026-09-29: 사업장 설정 UI/UX 개편]`. 옛 검사는
   * 세그먼트(`[role=group]`)가 역할 수만큼 있는지를 셌다 — 목차는 **다루는 탭이 둘 이상인
   * 역할에게만** 선다(한 줄짜리 목차는 누를 곳이 없는 메뉴다). 성질은 그대로다: 마크업은 역할과
   * 무관하고 고르는 일은 CSS가 한다.
   */
  it('목차 단추가 마크업에 있다 — 고르는 일은 CSS가 한다', () => {
    const { container } = draw('site');
    /*
     * **패널 제목이 아니라 목차 단추를 센다.** 제목은 같은 글자를 갖고 있어서, 여기서 `getAllByText`로
     * 훑으면 목차가 사라져도 통과한다 — 실제로 그렇게 통과하는 것을 보고 좁혔다.
     */
    const labels = [...container.querySelectorAll('nav[aria-label="설정 항목"] button')].map(
      (button) => button.textContent ?? '',
    );

    /* 「사업장 분류」였다 — 배출량 원시값·방류 경로까지 담으며 이름이 넓어졌다 `[2026-09-28]` */
    for (const option of ['사업장 규제정보', '방류 기준치', '공정 구성', '계측 구성', '설비 전력 계측']) {
      expect(labels.some((label) => label.includes(option)), option).toBe(true);
    }
  });

  /** 목차는 탭이 둘 이상인 역할에게만 서고, 각자 `role-only-*`를 단다 */
  it('목차가 여러 탭을 다루는 역할에게만 선다', () => {
    const { container } = draw('site');
    const navs = [...container.querySelectorAll('nav[aria-label="설정 항목"]')];
    const withNav = ROLES.filter(
      (role) => SETTINGS_TABS.filter((tab) => SETTINGS_TAB_ROLES[tab].includes(role)).length > 1,
    );

    expect(navs).toHaveLength(withNav.length);
    for (const role of withNav) {
      expect(navs.some((nav) => nav.className.includes(`role-only-${role}`)), role).toBe(true);
    }
  });

  /** 목차 한 줄에 **지금 상태**가 붙는다 — 들어가 보지 않고도 어느 칸이 비었는지 안다 */
  it('목차 항목이 상태 한 줄을 갖는다', () => {
    const { container } = draw('system');
    const text = container.querySelector('nav[aria-label="설정 항목"]')?.textContent ?? '';

    expect(text).toContain('0 / 3 입력');
    expect(text).toContain('보유 8');
  });
});

describe('사업장 설정 — 닫힌 탭을 주소로 넣어도 자기 탭으로 떨어진다', () => {
  /**
   * 한때 `useQueryState`의 허용 목록이 하던 일이다. 역할 판단이 `effectiveTab`으로 옮겨 갔으니
   * 그 성질이 살아 있는지 마크업으로 확인한다 — 잃으면 사업장이 관리자 전용 패널을 보게 된다.
   */
  it('`?tab=process`로 들어오면 공정 구성 패널이 사업장·기초지자체에게 가려진다', () => {
    const { container } = draw('site', 'tab=process');

    const process = [...container.querySelectorAll('h2')].find(
      (h) => h.textContent?.trim() === '공정 구성',
    );
    expect(process, '공정 구성 패널이 마크업에 있어야 한다').toBeTruthy();

    const wrapper = process!.closest('[class*="role-hide-"]');
    expect(wrapper?.className).toContain('role-hide-site');
    expect(wrapper?.className).toContain('role-hide-gov');
    expect(wrapper?.className).not.toContain('role-hide-system');
  });

  /**
   * 그 반대편 — 닫힌 탭으로 들어온 역할은 **자기 탭 패널을 그대로 받는다.** 폴백이 죽으면
   * 사업장 화면에 패널이 하나도 남지 않는다.
   */
  it('`?tab=process`여도 방류 기준치 패널이 사업장에게 열려 있다', () => {
    const { container } = draw('site', 'tab=process');

    const limits = [...container.querySelectorAll('h2')].find(
      (h) => h.textContent?.trim() === '방류 기준치',
    );
    expect(limits, '방류 기준치 패널이 마크업에 있어야 한다').toBeTruthy();

    const wrapper = limits!.closest('[class*="role-hide-"]');
    expect(wrapper?.className ?? '').not.toContain('role-hide-site');
  });

  /** 모든 역할이 적어도 한 탭은 갖는다 — 아니면 `effectiveTab`의 폴백이 거짓말을 한다 */
  it('역할마다 다루는 탭이 하나 이상이다', () => {
    for (const role of ROLES) {
      const mine = SETTINGS_TABS.filter((tab) => SETTINGS_TAB_ROLES[tab].includes(role));
      expect(mine.length, role).toBeGreaterThan(0);
    }
  });
});

/**
 * **방류 기준치는 «입력»과 «적용 결과» 두 벌을 그린다**
 * `[사용자 요청 2026-09-28: 설정 재설계 검토]`.
 *
 * 세 역할이 같은 표를 직접 고치던 판본은 마지막에 저장한 쪽이 이겼고, 저장소에 사업장 축이
 * 없어 한 사업장에 넣은 값이 같은 분류의 다른 사업장에도 적용됐다(실측). 입력은 한 주체가
 * 맡고 나머지는 적용 결과를 본다.
 *
 * **둘 다 마크업에 있어야 한다** — `useRole()`로 갈랐다가 하이드레이션이 두 번 깨졌다.
 */
describe('방류 기준치 — 입력과 조회를 가른다', () => {
  it('두 벌이 다 마크업에 있고 각자 role-hide를 단다', () => {
    const { container } = draw('site', '?tab=limits');

    const editor = container.querySelector('.role-hide-site.role-hide-gov');
    const applied = container.querySelector('.role-hide-system');

    expect(editor, '입력 칸은 사업장·기초지자체에게 가려진다').toBeTruthy();
    expect(applied, '적용 결과는 시스템 관리자에게 가려진다').toBeTruthy();
  });

  /** 적용 결과 표는 **법정 점검 5항목**을 그대로 적는다 — SS는 계측이 없어도 자리를 지킨다 */
  it('적용 결과 표가 5항목을 적는다', () => {
    const { container } = draw('site', '?tab=limits');
    const text = container.textContent ?? '';

    for (const label of ['TOC', 'SS', 'T-N', 'T-P', 'pH']) {
      expect(text, label).toContain(label);
    }
  });

  /**
   * **분류가 없으면 입력 칸을 열지 않는다.** 열려 있던 판본은 규모 세그먼트가
   * 「2,000㎥ 이상」으로 선택된 채 떠서, 넣은 값이 **다른 시트에 저장돼** 영영 읽히지
   * 않았다(실측).
   */
  it('분류가 없으면 입력 칸 대신 무엇을 해야 하는지 적는다', () => {
    const { container } = draw('system', '?tab=limits');
    const text = container.textContent ?? '';

    /* 탭이 「사업장 규제정보」로 넓어진 뒤에도 이 문구만 옛 이름이라 없는 탭을 가리켰다 `[2026-09-29]` */
    expect(text).toContain('시스템 관리자가 「사업장 규제정보」에서 먼저 골라야 합니다');
    /* 막혀 있다는 말만이 아니라 **풀러 가는 단추**가 있다 */
    expect(text).toContain('사업장 규제정보 입력');
    /* 지역구분 행이 있으면 입력 표가 열린 것이다 */
    expect(container.querySelector('[aria-label="1일 폐수배출량 규모"]')).toBeNull();
  });
});
