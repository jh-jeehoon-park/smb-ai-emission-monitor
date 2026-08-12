import { defineConfig } from 'vitest/config';

export default defineConfig({
  // tsconfig의 @/* 별칭을 Vite가 직접 해석한다(별도 플러그인 불필요)
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
