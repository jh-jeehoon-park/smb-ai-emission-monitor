import { describe, expect, it } from 'vitest';
import { DISCHARGE_LIMITS } from '@/shared/config/discharge-limits';
import { countOverLimit, type MeasurementPoint } from '@/entities/measurement';
import { limitZone } from './lib/limit-zone';

const point = (pH: number | null): MeasurementPoint =>
  ({ t: '2026-08-21T00:00:00Z', pH }) as MeasurementPoint;

describe('기준 구간 — 기준이 있는 항목만 그린다', () => {
  it('pH는 구간을 갖는다', () => {
    const zone = limitZone('pH', [7.0, 7.2]);
    expect(zone).not.toBeNull();
    expect(zone!.min).toBe(5.8);
    expect(zone!.max).toBe(8.6);
  });

  /** 선을 그으려면 지역구분·배출량 규모 표가 있어야 한다 — 없으면 긋지 않는다 */
  it('TOC·EC·수온은 구간이 없다', () => {
    for (const code of ['TOC', 'EC', 'temperature'] as const) {
      expect(limitZone(code, [10, 20])).toBeNull();
    }
  });
});

describe('y축이 기준을 담는다 — 사업장끼리 비교되게', () => {
  /** 값이 기준 한가운데여도 dataMin~dataMax로 두면 화면 가득 요동쳐 보인다 */
  it('데이터가 좁아도 축은 기준 밖까지 열린다', () => {
    const zone = limitZone('pH', [7.0, 7.05])!;
    expect(zone.domain[0]).toBeLessThan(5.8);
    expect(zone.domain[1]).toBeGreaterThan(8.6);
  });

  it('같은 항목이면 사업장이 달라도 같은 축을 쓴다', () => {
    const low = limitZone('pH', [5.94, 6.7])!;
    const high = limitZone('pH', [7.5, 8.27])!;
    expect(low.domain).toEqual(high.domain);
  });

  /** 넘은 값이 축 밖으로 잘리면 초과를 눈으로 못 본다 */
  it('기준을 넘은 값이 있으면 축이 그 값까지 넓어진다', () => {
    const zone = limitZone('pH', [9.4])!;
    expect(zone.domain[1]).toBeGreaterThanOrEqual(9.4);
  });

  it('전 구간 결측이어도 축은 기준으로 정해진다', () => {
    const zone = limitZone('pH', [null, null])!;
    expect(zone.domain[0]).toBeLessThan(5.8);
    expect(zone.domain[1]).toBeGreaterThan(8.6);
  });
});

describe('초과 건수 — 모름과 없음을 구분한다(E4)', () => {
  it('기준이 없는 항목은 0이 아니라 null이다', () => {
    expect(countOverLimit([], 'TOC')).toBeNull();
    expect(countOverLimit([], 'EC')).toBeNull();
  });

  it('기준 안이면 0건이다', () => {
    expect(countOverLimit([point(7.0), point(8.6), point(5.8)], 'pH')).toBe(0);
  });

  it('벗어난 표본만 센다', () => {
    expect(countOverLimit([point(5.79), point(7.0), point(8.61)], 'pH')).toBe(2);
  });

  /** 수신하지 못한 것이지 기준 안에 있었던 것이 아니다 */
  it('결측은 세지 않는다', () => {
    expect(countOverLimit([point(null), point(null)], 'pH')).toBe(0);
  });
});

describe('화면이 기준의 출처를 잃지 않는다', () => {
  it('pH 기준에는 허가증 확인 문구가 붙어 있다', () => {
    expect(DISCHARGE_LIMITS.pH?.source).toContain('허가증');
  });
});
