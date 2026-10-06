import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ADMIN_ACCOUNTS } from '@/entities/user';

/**
 * **역할·계정으로 가리는 규칙은 «감추기»만 한다** `[사용자 지적 2026-09-07]`.
 *
 * 서버는 localStorage를 모르므로 값마다 한 벌씩 그리고 CSS가 고른다(E6 예외). 그런데 고르는
 * 방식이 «보이는 쪽에 `display: block`»이면, 이 규칙이 `@layer utilities` 안이고 특이도가
 * `.flex`(0,1,0)보다 높아(0,2,0) **요소가 선언한 display를 덮는다** — 사이드바 알람 배지가
 * `inline-flex`를 잃어 원 안의 숫자가 왼쪽 위로 밀렸고, 계정 메뉴의 `flex justify-between`은
 * 아예 죽었다.
 *
 * **jsdom은 이 파일을 적용하지 않는다.** 렌더 검사로는 잡을 수 없어 CSS를 직접 읽는다.
 */
const css = readFileSync('src/app/globals.css', 'utf8');

/** `선택자 { 본문 }` 한 덩어리씩 */
const RULES = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({
  selector: selector!.trim(),
  body: body!.trim(),
}));

const TARGETS = ['role-only-', 'admin-only-'];

describe('역할·계정 가시성 규칙', () => {
  it('규칙을 실제로 찾았다 — 못 찾으면 아래 검사가 조용히 통과한다', () => {
    const found = RULES.filter((rule) => TARGETS.some((t) => rule.selector.includes(t)));
    expect(found.length).toBeGreaterThan(0);
  });

  it('display를 세우지 않는다 — 감추기만 한다', () => {
    for (const rule of RULES) {
      if (!TARGETS.some((t) => rule.selector.includes(t))) continue;

      expect(rule.body.replace(/\s+/g, ' '), rule.selector).toBe('display: none;');
    }
  });

  /**
   * 감추는 축(`role-hide-*`)은 처음부터 옳았다 — 함께 못박아 두 축이 갈라지지 않게 한다.
   */
  it('역할 감춤 규칙도 그대로 감추기만 한다', () => {
    for (const rule of RULES) {
      if (!rule.selector.includes('role-hide-')) continue;

      expect(rule.body.replace(/\s+/g, ' '), rule.selector).toBe('display: none;');
    }
  });

  /**
   * **계정을 늘리면 CSS도 함께 늘어야 한다** `[사용자 요청 2026-09-16: 사업장3 추가]`.
   *
   * 계정별 자리는 배열 순서로 클래스를 만든다(`admin-only-${index + 1}`). 그런데 가리는 쪽은
   * **CSS가 계정 키를 손으로 적은 선택자**라, 배열에만 더하면 그 칸이 **어느 계정에서도
   * 감춰지지 않아 모두에게 보인다.**
   *
   * 조용히 깨지는 것이 문제다 — 새 계정의 배지가 0건이면 아무것도 그려지지 않아 눈으로는
   * 멀쩡해 보이고(실제로 `사업장3`이 미확인 0건이라 그랬다), 알람이 생기는 순간 드러난다.
   */
  it('계정마다 감춤·선택 규칙이 둘 다 있다', () => {
    for (const [index, account] of ADMIN_ACCOUNTS.entries()) {
      const slot = index + 1;

      expect(
        css.includes(`:root:not([data-admin='${account.key}']) .admin-only-${slot}`),
        `${account.label}(${account.key})의 감춤 규칙이 없다`,
      ).toBe(true);

      expect(
        css.includes(`:root:not([data-role='site']) .admin-only-${slot}`),
        `${account.label}(${account.key})이 사업장 역할 밖에서 감춰지지 않는다`,
      ).toBe(true);

      expect(
        css.includes(`:root[data-admin='${account.key}'] .admin-pick-${slot}`),
        `${account.label}(${account.key})의 «고른 칸» 규칙이 없다`,
      ).toBe(true);
    }
  });

  /** 반대로 **쓰지 않는 칸**이 남아 있으면 지운 계정의 규칙이 유령으로 남은 것이다 */
  it('계정 수보다 많은 칸이 CSS에 남아 있지 않다', () => {
    const slots = [...css.matchAll(/\.admin-only-(\d+)/g)].map(([, n]) => Number(n));

    expect(Math.max(...slots)).toBe(ADMIN_ACCOUNTS.length);
  });
});
