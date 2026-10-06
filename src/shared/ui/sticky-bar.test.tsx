// @vitest-environment jsdom
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { STICKY_BAR_QUERY, StickyBar } from './sticky-bar';

/**
 * **띠는 `lg` 이상에서만 붙는다** `[사용자 결정 2026-09-18]`.
 *
 * 붙여 두면 **390px에서 헤더와 함께 258px(화면의 31%)을 상시 가져간다** — 탭 10개가 4행으로
 * 접히기 때문이다(실측). 해제는 **세 가지를 함께** 가르는 일이고, 셋 중 하나만 빠지면
 * **그 폭을 열어 보지 않으면 눈에 띄지 않는 반쪽 상태**가 된다.
 *
 * | 빠지면 | 무슨 일이 |
 * |---|---|
 * | `lg:sticky` | 258px 상시 점유가 돌아온다 |
 * | 관측기 가드 | 화면 밖으로 올라가는 띠에 음수 여백이 켜져 아래 내용이 8px 튄다 |
 * | 변수 가드 | `/anomaly`의 스크롤 목적지가 200px 아래에서 멈춘다(실측) |
 *
 * 그래서 셋을 각각 잠근다. `jsdom`이 레이아웃을 재 주지 않으므로 **«몇 px인가»가 아니라
 * «켜졌는가»**를 본다.
 */
const observed = { io: 0 };

function stubEnvironment(wide: boolean) {
  observed.io = 0;

  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: wide,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));

  /* 표식이 **화면 밖으로 나갔다**고 알린다 — 좁은 화면에서도 «붙었다»가 켜지는지 보려는 것이다 */
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
        observed.io += 1;
        cb([{ isIntersecting: false }]);
      }
      observe() {}
      disconnect() {}
    },
  );

  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private cb: () => void) {
        this.cb();
      }
      observe() {
        this.cb();
      }
      disconnect() {}
    },
  );
}

/** 변수는 띠의 **부모**에 실린다(`host = el.parentElement`) — 구역 `<section>`이 그 자리다 */
function draw(wide: boolean) {
  stubEnvironment(wide);
  const { container } = render(
    <section>
      <StickyBar>
        <p>구역 제목</p>
      </StickyBar>
    </section>,
  );
  const host = container.querySelector('section')!;
  const bar = host.querySelector('[data-stuck], .space-y-3')!;
  return { host, bar };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('StickyBar — 넓은 화면', () => {
  it('붙었다고 표시한다', () => {
    expect(draw(true).bar.getAttribute('data-stuck')).toBe('true');
  });

  /** 같은 구역의 지도 레일이 이 값만큼 내려간다 — jsdom은 높이를 0으로 재므로 «실렸는가»만 본다 */
  it('띠 높이를 부모에 내보낸다', () => {
    expect(draw(true).host.style.getPropertyValue('--sticky-bar-h')).toBe('0px');
  });
});

describe('StickyBar — 좁은 화면', () => {
  /**
   * 표식이 «밖»이라고 알려도 켜지지 않아야 한다. 켜지면 **화면 밖으로 올라가는 띠**에
   * 음수 여백·패딩이 붙어 아래 내용이 8px 튀고 흰 띠가 스치듯 지나간다.
   */
  it('붙었다고 표시하지 않는다', () => {
    expect(draw(false).bar.getAttribute('data-stuck')).toBeNull();
  });

  /**
   * **`--sticky-bar-h`를 내보내지 않는다.** 소비처 셋 중 `anomaly-view`의 `scroll-mt`만
   * 뷰포트 접두사가 없어 이 폭에도 듣는다 — 내보내면 붙지도 않은 띠 높이가 더해져
   * 「상세」의 스크롤 목적지가 그만큼 아래에서 멈춘다(실측 200px).
   */
  it('띠 높이를 내보내지 않는다', () => {
    expect(draw(false).host.style.getPropertyValue('--sticky-bar-h')).toBe('');
  });

  /** 클래스만 가리고 관측기는 켜 두는 «절반만 고친» 판본을 막는다 */
  it('관측기를 아예 만들지 않는다', () => {
    draw(false);
    expect(observed.io).toBe(0);
  });
});

/**
 * **넓게 열었다가 좁히는 길**이 남는다 — 창을 줄이거나 태블릿을 돌릴 때다.
 *
 * 그 길에서는 `stuck`이 이미 `true`이고, 폭이 좁아져도 그 상태는 스스로 돌아가지 않는다
 * (관측기가 그때 해지되므로 «다시 안 붙었다»고 알려 줄 사람이 없다). 그래서 겉면이
 * `stuck` 하나만 보면 **붙지도 않은 띠에 음수 여백이 남는다.**
 *
 * `useEffect`에서 `setStuck(false)`로 되돌리지 않는 이유는 `react-hooks/set-state-in-effect`가
 * 막고, 파생으로 읽으면 그럴 필요가 없기 때문이다 — 그 파생이 살아 있는지를 여기서 본다.
 */
describe('StickyBar — 넓다가 좁아질 때', () => {
  it('붙었던 표시가 남지 않는다', () => {
    let wide = true;
    const listeners: (() => void)[] = [];

    observed.io = 0;
    vi.stubGlobal('matchMedia', (query: string) => ({
      get matches() {
        return wide;
      },
      media: query,
      addEventListener: (_: string, fn: () => void) => listeners.push(fn),
      removeEventListener: () => {},
    }));
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
          observed.io += 1;
          cb([{ isIntersecting: false }]);
        }
        observe() {}
        disconnect() {}
      },
    );
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private cb: () => void) {
          this.cb();
        }
        observe() {
          this.cb();
        }
        disconnect() {}
      },
    );

    const { container } = render(
      <section>
        <StickyBar>
          <p>구역 제목</p>
        </StickyBar>
      </section>,
    );
    const bar = () => container.querySelector('section > div + div')!;
    expect(bar().getAttribute('data-stuck')).toBe('true');

    wide = false;
    act(() => listeners.forEach((fn) => fn()));

    expect(bar().getAttribute('data-stuck')).toBeNull();
    expect(container.querySelector('section')!.style.getPropertyValue('--sticky-bar-h')).toBe('');
  });
});

