import {
  TB_ENDPOINTS,
  tbGet,
  tbTimeseriesLimit,
  type TbTimeseries,
} from '@/shared/api/thingsboard';
import { TIMELINE_POINT_COUNT } from '@/shared/lib/timeline';
import { getDeviceId } from './device-registry';
import {
  TELEMETRY_KEYS,
  buildGrid,
  gridRange,
  newestSample,
  resolveIntervalSeconds,
  toTelemetryWindow,
  unreceivedCodes,
  type TailSample,
  type TelemetryWindow,
} from './telemetry.mapper';
import { INTERVAL_KEY } from '../config/constants';
import type { SeriesCode } from '../model/types';

export interface SiteTelemetry extends TelemetryWindow {
  siteId: string;
  /** 이번 응답에 한 점도 없던 계열. 화면이 `미수신 항목`으로 적는다 */
  unreceived: SeriesCode[];
  /**
   * **이 사업장이 몇 초마다 보내는가** `[사용자 요청 2026-09-16]`. 서버가 `intervalSeconds`
   * 채널로 알려 준 값이고, 오지 않으면 표시 격자 간격으로 떨어진다.
   */
  intervalSeconds: number;
}

/**
 * 그 사업장의 수집 주기를 **먼저 묻는다** `[사용자 요청 2026-09-16]`.
 *
 * 한 번의 요청으로 함께 받을 수 없다 — **주기를 알아야 `limit`을 정할 수 있고**, `limit`이
 * 모자라면 응답이 조용히 잘린다(명세 §4.4). 그래서 키 하나짜리 작은 요청을 먼저 보낸다.
 *
 * `orderBy=DESC` + `limit=1`이라 **가장 최근 한 점**만 온다(수백 바이트). 최신값을 쓰는 이유는
 * 이 값이 상수가 아니라 시계열이기 때문이다 — 실제로 2026-09-16 12:40에 한 사업장의 값이
 * `60`에서 `5`로 바뀌었다.
 */
async function fetchIntervalSeconds(deviceId: string, endMs: number): Promise<number> {
  const raw = await tbGet<TbTimeseries>(TB_ENDPOINTS.timeseries(deviceId), {
    keys: INTERVAL_KEY,
    startTs: endMs - INTERVAL_LOOKBACK_MS,
    endTs: endMs,
    agg: 'NONE',
    limit: 1,
    orderBy: 'DESC',
    useStrictDataTypes: 'true',
  });

  const latest = raw[INTERVAL_KEY]?.[0]?.value;
  const parsed = typeof latest === 'number' ? latest : Number(latest);

  return resolveIntervalSeconds(Number.isFinite(parsed) ? parsed : null);
}

/**
 * 주기를 찾을 때 거슬러 보는 구간.
 *
 * 조회 창(24시간) 전체를 보지 않는 이유는 **지금의 주기**가 필요하기 때문이다. 넉넉하되
 * 짧게 잡아, 오래전에 한 번 올라온 값이 지금의 값 행세를 하지 않게 한다. 이 안에 한 점도
 * 없으면 그 채널이 없는 것으로 보고 기본값으로 떨어진다.
 */
const INTERVAL_LOOKBACK_MS = 2 * 60 * 60_000;

/**
 * **꼬리만 받는다** `[사용자 요청 2026-09-16: 수집 주기에 맞춰 페이지 데이터와 그래프가 갱신되어야 함]`.
 *
 * 창 전체(5초 사업장은 8.8MB)를 주기마다 다시 받을 수는 없다. 그런데 **전체를 다시 받아도
 * 화면은 한 글자도 바뀌지 않는다** — 격자의 마지막 칸이 분 경계라 1분이 지나기 전에는 같은
 * 값이 다시 앉는다(실측으로 확인했다: 5초 간격 세 번의 결과가 완전히 같았다).
 *
 * 바뀌는 것은 **서버의 최신 표본**뿐이라 그것만 가져온다 — 최근 몇 분치라 4.5KB · 25ms다.
 */
export async function fetchSiteTail(siteId: string, endMs: number): Promise<TailSample | null> {
  const deviceId = await getDeviceId(siteId);

  const raw = await tbGet<TbTimeseries>(TB_ENDPOINTS.timeseries(deviceId), {
    keys: TELEMETRY_KEYS,
    startTs: endMs - TAIL_WINDOW_MS,
    endTs: endMs,
    agg: 'NONE',
    /* 키마다 최신 한 점이면 된다 — 창을 좁혀 두었으므로 이 값은 여유다 */
    limit: TAIL_LIMIT,
    orderBy: 'ASC',
    useStrictDataTypes: 'true',
  });

  return newestSample(raw);
}

/**
 * 꼬리로 볼 구간. **주기의 몇 배**로 잡지 않고 넉넉한 고정값이다 — 수신이 몇 분씩 끊기는
 * 것이 이 서버의 알려진 결함이라(연동 문서 §9 ③), 주기에 딱 맞추면 그 구멍에서 꼬리가
 * 통째로 비어 «최신값 없음»이 된다.
 */
const TAIL_WINDOW_MS = 5 * 60_000;

/** 5초 × 5분 × 여유. 꼬리가 잘려도 최신 한 점만 쓰므로 해가 없지만, 넉넉하면 진단이 쉽다 */
const TAIL_LIMIT = 200;

/**
 * 한 사업장의 조회 창 전체를 받는다.
 *
 * **서버 집계를 쓰지 않는다**(`agg=NONE`). `agg=AVG`는 버킷 `ts`가 표본 시각이 아니라 구간
 * 중앙으로 와서 격자에 얹히지 않고, 값이 평균이라 표시 자릿수를 넘는 부동소수가 그대로
 * 온다(명세 §4.4). 구간 통계는 원 표본을 받아 우리가 계산한다.
 */
export async function fetchSiteTelemetry(siteId: string, endMs: number): Promise<SiteTelemetry> {
  const deviceId = await getDeviceId(siteId);
  const seconds = await fetchIntervalSeconds(deviceId, endMs);
  const intervalMs = seconds * 1000;

  const grid = buildGrid(endMs, TIMELINE_POINT_COUNT);
  const { startTs, endTs } = gridRange(grid);

  /*
   * **`limit`을 그 사업장 주기에서 만든다** `[사용자 요청 2026-09-16]`. 고정 1,500이던 때는
   * 5초로 보내는 사업장이 «가장 오래된 2.1시간»만 받아 나머지 22시간이 비어 있었다.
   */
  const limit = tbTimeseriesLimit(endTs - startTs, intervalMs);

  const raw = await tbGet<TbTimeseries>(TB_ENDPOINTS.timeseries(deviceId), {
    keys: TELEMETRY_KEYS,
    startTs,
    endTs,
    agg: 'NONE',
    limit,
    /* 기본값 DESC로 두면 limit이 모자랄 때 **최신 구간을 통째로 버린다**(명세 §4.4) */
    orderBy: 'ASC',
    useStrictDataTypes: 'true',
  });

  return {
    siteId,
    ...toTelemetryWindow(raw, grid, limit, siteId, intervalMs),
    unreceived: unreceivedCodes(raw),
    intervalSeconds: seconds,
  };
}
