import { describe, expect, it } from 'vitest';
import { COLLECTION_INTERVAL_MINUTES } from '@/shared/config/measurement';
import { getMeasurementSeries } from '../api/fixtures';
import type { MeasurementPoint } from '../model/types';
import { sliceRecentHours, summarizeSeries } from './series-stats';

/** 통계에 필요한 필드만 채운 최소 표본. 나머지 항목은 이 테스트와 무관하다 */
function point(t: string, pH: number | null): MeasurementPoint {
  return {
    t,
    pH,
    EC: null,
    turbidity: null,
    DO: null,
    temperature: null,
    chromaticity: null,
    NO3N: null,
    TOC: null,
    current: null,
    power: null,
    flow: null,
  };
}

describe('summarizeSeries', () => {
  it('결측을 평균·최소·최대에서 제외하고 건수로만 센다', () => {
    const stats = summarizeSeries([point('t1', 6), point('t2', null), point('t3', 8)], 'pH');

    expect(stats.min).toBe(6);
    expect(stats.max).toBe(8);
    expect(stats.avg).toBe(7);
    expect(stats.missingCount).toBe(1);
    expect(stats.totalCount).toBe(3);
  });

  it('결측을 0으로 세지 않는다 — 0으로 치면 최소·평균이 함께 거짓이 된다(E4)', () => {
    const withGap = summarizeSeries([point('t1', 6), point('t2', null)], 'pH');
    const withZero = summarizeSeries([point('t1', 6), point('t2', 0)], 'pH');

    expect(withGap.min).toBe(6);
    expect(withGap.avg).toBe(6);
    expect(withZero.min).toBe(0);
    expect(withZero.avg).toBe(3);
  });

  it('마지막 표본이 결측이면 최신값은 앞의 값이 아니라 없음이다', () => {
    const stats = summarizeSeries([point('t1', 6), point('t2', 7), point('t3', null)], 'pH');

    expect(stats.latest).toBeNull();
    // 앞 구간 값은 최소·최대에는 남아 있어야 한다
    expect(stats.max).toBe(7);
  });

  it('마지막 표본이 수신되면 그 값이 최신값이다', () => {
    const stats = summarizeSeries([point('t1', 6), point('t2', null), point('t3', 8)], 'pH');
    expect(stats.latest).toBe(8);
  });

  it('전 구간이 결측이면 값 대신 빈 상태를 돌려준다(R19)', () => {
    const stats = summarizeSeries([point('t1', null), point('t2', null)], 'pH');

    expect(stats.min).toBeNull();
    expect(stats.max).toBeNull();
    expect(stats.avg).toBeNull();
    expect(stats.latest).toBeNull();
    expect(stats.missingCount).toBe(2);
  });

  it('빈 배열도 터지지 않는다', () => {
    const stats = summarizeSeries([], 'pH');
    expect(stats.latest).toBeNull();
    expect(stats.totalCount).toBe(0);
  });
});

describe('sliceRecentHours', () => {
  const pointsPerHour = 60 / COLLECTION_INTERVAL_MINUTES;

  it('요청한 시간만큼의 표본을 남긴다', () => {
    expect(sliceRecentHours(getMeasurementSeries('S-02'), 6)).toHaveLength(6 * pointsPerHour);
    expect(sliceRecentHours(getMeasurementSeries('S-02'), 12)).toHaveLength(12 * pointsPerHour);
  });

  it('과거가 아니라 최근 구간을 남긴다', () => {
    const full = getMeasurementSeries('S-02');
    const recent = sliceRecentHours(full, 6);

    expect(recent[recent.length - 1]).toEqual(full[full.length - 1]);
  });

  it('보유 구간보다 긴 기간을 물으면 있는 만큼만 준다', () => {
    const full = getMeasurementSeries('S-02');
    expect(sliceRecentHours(full, 999)).toHaveLength(full.length);
  });
});
