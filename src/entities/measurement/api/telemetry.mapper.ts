import type { TbTimeseries, TbTsValue } from '@/shared/api/thingsboard';
import { COLLECTION_INTERVAL_MINUTES, MEASUREMENT_ITEMS } from '@/shared/config/measurement';
import { kstIsoFromEpoch } from '@/shared/lib/format';
import { roundTo } from '@/shared/lib/prng';
import {
  DISCHARGING_KEY,
  INTERVAL_SECONDS_RANGE,
  RECEIVED_SERIES_CODES,
  TB_CHANNEL_BY_CODE,
  UNRECEIVED_SERIES_CODES,
} from '../config/constants';
import { fillInletQuality } from '../lib/inlet-quality';
import type { MeasurementPoint, SeriesCode } from '../model/types';

/**
 * **표시 격자의 칸 간격.** 사업장의 수집 주기와 **다른 값이다** `[사용자 요청 2026-09-16]`.
 *
 * 격자는 이 저장소의 시간축 계약이다 — fixture·알람·이상 점수·리포트가 전부
 * `shared/lib/timeline.ts`의 «24시간 ÷ 1분 = 1,440칸»을 공유하고, 그 가정을 읽는 자리가
 * 100곳이 넘는다. 사업장마다 칸 간격을 바꾸면 그 전부가 함께 흔들린다.
 *
 * 그래서 **사업장마다 달라지는 것은 «받는 쪽»으로 한정한다** — 조회 구간·폴링 주기·격자에
 * 얹는 방법. 5초로 오는 사업장은 1분 칸 하나에 12표본이 들어오고 그중 칸 시각의 것이 앉는다.
 */
export const COLLECTION_INTERVAL_MS = COLLECTION_INTERVAL_MINUTES * 60_000;

/**
 * 서버가 말한 주기를 믿을 수 있는 값으로 만든다.
 *
 * **믿지 않는 쪽으로 기운다** — 이 채널은 생긴 첫날 하필 주기가 다른 사업장에서 24시간 내내
 * 틀린 값을 말하고 있었다(선언 60초 · 실제 5초). 범위를 벗어나거나 오지 않으면 표시 격자
 * 간격을 그대로 쓴다 — 그것이 이 채널이 생기기 전의 동작이라 최악이어도 예전과 같다.
 */
export function resolveIntervalSeconds(value: number | null | undefined): number {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return COLLECTION_INTERVAL_MS / 1000;
  }

  const { min, max } = INTERVAL_SECONDS_RANGE;
  return min <= value && value <= max ? value : COLLECTION_INTERVAL_MS / 1000;
}

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

/**
 * 칸 시각에 앉을 표본을 고른다.
 *
 * **주기가 칸 간격을 나누어떨어뜨리면 찾을 것이 없다.** 지금 서버가 주는 5초·60초가 둘 다
 * 그렇고, 표본이 칸 시각에 그대로 있어 바로 꺼내면 된다 — 정렬도 탐색도 하지 않는다.
 * 5초 사업장은 키마다 17,280표본이라 이 갈래가 실제로 값이 있다(정렬 × 26키를 건너뛴다).
 *
 * **나누어떨어지지 않을 때만**(예: 7초·90초) 가까운 표본을 끌어온다. 그러지 않으면 칸 시각과
 * 겹치는 표본이 거의 없어 **화면이 통째로 결측이 된다** — 실제로는 값이 오고 있는데도.
 *
 * 끌어오는 거리는 **그 사업장 주기의 절반**까지다. 그 안에 표본이 없다면 정렬 문제가 아니라
 * 진짜 결측이고, 더 멀리서 끌어오면 **두절 구간을 옆 표본으로 메워** 끊긴 적이 없는 것처럼
 * 보인다(**E4**). 나누어떨어지는 주기에서는 이 한계가 표본 간격보다 좁아 어차피 아무것도
 * 끌어오지 못한다 — 그래서 두 갈래의 결과가 같고, 빠른 길은 속도만 얻는다.
 */
