import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * **헤더는 어느 폭에서도 한 줄이다** `[사용자 요청 2026-09-18: 모바일 헤더 반응형]`.
 *
 * 한때 우측에 일곱이 있었고 전부 고정폭이라, 폭이 모자라면 `flex-wrap`이 아래로 접었다 —
 * 실측 **390px에서 3줄 167px**(화면의 20%) · **1024px에서도 2줄 94px**. `sticky`라 그 높이를
 * 모든 화면에서 상시 가져갔다.
 *
 * **레이아웃은 jsdom이 재 주지 않는다.** 그래서 «몇 px인가»가 아니라 **«접히지 않는다»는
 * 성질**을 소스로 잠근다 — `table-scroll.test.ts`가 세운 선례와 같은 이유·같은 짜임이다.
 * 실제 높이는 브라우저 실측이 맡는다.
 */
const SHELL = 'src/widgets/app-shell/ui/app-shell.tsx';
const source = readFileSync(SHELL, 'utf8');

/**
 * 주석은 세지 않는다. **옛 배치를 설명하는 글이 그대로 남아 있어서**다 — 「한때 `flex-wrap`
 * 이었다」·「사업장 선택 210」처럼 걷어낸 것의 이름이 근거로 적혀 있고, 그대로 훑으면
 * 설명한 죄로 걸린다.
 */
function withoutComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
}

/** `<header>`부터 그 닫는 태그까지 — 기둥·본문의 마크업이 섞여 들어오지 않게 자른다 */
function headerMarkup(text: string): string {
  const open = text.indexOf('<header');
  const close = text.indexOf('</header>');
  expect(open, `${SHELL}에 <header>가 없다`).toBeGreaterThan(-1);
  expect(close).toBeGreaterThan(open);
  return withoutComments(text.slice(open, close));
}

describe('셸 헤더 — 한 줄', () => {
  /** 파일을 못 읽으면 아래 검사가 전부 «없으니 통과»가 된다 */
  it('셸 소스를 실제로 읽었다', () => {
    expect(source).toContain('<header');
  });

  /**
   * **이 한 줄이 변경의 실체다.** 되돌리면 좁은 화면에서 다시 접히는데, 눈으로는 «헤더가 좀
   * 두껍네» 정도라 그냥 지나간다.
   */
  it('헤더 행이 접히지 않는다', () => {
    expect(headerMarkup(source)).not.toMatch(/\bflex-wrap\b/);
  });

  /**
   * 시계·테마·시연 안내는 계정 메뉴로 갔고 **돌아오지 않는다** — 셋이 190px이라 좁은 화면의
   * 합(358px)을 혼자서도 넘긴다.
   *
   * 사업장 선택은 이 목록에 **없다**: `lg` 이상에서 돌아왔다(아래 `한 자리에만` 참조).
   */
  it.each(['LiveClock', 'ThemeToggle', 'DemoNotice'])(
    '헤더가 <%s />를 직접 그리지 않는다',
    (name) => {
      expect(headerMarkup(source)).not.toContain(`<${name}`);
    },
  );

  /** 좁은 화면에서 헤더의 조작은 이 셋뿐이다 */
  it('헤더 우측은 수신 점·알림·계정을 담는다', () => {
    const header = headerMarkup(source);
    for (const name of ['ReceiveIndicator', 'AlarmMenu', 'ProfileMenu']) {
      expect(header, name).toContain(`<${name}`);
    }
  });
});

/**
 * **사업장 선택은 한 자리에만 보인다** `[사용자 요청 2026-09-18: PC는 헤더, Mobile 반응형은
 * 사이드바]`.
 *
 * 마크업은 **두 곳에 있고 CSS가 고른다** — 폭을 렌더 중에 물으면 서버가 모르는 값이라
 * 하이드레이션이 깨지므로, 이 저장소가 역할 가림에 쓰는 것과 같은 짜임이다.
 *
 * 그래서 위험은 «없다»가 아니라 **«둘 다 보인다»**다. `lg` 이상에서 기둥의 `lg:hidden`이
 * 빠지면 선택기가 두 개 보이고, 그 상태는 **1024px 이상에서만** 드러나 좁은 화면만 확인하면
 * 지나간다. 두 클래스가 짝을 이루는지 여기서 못박는다.
 */
describe('사업장 선택 — 한 자리에만', () => {
  const header = headerMarkup(source);
  const column = withoutComments(source.slice(source.indexOf('function NavColumn')));

  it('헤더의 선택기는 `lg` 이상에서만 보인다', () => {
    const tag = header.match(/<SiteSelector[^/]*\/>/)?.[0];
    expect(tag, '헤더에 <SiteSelector />가 없다').toBeDefined();
    expect(tag).toContain('hidden');
    expect(tag).toContain('lg:inline-flex');
  });

  it('기둥의 선택기는 `lg` 미만에서만 보인다', () => {
    expect(column).toContain('<SiteSelector');
    /* 래퍼가 감춰야 한다 — 부품만 감추면 여백이 빈 틈으로 남는다 */
    expect(column).toMatch(/role-hide-site[^"]*lg:hidden|lg:hidden[^"]*role-hide-site/);
  });

  /**
   * 사업장 역할은 자사 1개소라 **어느 자리에서도** 고를 것이 없다.
   *
   * 가리는 쪽은 부품이 스스로 들고 있어(`site-selector.tsx`의 루트) 두 자리가 함께 따라온다 —
   * 기둥이 래퍼에 한 번 더 거는 것은 **여백 때문**이고, 그 둘을 헷갈리지 않게 여기 적는다.
   * 부품에서 그 클래스가 빠지면 헤더 쪽이 조용히 드러난다.
   */
  it('가리는 규칙은 부품이 들고 있다', () => {
    /* 주석에도 그 클래스 이름이 근거로 적혀 있어, 걷어내지 않으면 «설명한 죄»로 통과한다 */
    const part = withoutComments(
      readFileSync('src/features/site-selection/ui/site-selector.tsx', 'utf8'),
    );
    expect(part).toContain('role-hide-site');
  });
});
