'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

/**
 * 서버 렌더에서 클라이언트를 모듈 전역으로 두면 요청끼리 캐시를 공유한다.
 * `useState`의 초기화 함수로 만들어 트리마다 하나씩 갖는다.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            /**
             * **재시도를 여기서 하지 않는다.** 접속 계층이 이미 도달 실패에만 3회
             * 백오프를 건다(명세 §8) — 위에서 또 걸면 곱해져 폴링 주기를 넘고 요청이 겹친다.
             */
            retry: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
