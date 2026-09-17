'use client';

import { useQueries, useQuery } from '@tanstack/react-query';
import { TB_FIRST_LOAD_DEADLINE_MS, TbError, type TbFailure } from '@/shared/api/thingsboard';
import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { getMeasurementSeries } from './fixtures';
import {
  COLLECTION_INTERVAL_MS,
  resolveIntervalSeconds,
  type TailSample,
} from './telemetry.mapper';
import { fetchSiteTail, fetchSiteTelemetry } from './telemetry';
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
  /**
   * **이 사업장이 몇 초마다 보내는가** `[사용자 요청 2026-09-16]`. 사업장마다 다르다 —
   * 서버가 `intervalSeconds` 채널로 알려 준다. 못 들으면 표시 격자 간격(60초)으로 떨어진다.
   */
  intervalSeconds: number;
}

/**
 * 그 사업장을 **몇 밀리초마다 다시 물을 것인가** `[사용자 요청 2026-09-16]`.
 *
 * **여기서 정하는 것은 «창»의 주기다.** 화면의 칸이 1분이라 5초로 오는 사업장을 5초마다
 * 물어도 **새로 생기는 칸이 없고**, 같은 칸을 열두 번 다시 그리려고 24시간치(실측 8.8MB)를
 * 열두 배로 내려받게 된다.
 *
 * **신선도를 포기한 것이 아니다** — 그쪽은 `useSiteLatest`의 꼬리(4.5KB)가 그 사업장 주기로
 * 따로 맡는다. 창은 «역사», 꼬리는 «지금»이고 둘의 주기가 다르다.
 *
 * 반대로 **느리게 오는 사업장은 느리게 묻는다.** 10분마다 보내는 사업장을 1분마다 물으면
 * 열 번 중 아홉 번은 같은 답을 받는다.
 */
export function pollIntervalMs(intervalSeconds: number): number {
  return Math.max(intervalSeconds * 1000, COLLECTION_INTERVAL_MS);
}

/**
 * 계측 쿼리 키를 **한 곳에서 만든다** `[사용자 요청 2026-09-16: 검토]`.
 *
 * 「다시 시도」가 접두 키 하나로 전부 무효화하는데(`use-retry-telemetry.ts`), 꼬리 키를
 * 손으로 `['telemetry-tail', …]`이라 적었더니 **접두가 달라 덮이지 않았다** — 창만 새로
 * 받고 꼬리는 옛 값으로 남는다. 키를 여기서만 만들면 그 어긋남이 생길 자리가 없다.
 */
export const TELEMETRY_KEY_PREFIX = ['telemetry'] as const;

export function telemetryQueryKey(siteId: string | null) {
  return [...TELEMETRY_KEY_PREFIX, siteId];
}

/** 꼬리는 그 사업장 키 **아래**에 둔다 — 접두 무효화가 함께 덮는다 */
export function telemetryTailQueryKey(siteId: string | null) {
  return [...telemetryQueryKey(siteId), 'tail'];
}

/** 아직 서버에게 못 들었을 때의 주기. 이 채널이 생기기 전의 동작과 같다 */
const DEFAULT_INTERVAL_SECONDS = resolveIntervalSeconds(null);

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
    /* 내장 데이터는 표시 격자와 같은 간격으로 만들어져 있다 — 서버에게 들은 값이 아니다 */
    intervalSeconds: resolveIntervalSeconds(null),
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
    intervalSeconds: resolveIntervalSeconds(null),
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
 * **사람이 「다시 시도」를 누를 때 이 사실을 잊는다** `[사용자 요청 2026-09-15]`.
 *
 * 잊지 않으면 그 버튼이 **최악 94초 매달린다.** 마감이 첫 로드에만 걸리는 근거는 *"배경
 * 갱신은 화면에 이미 값이 있어 아무도 기다리지 않는다"* 인데, 수동 재시도는 정확히 그 반대다 —
 * 누른 사람이 버튼을 보며 기다린다. 한 번 붙었다 끊긴 사업장(가장 흔한 경우다)은 이미
 * `settled`라 마감을 받지 못하므로, 여기서 빼서 **첫 로드와 같은 2.5초 마감**으로 되돌린다.
 *
 * 새 상수를 만들지 않는 이유가 그것이다 — `TB_FIRST_LOAD_DEADLINE_MS`의 근거가 «그때 사람이
 * 보고 있다»이고 이 경우가 바로 그 상황이다.
 */
export function forgetSettled(): void {
  settledSites.clear();
}

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
      intervalSeconds: live.intervalSeconds,
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
 * 한 사업장의 계측 계열 — **역사**다. 지금 값은 `useSiteLatest`가 따로 낸다(둘이 이 slice가
 * 화면에 여는 전부다).
 *
 * **창 전체를 다시 받는다.** 꼬리만 이어 붙이면 싸지만, 계측 장비가 로컬에 7일을 저장했다가
 * 복구 시 **과거 시각 그대로** 올려 보내므로(명세 §6.3) 한 번 빈 구간이 영원히 비어 있게
 * 된다. 결측을 영구 공백으로 캐시하지 않는 것이 규약이다.
 */
