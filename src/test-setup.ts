import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/**
 * **렌더한 DOM을 테스트마다 걷는다.**
 *
 * RTL의 자동 정리는 `globals: true`일 때만 걸리는데 이 저장소는 그 옵션을 쓰지 않는다.
 * 정리하지 않으면 `render`가 `document.body`에 계속 쌓여 **`screen` 질의가 앞선 테스트의
 * 화면까지 본다** — 전국 지도를 그린 뒤 관할 지도를 검사하면 없어야 할 확대 줄이 잡힌다
 * (실제로 그렇게 두 건이 거짓 실패했다). `container` 범위 질의로 피해 갈 수도 있지만,
 * 그러면 DOM 테스트를 쓰는 사람마다 이 함정을 다시 밟는다.
 */
afterEach(cleanup);

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
