// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { useMediaQuery } from './use-media-query';

/**
 * **서버는 화면 폭을 모른다** `[사용자 결정 2026-09-17]`.
 *
 * 이 훅의 값으로 «무거운 것을 얹을지»를 정한다(로그인 배경 영상 65.2MB). 서버가 데스크톱으로
 * 짐작해 그리면 ① 하이드레이션이 어긋나고 ② 모바일에서 걷어낼 때는 이미 내려받은 뒤다.
 * 그래서 **모른다는 쪽(좁은 화면)이 기본값**이어야 한다.
 */
/** 실제로 쓰는 값 — 이 훅은 질의를 인자로 받으므로 검사도 하나를 골라 넘긴다 */
const QUERY = '(min-width: 48rem)';

let listeners: Array<() => void> = [];

function stubMatchMedia(matches: boolean) {
  listeners = [];
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches,
    media: query,
    addEventListener: (_: string, fn: () => void) => listeners.push(fn),
    removeEventListener: (_: string, fn: () => void) => {
      listeners = listeners.filter((l) => l !== fn);
    },
  }));
}

function Probe() {
  return <span data-testid="v">{String(useMediaQuery(QUERY))}</span>;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('useMediaQuery', () => {
  it('넓은 화면이면 참이다', () => {
    stubMatchMedia(true);
    expect(render(<Probe />).getByTestId('v').textContent).toBe('true');
  });

  it('좁은 화면이면 거짓이다', () => {
    stubMatchMedia(false);
    expect(render(<Probe />).getByTestId('v').textContent).toBe('false');
  });

  /** 폭이 바뀌는 것을 실제로 듣는다 — 창을 넓히거나 태블릿을 돌릴 때 따라와야 한다 */
  it('폭이 바뀌면 따라간다', () => {
    let wide = false;
    listeners = [];
    vi.stubGlobal('matchMedia', (query: string) => ({
      get matches() {
        return wide;
      },
      media: query,
      addEventListener: (_: string, fn: () => void) => listeners.push(fn),
      removeEventListener: () => {},
    }));

    const { getByTestId } = render(<Probe />);
    expect(getByTestId('v').textContent).toBe('false');

    wide = true;
    act(() => listeners.forEach((fn) => fn()));
    expect(getByTestId('v').textContent).toBe('true');
  });

  /** 떠날 때 구독을 놓는다 — 화면을 여닫을 때마다 청취자가 쌓이면 안 된다 */
  it('언마운트하면 구독을 해지한다', () => {
    stubMatchMedia(false);
    const { unmount } = render(<Probe />);
    expect(listeners.length).toBe(1);

    unmount();
    expect(listeners.length).toBe(0);
  });
});

/**
 * **서버가 그리는 값이 이 훅의 핵심이다.**
 *
 * jsdom 렌더는 늘 클라이언트 경로라 이 성질을 건드리지 않는다 — 서버 스냅샷을 `true`로
 * 바꿔도 위 검사들이 전부 통과한다(실제로 확인했다). 그래서 서버 렌더를 직접 돌린다.
 *
 * 이 값이 `true`가 되면 **서버 HTML에 `<video>`가 실려** ① 클라이언트 첫 렌더와 어긋나
 * 하이드레이션이 깨지고 ② 모바일이 65.2MB를 내려받기 시작한다. 이 검사가 그 둘을 함께 막는다.
 */
describe('useMediaQuery — 서버에서는 «모른다»', () => {
  it('서버 렌더는 넓은 화면이라고 말하지 않는다', async () => {
    const { renderToString } = await import('react-dom/server');

    /* 서버에는 `window`가 없다 — 있으면 이 검사가 클라이언트 경로를 재게 된다 */
    vi.stubGlobal('matchMedia', undefined);

    expect(renderToString(<Probe />)).toContain('false');
  });
});
