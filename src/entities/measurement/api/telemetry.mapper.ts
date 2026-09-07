import type { TbTimeseries, TbTsValue } from '@/shared/api/thingsboard';
import { COLLECTION_INTERVAL_MINUTES, MEASUREMENT_ITEMS } from '@/shared/config/measurement';
import { kstIsoFromEpoch } from '@/shared/lib/format';
import { roundTo } from '@/shared/lib/prng';
import {
  DISCHARGING_KEY,
  RECEIVED_SERIES_CODES,
  TB_CHANNEL_BY_CODE,
  UNRECEIVED_SERIES_CODES,
} from '../config/constants';
import type { MeasurementPoint, SeriesCode } from '../model/types';

export const COLLECTION_INTERVAL_MS = COLLECTION_INTERVAL_MINUTES * 60_000;

/** 그 계열이 서버에서 불리는 이름. 대부분 같고 유량 둘만 다르다 */
export function channelOf(code: SeriesCode): string {
  return TB_CHANNEL_BY_CODE[code] ?? code;
}

/** 요청 키. **사전에서만 만든다** — 오타는 에러가 아니라 유령 표본이 된다(명세 §7.1) */
export const TELEMETRY_KEYS = [...RECEIVED_SERIES_CODES.map(channelOf), DISCHARGING_KEY].join(',');

/**
 * 표본이 놓일 시각들. **격자를 먼저 만들고 채운다**(명세 §6.2).
 *
 * 응답 배열을 순서대로 zip하면 밀린다 — 키마다 타임스탬프 집합이 다르기 때문이다. 그리고
 * 안 채워진 칸이 곧 결측이라는 사실이 여기서 나온다. 격자가 없으면 "값이 없다"를 만들 자리가
 * 없어 화면이 결측을 그리지 못한다.
 */
export function buildGrid(endMs: number, pointCount: number): number[] {
  const last = Math.floor(endMs / COLLECTION_INTERVAL_MS) * COLLECTION_INTERVAL_MS;
  return Array.from(
    { length: pointCount },
    (_, i) => last - (pointCount - 1 - i) * COLLECTION_INTERVAL_MS,
  );
}

/**
 * 조회 구간. **`[startTs, endTs)` 반열림이라 끝을 한 주기 더 준다** — 마지막 표본 시각을
 * 그대로 `endTs`로 두면 최신 1점이 사라진다(명세 §4.4).
 */
export function gridRange(grid: number[]): { startTs: number; endTs: number } {
  return {
    startTs: grid[0] ?? 0,
    endTs: (grid.at(-1) ?? 0) + COLLECTION_INTERVAL_MS,
  };
}

/**
 * 값이 **없는 것**과 **0인 것**을 끝까지 가른다(명세 §6.3·§6.4).
 *
 * `?? 0`을 쓰면 여기서 규약이 깨진다 — 방지시설 미가동 구간의 전류 0은 측정된 사실이고,
 * 통신 두절 구간의 빈칸은 모름이다. 둘을 같게 만들면 무단방류 의심 판정이 사라진다.
 */
function toNumber(value: TbTsValue['value']): number | null {
  if (value === null || value === '') return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function byTimestamp(values: TbTsValue[] | undefined): Map<number, number> {
  const map = new Map<number, number>();
  for (const { ts, value } of values ?? []) {
    const parsed = toNumber(value);
    if (parsed !== null) map.set(ts, parsed);
  }
  return map;
}

export interface TelemetryWindow {
  points: MeasurementPoint[];
  /** 표본별 방류 여부. 서버가 채널로 주므로 파생하지 않는다. 값이 없으면 **모름**이다 */
  discharging: (boolean | null)[];
  /** 응답 개수가 `limit`과 같아 **잘렸을 수 있다**(명세 §4.4) */
  truncated: boolean;
}

/**
 * 서버 응답을 화면 모델로 옮긴다.
 *
 * **값을 범위로 자르지 않는다.** fixture는 `clamp`로 잘라 두는데, 서버 값을 자르면 센서 고장이
 * 정상값으로 둔갑한다 — 이상 탐지가 잡아야 할 바로 그 값이다.
 *
 * 자릿수는 사전으로 복원한다 — 응답에는 단위도 자릿수도 없고(명세 §5) 소수점이 잘려 오기도
 * 한다(`8.00` → `"8"`). 같은 항목을 화면마다 다르게 반올림하지 않는다(E1).
 */
export function toTelemetryWindow(
  raw: TbTimeseries,
  grid: number[],
  limit: number,
): TelemetryWindow {
  const columns = new Map<string, Map<number, number>>();
  let maxCount = 0;

  for (const key of [...RECEIVED_SERIES_CODES.map(channelOf), DISCHARGING_KEY]) {
    columns.set(key, byTimestamp(raw[key]));
    maxCount = Math.max(maxCount, raw[key]?.length ?? 0);
  }

  const points = grid.map((ts) => {
    const point = { t: kstIsoFromEpoch(ts) } as MeasurementPoint;

    for (const code of UNRECEIVED_SERIES_CODES) point[code] = null;

    for (const code of RECEIVED_SERIES_CODES) {
      const value = columns.get(channelOf(code))!.get(ts);
      point[code] =
        value === undefined ? null : roundTo(value, MEASUREMENT_ITEMS[code].decimals);
    }

    return point;
  });

  const flags = columns.get(DISCHARGING_KEY)!;

  return {
    points,
    discharging: grid.map((ts) => {
      const value = flags.get(ts);
      return value === undefined ? null : value !== 0;
    }),
    truncated: maxCount >= limit,
  };
}

/** 사전에 있는 계열 중 이번 응답에 한 점도 없던 것 — 화면이 `미수신 항목`으로 적는다 */
export function unreceivedCodes(raw: TbTimeseries): SeriesCode[] {
  return [
    ...UNRECEIVED_SERIES_CODES,
    ...RECEIVED_SERIES_CODES.filter((code) => (raw[channelOf(code)]?.length ?? 0) === 0),
  ];
}
