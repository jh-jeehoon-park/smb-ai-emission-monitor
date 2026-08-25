import '@testing-library/jest-dom/vitest';

/**
 * jsdom에 **없는 브라우저 API**를 채운다.
 *
 * `matchMedia`(감속 설정)와 `ResizeObserver`(상자 폭 관측)는 jsdom이 구현하지 않는데,
 * 우리 코드는 둘 다 실제로 쓴다 — 없으면 렌더가 `TypeError`로 죽어 **검사하려던 것과
 * 무관한 이유로** 테스트가 깨진다.
 *
 * 채우는 값은 **아무 일도 하지 않는 쪽**이다: 감속은 꺼짐(`matches: false`), 관측기는
 * 부르지 않는다. 모션과 폭 계산은 브라우저에서만 뜻이 있고, 여기서 흉내 내면 그 흉내를
 * 검사하게 된다.
 *
 * `node` 환경에서는 `window`가 없으므로 건드리지 않는다.
 */
if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
  }

  if (!window.ResizeObserver) {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
}
