'use client';

import { useQueries, useQuery } from '@tanstack/react-query';
import { TbError, type TbFailure } from '@/shared/api/thingsboard';
import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { getMeasurementSeries } from './fixtures';
import { COLLECTION_INTERVAL_MS } from './telemetry.mapper';
import { fetchSiteTelemetry } from './telemetry';
import type { MeasurementPoint, SeriesCode, TelemetryStatus } from '../model/types';

export interface SiteSeries {
  siteId: string;
  points: MeasurementPoint[];
  /**
   * 표본별 방류 여부. **실측일 때만 값이 있다** — fixture 경로는 `null`이고, 그때는
   * 호출부가 지금처럼 `isDischargingAt`으로 판정한다.
   */
  discharging: (boolean | null)[] | null;
  status: TelemetryStatus;
  /** 왜 폴백했는가. `status`가 `fallback`일 때만 값이 있다 */
  failure: TbFailure | null;
  /** 서버에 채널이 없거나 한 점도 오지 않은 계열 */
  unreceived: SeriesCode[];
  /** 응답이 `limit`에 걸려 잘렸을 수 있다 */
  truncated: boolean;
  /** 시간축의 끝. 화면이 "언제 기준인가"를 적을 때 쓴다 */
  observedAtIso: string;
}

function fromFixture(siteId: string, failure: TbFailure | null): SiteSeries {
  return {
    siteId,
    points: getMeasurementSeries(siteId),
    discharging: null,
    status: failure === null ? 'pending' : 'fallback',
    failure,
    unreceived: [],
    truncated: false,
    observedAtIso: DEMO_NOW_ISO,
  };
}

/**
 * 실측을 받아 보고, 못 받으면 fixture로 돌아간다 `[사용자 결정 2026-08-27]`.
 *
 * **던지지 않는다.** 계측 서버는 사설망 http라 배포본에서는 아예 닿지 않고(명세 §2),
 * 사내에서도 재기동·토큰 만료로 실패가 일상이 된다 — 실패마다 화면이 비면 시연이 멈춘다.
 * 대신 어느 원천인지를 `status`로 드러내 화면이 그 사실을 적게 한다.
 */
async function loadSeries(siteId: string): Promise<SiteSeries> {
  try {
    const live = await fetchSiteTelemetry(siteId, Date.now());
    return {
      siteId,
      points: live.points,
      discharging: live.discharging,
      status: 'live',
      failure: null,
      unreceived: live.unreceived,
      truncated: live.truncated,
      observedAtIso: live.points.at(-1)?.t ?? DEMO_NOW_ISO,
    };
  } catch (error) {
    return fromFixture(siteId, error instanceof TbError ? error.failure : 'unreachable');
  }
}

/**
 * 한 사업장의 계측 계열. **화면이 계측을 읽는 유일한 통로다.**
 *
 * **창 전체를 다시 받는다.** 꼬리만 이어 붙이면 싸지만, 계측 장비가 로컬에 7일을 저장했다가
 * 복구 시 **과거 시각 그대로** 올려 보내므로(명세 §6.3) 한 번 빈 구간이 영원히 비어 있게
 * 된다. 결측을 영구 공백으로 캐시하지 않는 것이 규약이다.
 */
export function useSiteSeries(siteId: string | null): SiteSeries {
  const query = useQuery({
    queryKey: ['telemetry', siteId],
    queryFn: () => loadSeries(siteId!),
    /* 대상이 없을 때도 훅은 불려야 한다 — 닫힌 모달처럼 마운트만 되어 있는 자리가 있다 */
    enabled: siteId !== null,
    refetchInterval: COLLECTION_INTERVAL_MS,
    staleTime: COLLECTION_INTERVAL_MS,
    /**
     * 첫 렌더에 빈 화면을 만들지 않는다. fixture는 시드가 고정이라 서버와 클라이언트가
     * 같은 값을 만들고, 그래서 하이드레이션도 어긋나지 않는다.
     */
    placeholderData: () => idleOr(siteId),
  });

  return query.data ?? idleOr(siteId);
}

/** 대상이 없으면 **빈 계열**이다. 아무 사업장이나 끌어다 채우면 남의 값이 붙는다 */
function idleOr(siteId: string | null): SiteSeries {
  if (siteId === null) {
    return {
      siteId: '',
      points: [],
      discharging: null,
      status: 'pending',
      failure: null,
      unreceived: [],
      truncated: false,
      observedAtIso: DEMO_NOW_ISO,
    };
  }

  return fromFixture(siteId, null);
}

/**
 * 여러 사업장의 계열을 한 번에. 통합 관제·관내 감독처럼 **한 렌더에서 사업장 수만큼** 계열이
 * 필요한 자리가 쓴다 — 훅은 반복문 안에서 부를 수 없으므로 `useQueries`로 편다.
 *
 * `combine`으로 묶는 이유는 참조 안정성이다. 결과 배열은 렌더마다 새로 만들어지는데, 그대로
 * `Map`을 지으면 아래쪽 `useMemo`가 매번 다시 돈다.
 */
export function useSitesSeries(siteIds: string[]): Map<string, SiteSeries> {
  return useQueries({
    queries: siteIds.map((siteId) => ({
      queryKey: ['telemetry', siteId],
      queryFn: () => loadSeries(siteId),
      refetchInterval: COLLECTION_INTERVAL_MS,
      staleTime: COLLECTION_INTERVAL_MS,
      placeholderData: () => fromFixture(siteId, null),
    })),
    combine: combineSeries,
  });
}

/**
 * 계열만 필요한 순수 함수에 넘길 때 쓴다. 훅의 반환형을 `lib/` 안까지 끌고 가지 않는다 —
 * 그쪽은 원천이 무엇인지 알 필요가 없다.
 */
export function pointsBySite(series: Map<string, SiteSeries>): Map<string, MeasurementPoint[]> {
  return new Map([...series].map(([siteId, one]) => [siteId, one.points]));
}

function combineSeries(results: { data?: SiteSeries }[]): Map<string, SiteSeries> {
  const map = new Map<string, SiteSeries>();
  for (const { data } of results) {
    if (data) map.set(data.siteId, data);
  }
  return map;
}
