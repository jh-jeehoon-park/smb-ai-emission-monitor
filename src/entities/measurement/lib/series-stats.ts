import { COLLECTION_INTERVAL_MINUTES } from '@/shared/config/measurement';
import type { MeasurementPoint, SeriesCode } from '../model/types';

const POINTS_PER_HOUR = 60 / COLLECTION_INTERVAL_MINUTES;

/** 조회 기간을 좁힐 때 최근 구간을 남긴다. 계측 화면의 관심은 늘 '지금'이다 */
export function sliceRecentHours(points: MeasurementPoint[], hours: number): MeasurementPoint[] {
  return points.slice(-Math.round(hours * POINTS_PER_HOUR));
}

export interface SeriesStats {
  min: number | null;
  max: number | null;
  avg: number | null;
  latest: number | null;
  missingCount: number;
  totalCount: number;
}

/** 한 구간과 그 안의 표본들 */
export interface SeriesBucket {
  /** 구간 시작 시각. 표의 행 머리글이 된다 */
  startIso: string;
  points: MeasurementPoint[];
}

/**
 * 표본을 시간 구간으로 묶는다.
 *
 * 센서 리포트는 보통 **구간이 행**이다 — 5분 표본 288개를 그대로 늘어놓으면 값을 읽는 것이
 * 아니라 세는 일이 된다. 구간마다 최소·평균·최대를 내면 하루의 모양이 보인다.
 *
 * **표본 순서를 믿는다.** 계열은 시각 오름차순이고(`getMeasurementSeries`) 수집 주기가
 * 고정이라 인덱스로 자르는 것이 시각을 파싱해 나누는 것보다 싸고 정확하다 — 파싱하면
 * 시간대 해석이 끼어든다.
 *
 * `minutes`가 수집 주기보다 작으면 구간마다 표본 하나다(원시 보기).
 */
export function bucketByMinutes(points: MeasurementPoint[], minutes: number): SeriesBucket[] {
  const size = Math.max(1, Math.round(minutes / COLLECTION_INTERVAL_MINUTES));
  const buckets: SeriesBucket[] = [];

  for (let i = 0; i < points.length; i += size) {
    const slice = points.slice(i, i + size);
    /* 표본이 없는 구간은 만들지 않는다 — 빈 행은 "그 시간이 있었다"는 말이 되지 않는다 */
    if (slice.length === 0) continue;
    buckets.push({ startIso: slice[0]!.t, points: slice });
  }

  return buckets;
}

/**
 * 결측은 통계에서 빼고 개수로만 센다. 0으로 치면 최소·평균이 함께 거짓이 된다(E4).
 * 전 구간이 결측이면 값 대신 null을 돌려 화면이 빈 상태를 그리게 한다(R19).
 */
export function summarizeSeries(points: MeasurementPoint[], code: SeriesCode): SeriesStats {
  const values: number[] = [];

  for (const point of points) {
    const value = point[code];
    if (value !== null) values.push(value);
  }

  /**
   * '최신'은 마지막 표본의 값이다. 결측이면 그 앞의 값을 끌어오지 않고 비운다 —
   * 지금 수신되지 않는 값을 현재값으로 보여주면 다른 화면과 어긋난다(E4).
   */
  const latest = points.length > 0 ? points[points.length - 1]![code] : null;
  const missingCount = points.length - values.length;
  if (values.length === 0) {
    return {
      min: null,
      max: null,
      avg: null,
      latest: null,
      missingCount,
      totalCount: points.length,
    };
  }

  const sum = values.reduce((acc, v) => acc + v, 0);
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    avg: sum / values.length,
    latest,
    missingCount,
    totalCount: points.length,
  };
}
