'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { forgetSettled } from './use-site-series';

/** 계측 쿼리의 접두 키. 사업장별 키(`['telemetry', siteId]`)를 전부 덮는다 */
const TELEMETRY_KEY = ['telemetry'] as const;

/**
 * 「다시 시도」 `[사용자 결정 2026-09-15]`.
 *
 * **`refetch`를 훅 밖으로 내보내지 않는 이유** — `useSiteSeries`는 지금 도메인 값(`SiteSeries`)
 * 자체를 돌려준다. `{ series, refetch }`로 바꾸면 소비처 14곳이 전부 바뀌고, 더 나쁘게는
 * `refetch`가 **관찰자 하나만** 고친다: 셸 헤더의 수신 표시와 본문이 같은 사업장을 따로
 * 보고 있어 한쪽만 살아나는 상태가 생긴다 — 지금 고치려는 어긋남을 새로 짓는 셈이다.
 * 접두 키 무효화는 그 사업장을 보는 **모든 자리**를 함께 되살린다.
 *
 * **잊는 것이 먼저다.** `forgetSettled()`를 빼면 버튼이 최악 94초 매달린다(그쪽 주석 참조).
 *
 * **장비 등록부(`device-registry.ts`)는 비우지 않는다.** 그 캐시가 비지 않아 `notFound`는
 * 다시 눌러도 같은 답이 오는데, 바로 그래서 `notFound`에는 버튼을 두지 않았다
 * (`TELEMETRY_FALLBACK_NOTICES.notFound.retry === false`). 버튼을 그쪽에 열려면 등록부를
 * 비우는 일이 먼저다 — 그 순서를 뒤집으면 버튼이 거짓말을 한다.
 */
export function useRetryTelemetry(): { retry: () => void; retrying: boolean } {
  const queryClient = useQueryClient();
  /*
   * **«누가 눌렀는가»를 따로 든다.** `useIsFetching`으로 대신할 수 있을 것 같지만, 계측은
   * 60초마다 스스로 폴링하므로 그 값은 **아무도 누르지 않은 1분마다 참**이 된다 — 버튼이
   * 스스로 눌린 것처럼 깜빡인다. 여기서 말하려는 것은 «요청이 도는가»가 아니라
   * «내가 누른 것이 아직 안 끝났는가»다.
   */
  const [retrying, setRetrying] = useState(false);

  const retry = useCallback(() => {
    forgetSettled();
    setRetrying(true);
    /* 무효화가 돌려주는 약속은 **다시 받기가 끝날 때** 풀린다 — 실패해도 풀린다 */
    void queryClient
      .invalidateQueries({ queryKey: TELEMETRY_KEY })
      .finally(() => setRetrying(false));
  }, [queryClient]);

  return { retry, retrying };
}
