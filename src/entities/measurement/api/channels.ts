'use client';

import { useQuery } from '@tanstack/react-query';
import { TB_ENDPOINTS, tbGet } from '@/shared/api/thingsboard';
import { getDeviceId } from './device-registry';
import { KNOWN_CHANNELS } from './channel-registry';

export interface SiteChannelKeys {
  keys: readonly string[];
  /** 서버에서 받았는가, 알려진 목록으로 메웠는가 — 화면이 출처를 적는다 */
  source: 'server' | 'fallback' | 'pending';
}

const FALLBACK_KEYS = KNOWN_CHANNELS.map((channel) => channel.key);

/** 채널 구성은 설치할 때 바뀐다 — 계측값처럼 주기마다 물을 이유가 없다 */
const CHANNEL_KEYS_STALE_MS = 10 * 60 * 1000;

/**
 * 그 사업장 장치가 **실제로 보내는** 채널 이름들 `[사용자 요청 2026-09-29]`.
 *
 * 프록시가 이미 열어 둔 조회(`keys/timeseries`)를 쓴다. **닿지 않으면 알려진 목록으로 메우고
 * 그 사실을 적는다** — 서버는 재기동·토큰 만료·순단으로 실패가 일상이다(연동 문서 §5).
 * 목록이 비면 매핑 화면이 «채널 0개»가 되어 설정 자체를 막는다.
 */
export function useSiteChannelKeys(siteId: string): SiteChannelKeys {
  const query = useQuery({
    queryKey: ['telemetry-channel-keys', siteId],
    queryFn: async () => {
      const deviceId = await getDeviceId(siteId);
      return tbGet<string[]>(TB_ENDPOINTS.timeseriesKeys(deviceId));
    },
    staleTime: CHANNEL_KEYS_STALE_MS,
    retry: false,
  });

  if (query.isPending) return { keys: FALLBACK_KEYS, source: 'pending' };
  if (query.isError || !Array.isArray(query.data)) return { keys: FALLBACK_KEYS, source: 'fallback' };
  return { keys: query.data, source: 'server' };
}
