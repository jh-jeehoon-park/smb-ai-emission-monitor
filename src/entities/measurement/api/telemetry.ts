import {
  TB_ENDPOINTS,
  TB_TIMESERIES_LIMIT,
  tbGet,
  type TbTimeseries,
} from '@/shared/api/thingsboard';
import { TIMELINE_POINT_COUNT } from '@/shared/lib/timeline';
import { getDeviceId } from './device-registry';
import {
  TELEMETRY_KEYS,
  buildGrid,
  gridRange,
  toTelemetryWindow,
  unreceivedCodes,
  type TelemetryWindow,
} from './telemetry.mapper';
import type { SeriesCode } from '../model/types';

export interface SiteTelemetry extends TelemetryWindow {
  siteId: string;
  /** 이번 응답에 한 점도 없던 계열. 화면이 `미수신 항목`으로 적는다 */
  unreceived: SeriesCode[];
}

/**
 * 한 사업장의 조회 창 전체를 받는다.
 *
 * **서버 집계를 쓰지 않는다**(`agg=NONE`). `agg=AVG`는 버킷 `ts`가 표본 시각이 아니라 구간
 * 중앙으로 와서 격자에 얹히지 않고, 값이 평균이라 표시 자릿수를 넘는 부동소수가 그대로
 * 온다(명세 §4.4). 구간 통계는 원 표본을 받아 우리가 계산한다.
 */
export async function fetchSiteTelemetry(siteId: string, endMs: number): Promise<SiteTelemetry> {
  const deviceId = await getDeviceId(siteId);
  const grid = buildGrid(endMs, TIMELINE_POINT_COUNT);
  const { startTs, endTs } = gridRange(grid);

  const raw = await tbGet<TbTimeseries>(TB_ENDPOINTS.timeseries(deviceId), {
    keys: TELEMETRY_KEYS,
    startTs,
    endTs,
    agg: 'NONE',
    limit: TB_TIMESERIES_LIMIT,
    /* 기본값 DESC로 두면 limit이 모자랄 때 **최신 구간을 통째로 버린다**(명세 §4.4) */
    orderBy: 'ASC',
    useStrictDataTypes: 'true',
  });

  return {
    siteId,
    ...toTelemetryWindow(raw, grid, TB_TIMESERIES_LIMIT, siteId),
    unreceived: unreceivedCodes(raw),
  };
}