function samplePicker(
  column: Map<number, number>,
  intervalMs: number,
): (ts: number) => number | undefined {
  if (COLLECTION_INTERVAL_MS % intervalMs === 0) return (ts) => column.get(ts);

  const tolerance = Math.floor(intervalMs / 2);
  const sorted = [...column.keys()].sort((a, b) => a - b);

  return (ts) => {
    const exact = column.get(ts);
    if (exact !== undefined) return exact;

    /* 이분 탐색 — 칸마다 전체를 훑으면 1,440 × 17,280이 된다 */
    let low = 0;
    let high = sorted.length - 1;
    let best: number | undefined;
    let bestGap = Number.POSITIVE_INFINITY;

    while (low <= high) {
      const mid = (low + high) >> 1;
      const candidate = sorted[mid]!;
      const gap = Math.abs(candidate - ts);
      if (gap < bestGap) {
        bestGap = gap;
        best = candidate;
      }
      if (candidate < ts) low = mid + 1;
      else high = mid - 1;
    }

    return best !== undefined && bestGap <= tolerance ? column.get(best) : undefined;
  };
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
  siteId: string,
  intervalMs: number = COLLECTION_INTERVAL_MS,
): TelemetryWindow {
  const pick = new Map<string, (ts: number) => number | undefined>();
  let maxCount = 0;

  for (const key of [...RECEIVED_SERIES_CODES.map(channelOf), DISCHARGING_KEY]) {
    pick.set(key, samplePicker(byTimestamp(raw[key]), intervalMs));
    maxCount = Math.max(maxCount, raw[key]?.length ?? 0);
  }

  const points = grid.map((ts) => {
    const point = { t: kstIsoFromEpoch(ts) } as MeasurementPoint;

    for (const code of UNRECEIVED_SERIES_CODES) point[code] = null;

    for (const code of RECEIVED_SERIES_CODES) {
      const value = pick.get(channelOf(code))!(ts);
      point[code] =
        value === undefined ? null : roundTo(value, MEASUREMENT_ITEMS[code].decimals);
    }

    /*
     * **서버가 주지 않는 유입 수질을 여기서 만든다** `[TBD-59]`.
     *
     * 실측 경로에도 채우는 이유는 이 화면이 실측을 보기 때문이다 — 안 채우면 서버에 닿는
     * 순간 대조 줄의 왼쪽이 통째로 비고, 내장 데이터로 볼 때와 다른 화면이 된다.
     * 값은 fixture와 **같은 함수**를 지나므로 두 경로의 판정이 갈리지 않는다.
     */
    fillInletQuality(point, siteId);

    return point;
  });

  const flagAt = pick.get(DISCHARGING_KEY)!;

  return {
    points,
    discharging: grid.map((ts) => {
      const value = flagAt(ts);
      return value === undefined ? null : value !== 0;
    }),
    truncated: maxCount >= limit,
  };
}

/**
 * **서버가 가진 가장 새로운 표본 한 점** `[사용자 요청 2026-09-16]`.
 *
 * 격자의 마지막 칸은 분 경계라 최대 2분까지 묵는다(폴링 직전에 경계가 지나가면 59초 + 다음
 * 폴링까지 60초). 5초로 보내는 사업장에서는 **그동안 스물네 점이 버려진다.**
 *
 * 그래서 꼬리에서 최신 한 점을 꺼내 화면의 «현재값»과 그래프 끝에 앉힌다. **시각도 함께
 * 가져간다** — 값만 바꾸고 분 경계 시각을 그대로 두면 화면이 «14:03:00의 값»이라며 실제로는
 * 14:03:55의 값을 적는다(**E5**).
 */
export interface TailSample {
  /** 그 표본의 실제 시각. 분 경계가 아니다 */
  iso: string;
  epochMs: number;
  values: Partial<Record<SeriesCode, number | null>>;
  discharging: boolean | null;
}

export function newestSample(raw: TbTimeseries): TailSample | null {
  let epochMs = 0;
  for (const key of [...RECEIVED_SERIES_CODES.map(channelOf), DISCHARGING_KEY]) {
    const ts = raw[key]?.at(-1)?.ts;
    if (ts !== undefined && ts > epochMs) epochMs = ts;
  }
  if (epochMs === 0) return null;

  const values: Partial<Record<SeriesCode, number | null>> = {};
  for (const code of RECEIVED_SERIES_CODES) {
    /*
     * **그 시각의 표본만 쓴다.** 계열마다 마지막 시각이 다를 수 있는데 아무 계열의 마지막
     * 값이나 끌어다 한 점에 모으면 **서로 다른 시각의 값이 한 줄에 앉는다**.
     */
    const found = raw[channelOf(code)]?.findLast((p) => p.ts === epochMs);
    const parsed = found === undefined ? null : toNumber(found.value);
    values[code] = parsed === null ? null : roundTo(parsed, MEASUREMENT_ITEMS[code].decimals);
  }

  const flag = raw[DISCHARGING_KEY]?.findLast((p) => p.ts === epochMs);
  const flagValue = flag === undefined ? null : toNumber(flag.value);

  return {
    iso: kstIsoFromEpoch(epochMs),
    epochMs,
    values,
    discharging: flagValue === null ? null : flagValue !== 0,
  };
}

/** 사전에 있는 계열 중 이번 응답에 한 점도 없던 것 — 화면이 `미수신 항목`으로 적는다 */
export function unreceivedCodes(raw: TbTimeseries): SeriesCode[] {
  return [
    ...UNRECEIVED_SERIES_CODES,
    ...RECEIVED_SERIES_CODES.filter((code) => (raw[channelOf(code)]?.length ?? 0) === 0),
  ];
}
