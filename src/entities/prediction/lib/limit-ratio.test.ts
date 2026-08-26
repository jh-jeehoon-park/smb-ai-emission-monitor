import { describe, expect, it } from 'vitest';
import { DISCHARGE_LIMITS, type DischargeLimitTable } from '@/shared/config/discharge-limits';
import { LIMIT_BASE_PERCENT, buildOverlayRows, toLimitPercent } from './limit-ratio';
import type { ForecastSummary } from '../model/types';

const WITH_TOC: DischargeLimitTable = {
  ...DISCHARGE_LIMITS,
  TOC: { min: null, max: 40, source: '테스트', unavailableReason: null },
};

describe('기준 대비 비율', () => {
  it('기준의 절반이면 50%다', () => {
    expect(toLimitPercent(20, 'TOC', WITH_TOC)).toBe(50);
  });

  /** 기준선이 곧 100이라 이 값이 화면의 가로선과 같은 자리에 놓인다 */
  it('기준과 같으면 기준선 위에 놓인다', () => {
    expect(toLimitPercent(40, 'TOC', WITH_TOC)).toBe(LIMIT_BASE_PERCENT);
  });

  /**
   * **없는 것을 0으로 두지 않는다**(E4). 0은 "기준의 0%"라는 사실 주장이고, 그리면
   * 바닥에 붙어 가장 안전한 항목으로 보인다.
   */
  it('값이 없으면 판정하지 않는다', () => {
    expect(toLimitPercent(null, 'TOC', WITH_TOC)).toBeNull();
  });

  it('기준이 없으면 판정하지 않는다', () => {
    expect(toLimitPercent(20, 'TOC', DISCHARGE_LIMITS)).toBeNull();
  });

  /** 나눗셈이 무한대가 되는 자리 — 화면에서는 축이 통째로 무너진다 */
  it('기준이 0이면 판정하지 않는다', () => {
    const zero: DischargeLimitTable = {
      TOC: { min: null, max: 0, source: '테스트', unavailableReason: null },
    };
    expect(toLimitPercent(20, 'TOC', zero)).toBeNull();
  });
});

const summary = (code: string, points: [string, number | null][]): ForecastSummary =>
  ({
    code,
    points: points.map(([t, value]) => ({ t, value })),
  }) as unknown as ForecastSummary;

describe('겹침 행 만들기', () => {
  /**
   * **시각으로 맞춘다.** 배열 순서에 기대면 한 계열만 표본이 밀려도 전부 어긋나는데
   * 그것이 화면에서는 보이지 않는다.
   */
  it('같은 시각이면 한 줄에 모인다', () => {
    const rows = buildOverlayRows([
      summary('TOC', [['b', 2], ['a', 1]]),
      summary('TN', [['a', 10], ['b', 20]]),
    ]);

    expect(rows.map((r) => r.t)).toEqual(['a', 'b']);
    expect(rows[0]).toEqual({ t: 'a', TOC: 1, TN: 10 });
  });

  it('기준표를 주면 비율로 싣는다', () => {
    const rows = buildOverlayRows([summary('TOC', [['a', 20]])], WITH_TOC);
    expect(rows[0]!.TOC).toBe(50);
  });

  /** 한 계열에만 있는 시각도 줄을 만든다 — 빠뜨리면 그 구간이 화면에서 사라진다 */
  it('한쪽에만 있는 시각도 남는다', () => {
    const rows = buildOverlayRows([summary('TOC', [['a', 1]]), summary('TN', [['b', 2]])]);
    expect(rows).toHaveLength(2);
    expect(rows[0]!.TN).toBeUndefined();
  });
});
