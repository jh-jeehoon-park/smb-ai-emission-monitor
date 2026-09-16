// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ROLES } from '@/entities/user';
import { LimitSettingsProvider } from '@/features/discharge-limit-settings';
import { ProcessSettingsProvider } from '@/features/process-settings';
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

/** 설정 화면은 두 저장소 위에서만 산다 — 감싸지 않으면 훅이 던진다 */
function Wrapped({ children }: { children: ReactNode }) {
  return (
    <LimitSettingsProvider>
      <ProcessSettingsProvider>{children}</ProcessSettingsProvider>
    </LimitSettingsProvider>
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

  it('탭 단추가 셋 다 마크업에 있다 — 고르는 일은 CSS가 한다', () => {
    const { container } = draw('site');
    /*
     * **패널 제목이 아니라 탭 단추를 센다.** 제목은 같은 글자를 갖고 있어서, 여기서 `getAllByText`로
     * 훑으면 탭 목록이 한 역할 것만 남아도 통과한다 — 실제로 그렇게 통과하는 것을 보고 좁혔다.
     */
    const labels = [...container.querySelectorAll('[role="group"][aria-label="설정 항목"] button')]
      .map((button) => button.textContent?.trim())
      .filter(Boolean);

    for (const option of ['사업장 분류', '방류 기준치', '공정 구성']) {
      expect(labels, option).toContain(option);
    }
  });

  /** 역할마다 한 벌씩 그려야 CSS가 고를 수 있다 */
  it('설정 항목 묶음이 역할 수만큼 있고 각자 `role-only-*`를 단다', () => {
    const { container } = draw('site');
    const groups = [...container.querySelectorAll('[role="group"][aria-label="설정 항목"]')];
    expect(groups).toHaveLength(ROLES.length);
    for (const role of ROLES) {
      expect(groups.some((g) => g.className.includes(`role-only-${role}`)), role).toBe(true);
    }
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