export function useSiteSeries(siteId: string | null): SiteSeries {
  return useWindowQuery(siteId);
}

/**
 * **지금 값 — 그 사업장 주기마다 갱신되는 최신 표본 하나**
 * `[사용자 요청 2026-09-16: 수집 주기에 맞춰 페이지 데이터가 갱신되어야 함]`.
 *
 * **계열과 따로 둔다.** 한때 이 표본을 `useSiteSeries`의 `points` 끝 칸에 합쳤는데, 배열이
 * 새로 만들어지니 **5초마다 화면 전체가 다시 계산됐다** — 실측으로 `/overview`가 갱신마다
 * **3.5~4.1초**, `/timeseries`가 **1.0초** 동안 멈췄다(60초 사업장은 긴 작업이 0건).
 * 역사(계열)와 지금 값은 갱신 주기가 다른 **다른 자료**이고, 한 객체에 담으면 느린 쪽이
 * 빠른 쪽의 주기로 끌려간다.
 *
 * 그래서 이 훅을 부르는 **몇 개의 «현재값» 표시만** 그 주기로 다시 그린다. 차트와 통계는
 * 1분 격자 그대로라 선 끝이 떨지도 않는다.
 *
 * **주기가 격자 간격 이상이면 돌지 않는다** — 그때는 최신 표본이 곧 격자의 마지막 칸이다.
 *
 * > **가벼워 보이지만 창을 구독한다.** 주기와 상태를 알아야 꼬리를 돌릴지 정할 수 있어서다 —
 * > 그 사업장의 창을 **이미 받고 있는 화면**에서만 부른다. 아무도 안 보는 사업장에 쓰면
 * > 최신 한 점을 알자고 24시간치를 통째로 받게 된다.
 */
export function useSiteLatest(siteId: string | null): TailSample | null {
  const { intervalSeconds, status } = useWindowQuery(siteId);
  return useTailQuery(siteId, intervalSeconds, status);
}

/**
 * **꼬리 — 그 사업장 주기마다 최신 한 점** `[사용자 요청 2026-09-16]`.
 *
 * 창보다 자주 도는 유일한 요청이다. 창 전체를 주기마다 다시 받으면 5초 사업장이 8.8MB를
 * 열두 번 내려받고도 **화면은 한 글자도 바뀌지 않는다**(실측). 바뀌는 것은 최신 표본뿐이라
 * 그것만 4.5KB로 가져온다.
 *
 * **주기가 격자 간격 이상이면 돌지 않는다** — 그때는 최신 표본이 곧 격자의 마지막 칸이라
 * 얻을 것이 없다. 지금 열 곳 중 아홉이 그렇다.
 */
function useTailQuery(
  siteId: string | null,
  intervalSeconds: number,
  status: TelemetryStatus,
): TailSample | null {
  const tailInterval = intervalSeconds * 1000;
  const enabled = siteId !== null && status === 'live' && tailInterval < COLLECTION_INTERVAL_MS;

  const query = useQuery({
    queryKey: telemetryTailQueryKey(siteId),
    /*
     * **꼬리가 실패해도 화면을 무너뜨리지 않는다.** 이것은 신선도를 얹는 곁가지라, 실패하면
     * 격자의 마지막 칸이 그대로 남을 뿐이다 — 연결이 정말 끊겼다면 창 쪽 `status`가 말한다.
     */
    queryFn: () => fetchSiteTail(siteId!, Date.now()).catch(() => null),
    enabled,
    refetchInterval: tailInterval,
    staleTime: tailInterval,
  });

  return enabled ? (query.data ?? null) : null;
}

function useWindowQuery(siteId: string | null): SiteSeries {
  const query = useQuery({
    queryKey: telemetryQueryKey(siteId),
    queryFn: () => loadSeries(siteId!),
    /* 대상이 없을 때도 훅은 불려야 한다 — 닫힌 모달처럼 마운트만 되어 있는 자리가 있다 */
    enabled: siteId !== null,
    /*
     * **주기는 사업장이 정한다** `[사용자 요청 2026-09-16]`. 첫 응답을 받기 전에는 알 수
     * 없으므로 격자 간격으로 시작하고, 받은 뒤부터 그 사업장의 값을 따른다.
     */
    refetchInterval: (query) =>
      pollIntervalMs(query.state.data?.intervalSeconds ?? DEFAULT_INTERVAL_SECONDS),
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
      queryKey: telemetryQueryKey(siteId),
      queryFn: () => loadSeries(siteId),
      refetchInterval: (query: { state: { data?: SiteSeries } }) =>
        pollIntervalMs(query.state.data?.intervalSeconds ?? DEFAULT_INTERVAL_SECONDS),
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
