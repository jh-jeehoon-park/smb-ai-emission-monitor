import { defineConfig } from 'vitest/config';

export default defineConfig({
  // tsconfig의 @/* 별칭을 Vite가 직접 해석한다(별도 플러그인 불필요)
  resolve: { tsconfigPaths: true },
  test: {
    /**
     * 기본은 `node`다 — 순수 함수·fixture 테스트가 대부분이고, DOM을 켜면 그만큼 느려진다.
     *
     * DOM이 필요한 테스트만 파일 첫 줄에 `// @vitest-environment jsdom`을 적어 켠다.
     * 대상은 **직접 만든 DOM 동작**이다(모달 포커스 복원·차트 포커스 차단처럼 주석으로만
     * 지켜지던 것들). 라이브러리 내부 동작을 다시 검증하지는 않는다.
     */
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['src/test-setup.ts'],
  },
});
