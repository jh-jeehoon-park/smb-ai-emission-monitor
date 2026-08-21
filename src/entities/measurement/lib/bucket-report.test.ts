import { describe, expect, it } from 'vitest';
import { COLLECTION_INTERVAL_MINUTES } from '@/shared/config/measurement';
import { TIMELINE_POINT_COUNT } from '@/shared/lib/timeline';
import { bucketByMinutes, getMeasurementSeries, summarizeSeries } from '@/entities/measurement';
import { BUCKET_MINUTES } from '../config/constants';
import { buildBucketReport, bucketReportToCsv } from './bucket-report';

const ONLINE = getMeasurementSeries('S-02');
const OFFLINE = getMeasurementSeries('S-04');
const CODES = ['pH', 'DO'] as const;

describe('구간 묶기', () => {
  it('1시간이면 24구간이다 — 창이 24시간이고 주기가 5분이다', () => {
    const buckets = bucketByMinutes(ONLINE, 60);
    expect(buckets).toHaveLength(TIMELINE_POINT_COUNT / (60 / COLLECTION_INTERVAL_MINUTES));
    expect(buckets).toHaveLength(24);
  });

  it('원시 단위는 표본마다 한 구간이다', () => {
    expect(bucketByMinutes(ONLINE, COLLECTION_INTERVAL_MINUTES)).toHaveLength(ONLINE.length);
  });

  /** 표본을 잃거나 겹치면 리포트가 하루를 다 덮지 못한다 */
  it('구간의 표본을 합치면 원래 계열이 된다', () => {
    const flat = bucketByMinutes(ONLINE, 60).flatMap((b) => b.points);
    expect(flat).toHaveLength(ONLINE.length);
    expect(flat[0]).toBe(ONLINE[0]);
    expect(flat[flat.length - 1]).toBe(ONLINE[ONLINE.length - 1]);
  });

  it('구간 시작 시각이 첫 표본의 시각이다', () => {
    const buckets = bucketByMinutes(ONLINE, 60);
    expect(buckets[0]!.startIso).toBe(ONLINE[0]!.t);
  });

  it('빈 계열은 구간을 만들지 않는다 — 빈 행은 그 시간이 있었다는 말이 되지 않는다', () => {
    expect(bucketByMinutes([], 60)).toHaveLength(0);
  });
});

describe('구간 리포트', () => {
  const rows = buildBucketReport(ONLINE, CODES, '1h', 'avg');

  it('구간마다 고른 통계를 낸다', () => {
    const buckets = bucketByMinutes(ONLINE, BUCKET_MINUTES['1h']);
    /* 통계를 여기서 다시 계산하지 않는다 — 요약표와 같은 함수를 써야 값이 갈리지 않는다(E1) */
    expect(rows[0]!.values.pH).toBe(summarizeSeries(buckets[0]!.points, 'pH').avg);
  });

  it('통계를 바꾸면 값도 바뀐다', () => {
    const min = buildBucketReport(ONLINE, CODES, '1h', 'min');
    const max = buildBucketReport(ONLINE, CODES, '1h', 'max');
    expect(min[0]!.values.pH).toBeLessThanOrEqual(max[0]!.values.pH!);
  });

  /**
   * 항목마다 결측이 다르다. **가장 많이 빠진 항목으로 센다** — 평균을 내면 한 항목이 통째로
   * 빠진 것이 묻힌다.
   */
  it('구간 결측은 항목 중 가장 큰 값이다', () => {
    const buckets = bucketByMinutes(ONLINE, BUCKET_MINUTES['1h']);
    rows.forEach((row, i) => {
      const each = CODES.map((code) => summarizeSeries(buckets[i]!.points, code).missingCount);
      expect(row.missingCount).toBe(Math.max(...each));
    });
  });

  it('통신 두절 사업장은 값이 0이 아니라 null이다(E4)', () => {
    const offline = buildBucketReport(OFFLINE, CODES, '1h', 'avg');
    expect(offline.every((row) => row.values.pH === null)).toBe(true);
    expect(offline.every((row) => row.missingCount === row.totalCount)).toBe(true);
  });
});

describe('구간 리포트 CSV', () => {
  const rows = buildBucketReport(ONLINE, CODES, '1h', 'avg');
  const csv = bucketReportToCsv(rows, CODES, 'avg');
  const lines = csv.split('\n');

  it('머리글 + 구간 수만큼의 행이다', () => {
    expect(lines).toHaveLength(rows.length + 1);
  });

  it('머리글에 항목·통계·단위가 함께 있다 — 파일만 보고도 무엇인지 알아야 한다', () => {
    expect(lines[0]).toContain('pH 평균');
    expect(lines[0]).toContain('DO 평균(mg/L)');
    expect(lines[0]).toContain('결측표본');
  });

  it('값이 없으면 0이 아니라 빈 칸이다', () => {
    const offlineCsv = bucketReportToCsv(
      buildBucketReport(OFFLINE, CODES, '1h', 'avg'),
      CODES,
      'avg',
    );
    /* `시각,,,24,12` 처럼 값 칸이 비어야 한다 */
    expect(offlineCsv.split('\n')[1]).toMatch(/,,/);
  });
});