/**
 * 붙는 폭을 **세 곳이 같은 값으로** 봐야 한다 — 이 상수 · `lg:` 클래스 · 읽는 쪽의 `,0px`.
 * 레이아웃과 CSS 변수 계약은 jsdom이 재 주지 않으므로 소스로 잠근다
 * (`table-scroll.test.ts`가 세운 선례).
 */
describe('붙는 폭이 한 값이다', () => {
  const SOURCE = 'src/shared/ui/sticky-bar.tsx';
  const source = readFileSync(SOURCE, 'utf8');

  /** 주석이 옛 배치를 설명하며 `sticky`를 그대로 적으므로 걷어내고 훑는다 */
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

  /** Tailwind 기본값 — 상수의 `rem`이 어느 접두사인지 정한다 */
  const TAILWIND_STEPS: Record<string, string> = {
    '40rem': 'sm',
    '48rem': 'md',
    '64rem': 'lg',
    '80rem': 'xl',
  };
  const width = STICKY_BAR_QUERY.match(/min-width:\s*([\d.]+rem)/)?.[1];
  const prefix = width ? TAILWIND_STEPS[width] : undefined;

  it('파일을 실제로 읽었다', () => {
    expect(code).toContain('export function StickyBar');
  });

  it('상수가 Tailwind 단 위에 놓여 있다', () => {
    expect(prefix, `${STICKY_BAR_QUERY}는 Tailwind 기본 단이 아니다`).toBeDefined();
  });

  it('클래스가 그 단의 접두사를 쓴다', () => {
    expect(code).toContain(`${prefix}:sticky`);
    expect(code).toContain(`${prefix}:top-[var(--header-h)]`);
  });

  /** 접두사 없는 `sticky`가 남으면 좁은 화면에서도 붙는다 */
  it('접두사 없이 붙지 않는다', () => {
    expect(code).not.toMatch(/(?<![\w:-])sticky\b/);
  });

  /**
   * **내보내지 않는 쪽과 읽는 쪽의 계약이다.** 기본값이 없으면 속성을 걷은 폭에서
   * `calc()` 전체가 무효가 되어, 지도 레일이 헤더 뒤로 들어간다.
   */
  it('읽는 쪽이 모두 `,0px` 기본값을 든다', () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
          const text = readFileSync(full, 'utf8');
          if (/var\(--sticky-bar-h(?!,\s*0px)/.test(text)) offenders.push(full);
        }
      }
    };
    walk('src');
    expect(offenders).toEqual([]);
  });
});
