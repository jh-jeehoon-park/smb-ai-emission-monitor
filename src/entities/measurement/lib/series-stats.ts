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
