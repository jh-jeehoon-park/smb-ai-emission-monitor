import { describe, expect, it } from 'vitest';
import { PROVISIONAL_STATUS_LABELS } from '@/shared/config/provisional';
import { SITES } from '@/entities/site';
import { buildSiteReport, toCsv } from './build-report';

const HOURS = 24;

describe('buildSiteReport', () => {
  it('실증 사업장 전체를 한 행씩 낸다', () => {
    expect(buildSiteReport(HOURS)).toHaveLength(SITES.length);
  });

  it('통신이 두절된 사업장은 집계값을 비우고 결측만 센다', () => {
    const rows = buildSiteReport(HOURS);
    const offline = rows.filter((row) => !row.online);

    expect(offline.length).toBeGreaterThan(0);
    for (const row of offline) {
      expect(row.latestScore).toBeNull();
      expect(row.maxScore).toBeNull();
      expect(row.avgScore).toBeNull();
      // 0으로 채우면 평균 이상 점수가 낮아져 상태가 실제보다 좋아 보인다
      expect(row.missingCount).toBe(row.totalCount);
    }
  });

  it('결측이 있어도 수신된 표본만으로 평균을 낸다', () => {
    const rows = buildSiteReport(HOURS).filter((row) => row.online && row.missingCount > 0);

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.avgScore).not.toBeNull();
      expect(row.missingCount).toBeLessThan(row.totalCount);
    }
  });

  it('집계 구간을 좁히면 표본 수도 함께 줄어든다', () => {
    const short = buildSiteReport(6).find((row) => row.online)!;
    const long = buildSiteReport(24).find((row) => row.online)!;

    expect(short.totalCount).toBeLessThan(long.totalCount);
  });

  it('이상 점수는 0~100 범위를 벗어나지 않는다', () => {
    for (const row of buildSiteReport(HOURS)) {
      if (row.maxScore === null) continue;
      expect(row.maxScore).toBeGreaterThanOrEqual(0);
      expect(row.maxScore).toBeLessThanOrEqual(100);
    }
  });
});

describe('toCsv', () => {
  const csv = () => toCsv(buildSiteReport(HOURS), PROVISIONAL_STATUS_LABELS);

  it('헤더 1줄과 사업장 수만큼의 본문을 낸다', () => {
    expect(csv().split('\n')).toHaveLength(SITES.length + 1);
  });

  it('모든 행의 열 수가 헤더와 같다', () => {
    const lines = csv().split('\n');
    const headerCols = lines[0]!.split(',').length;

    for (const line of lines.slice(1)) {
      expect(line.split(',')).toHaveLength(headerCols);
    }
  });

  it('값이 없는 칸은 0이 아니라 빈 칸이다 — 표의 —와 같은 뜻이어야 한다', () => {
    const offline = buildSiteReport(HOURS).find((row) => !row.online)!;
    const line = csv()
      .split('\n')
      .find((l) => l.startsWith(offline.siteId))!;
    const cells = line.split(',');

    // 최신·최대·평균 이상 점수 3칸
    expect(cells.slice(5, 8)).toEqual(['', '', '']);
  });

  it('구분자를 깨뜨리는 값이 섞여 있지 않다', () => {
    for (const row of buildSiteReport(HOURS)) {
      for (const field of [row.siteId, row.siteName, row.region, row.industry]) {
        expect(field).not.toContain(',');
        expect(field).not.toContain('\n');
        expect(field).not.toContain('"');
      }
    }
  });
});
