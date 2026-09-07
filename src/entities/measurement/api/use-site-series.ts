'use client';

import { useQueries, useQuery } from '@tanstack/react-query';
import { TB_FIRST_LOAD_DEADLINE_MS, TbError, type TbFailure } from '@/shared/api/thingsboard';
import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { getMeasurementSeries } from './fixtures';
import { COLLECTION_INTERVAL_MS } from './telemetry.mapper';
import { fetchSiteTelemetry } from './telemetry';
import type { MeasurementPoint, SeriesCode, TelemetryStatus } from '../model/types';

export interface SiteSeries {
  siteId: string;
  points: MeasurementPoint[];
  /**
   * 표본별 방류 여부. **서버에서 받을 때만 값이 있다** — fixture 경로는 `null`이고, 그때는
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

/**
 * 내장 데이터로 돌아간 계열. **`fallback`일 때만 쓴다.**
 *
 * 한때 `pending`도 이 값을 들고 있었다 — 첫 응답이 오기 전에 내장 데이터를 그려 두었고,
 * 응답이 오면 카드가 눈에 보이게 다시 그려졌다 `[사용자 지적 2026-09-07]`. 그 사이 화면은
 * **답이 아닐 수 있는 값을 답의 자리에** 두고 있었고, 소비처는 `pending`과 `fallback`이
 * 같은 `points`를 들어 둘을 가릴 수도 없었다.
 */
function fromFixture(siteId: string, failure: TbFailure): SiteSeries {
  return {
    siteId,
    points: getMeasurementSeries(siteId),
    discharging: null,
    status: 'fallback',
    failure,
    unreceived: [],
    truncated: false,
    observedAtIso: DEMO_NOW_ISO,
  };
}

/**
 * **아직 모르는 계열.** 값을 들지 않는다 — 화면은 이 상태에서 스켈레톤을 그린다
 * (`shared/ui/skeleton.tsx`).
 *
 * 서버·클라이언트가 같은 것을 그리므로 하이드레이션도 어긋나지 않는다. 한때 그 안전을
 * «시드가 고정된 fixture»로 얻었는데, 빈 계열은 그것을 더 단순하게 얻는다.
 */
function pendingSeries(siteId: string): SiteSeries {
  return {
    siteId,
    points: [],
    discharging: null,
    status: 'pending',
    failure: null,
    unreceived: [],
    truncated: false,
    observedAtIso: DEMO_NOW_ISO,
  };
}

/**
 * 이 세션에서 **한 번이라도 응답을 받아 본** 사업장.
 *
 * 첫 로드에만 마감을 걸기 위한 것이다 — 배경 갱신은 화면에 이미 값이 있어 아무도
 * 기다리지 않으므로 재시도 예산을 그대로 쓴다. 모듈에 두는 이유는 «이 사업장이 이번
 * 세션에서 해결된 적이 있는가»가 컴포넌트가 아니라 세션의 사실이기 때문이다
 * (`fixtures.ts`의 `seriesCache`가 같은 이유로 모듈에 있다).
 */
const settledSites = new Set<string>();

/**
 * 계측 서버에서 받아 보고, 못 받으면 fixture로 돌아간다 `[사용자 결정 2026-08-27]`.
 *
 * **던지지 않는다.** 재기동·토큰 만료·네트워크 순단으로 실패가 일상이 된다(명세 §8) —
 * 실패마다 화면이 비면 시연이 멈춘다. 대신 어느 원천인지를 `status`로 드러내 화면이 그
 * 사실을 적게 한다.
 *
 * (한때 근거를 *"사설망 http라 배포본에서는 아예 닿지 않는다"* 로도 적었다 — 공인 IP
 * 포트포워딩으로 그 전제는 깨졌고 배포본도 서버를 본다. 실패가 일상이라는 이유만 남았다.)
 */
async function loadSeries(siteId: string): Promise<SiteSeries> {
  const firstLoad = !settledSites.has(siteId);

  try {
    /*
     * **첫 로드에만 마감을 건다** `[사용자 요청 2026-09-07]`. 그때 화면은 스켈레톤이고,
     * 재시도 예산을 그대로 두면 그것을 최악 94초 보게 된다(`TB_FIRST_LOAD_DEADLINE_MS`).
     * 넘기면 내장 데이터로 내려앉고, 다음 폴링이 이어서 다시 물어본다.
     */
    const live = firstLoad
      ? await withDeadline(fetchSiteTelemetry(siteId, Date.now()), TB_FIRST_LOAD_DEADLINE_MS)
      : await fetchSiteTelemetry(siteId, Date.now());

    settledSites.add(siteId);
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
    /*
     * 마감을 넘긴 것도 `unreachable`로 센다 — 화면이 `내장 데이터 · 서버 미연결`이라 적는다.
     *
     * **느린 것과 못 닿는 것을 가르지 않는다.** 상태를 하나 더 두면 소비처 열한 곳이 그것을
     * 모르는 채로 늘고, 실측 왕복이 1초 아래인 서버에서 2.5초를 넘겼다면 «느리다»보다
     * «닿지 않는다»에 가깝다. 틀렸더라도 **다음 폴링이 1분 안에 `live`로 고친다.**
     */
    settledSites.add(siteId);
    return fromFixture(siteId, error instanceof TbError ? error.failure : 'unreachable');
  }
}

/**
 * 마감까지만 기다린다.
 *
 * **요청을 취소하지 않는다.** 프록시가 이미 나간 뒤라 취소해도 서버 쪽 일은 줄지 않고,
 * 그 응답은 다음 폴링이 쓸 수 있다. 여기서 필요한 것은 «화면을 언제 놓아 주는가»뿐이다.
 */
function withDeadline<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;

  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TbError('unreachable', `첫 조회가 ${ms}ms를 넘겼습니다`)), ms);
  });

  /* 이겼으면 타이머를 걷는다 — 두면 응답이 온 뒤에도 2.5초 뒤에 깨어나 헛일을 한다 */
  return Promise.race([work, deadline]).finally(() => clearTimeout(timer));
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
     * **내장 데이터를 미리 그려 두지 않는다** `[사용자 지적 2026-09-07]`. 한때 이 자리가
     * fixture를 돌려주어 첫 페인트가 답이 아닐 수 있는 값이었고, 응답이 오면 카드가 눈에
     * 보이게 다시 그려졌다. 지금은 `pending`이 빈 계열이라 화면이 스켈레톤을 그린다.
     */
    placeholderData: () => idleOr(siteId),
  });

  return query.data ?? idleOr(siteId);
}

/**
 * 아직 모르는 계열. 대상이 없으면 사업장 id도 비운다 — 아무 사업장이나 끌어다 채우면
 * 남의 값이 붙는다.
 */
function idleOr(siteId: string | null): SiteSeries {
  return siteId === null ? pendingSeries('') : pendingSeries(siteId);
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
      placeholderData: () => pendingSeries(siteId),
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
