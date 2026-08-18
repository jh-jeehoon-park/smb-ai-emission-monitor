import { describe, expect, it } from 'vitest';
import { SITE_SCENARIOS } from '@/shared/config/demo-scenario';
import {
  TIMELINE_POINT_COUNT,
  countDischargeHours,
  isDischargingAt,
  timelineIndexAt,
  timelineIsoAt,
} from './timeline';

const LAST = TIMELINE_POINT_COUNT - 1;

describe('timelineIndexAt', () => {
  it('timelineIsoAt의 역함수다', () => {
    for (const index of [0, 1, 137, LAST]) {
      expect(timelineIndexAt(timelineIsoAt(index))).toBe(index);
    }
  });

  it('창보다 오래된 시각은 첫 표본으로 묶는다', () => {
    expect(timelineIndexAt('2020-01-01T00:00:00Z')).toBe(0);
  });

  it('창보다 미래인 시각은 마지막 표본으로 묶는다', () => {
    expect(timelineIndexAt('2099-01-01T00:00:00Z')).toBe(LAST);
  });
});

describe('isDischargingAt — 모름과 아님을 가른다(E4)', () => {
  /** 통신 두절 사업장. 방류가 없었던 것이 아니라 수신하지 못한 것이다 */
  it('두절 사업장은 false가 아니라 null이다', () => {
    const offline = SITE_SCENARIOS.find((s) => !s.online)!;
    expect(isDischargingAt(offline.id, LAST)).toBeNull();
    expect(isDischargingAt(offline.id, 0)).toBeNull();
  });

  it('잠시 끊겼던 구간도 null이다 — 그 시간의 방류 여부는 모른다', () => {
    const brief = SITE_SCENARIOS.find((s) => s.online && s.outageStartOffset !== null)!;
    const inside = TIMELINE_POINT_COUNT - brief.outageStartOffset!;
    expect(isDischargingAt(brief.id, inside)).toBeNull();
  });

  it('중단 구간이 없는 사업장은 전 구간 방류다', () => {
    const always = SITE_SCENARIOS.find(
      (s) => s.online && s.dischargeGap === null && s.outageStartOffset === null,
    )!;
    expect(countDischargeHours(always.id, TIMELINE_POINT_COUNT)).toBe(24);
  });
});

describe('countDischargeHours', () => {
  it('두절 사업장은 0시간이 아니라 null이다', () => {
    const offline = SITE_SCENARIOS.find((s) => !s.online)!;
    expect(countDischargeHours(offline.id, TIMELINE_POINT_COUNT)).toBeNull();
  });

  /**
   * 실증 데이터(진유원 272일)의 방류 비율은 88.3%다. 시연 10개소가 그 근처에 있어야
   * "간헐방류"가 데이터에서 온 성질이라고 말할 수 있다.
   */
  it('수신 사업장 전체 방류 비율이 데이터셋 근처다', () => {
    const hours = SITE_SCENARIOS.map((s) => countDischargeHours(s.id, TIMELINE_POINT_COUNT)).filter(
      (h): h is number => h !== null,
    );
    const ratio = hours.reduce((a, b) => a + b, 0) / (hours.length * 24);

    expect(ratio).toBeGreaterThanOrEqual(0.85);
    expect(ratio).toBeLessThanOrEqual(0.92);
  });

  /** 272일 중 15일(5.5%)은 방류가 아예 없었다. 그 상태를 시연에서 볼 수 있어야 한다 */
  it('배출이 전혀 없는 사업장이 하나 있다', () => {
    const zero = SITE_SCENARIOS.filter(
      (s) => countDischargeHours(s.id, TIMELINE_POINT_COUNT) === 0,
    );
    expect(zero).toHaveLength(1);
  });

  it('부분 방류 사업장이 있다 — 24h도 0h도 아닌 값', () => {
    const partial = SITE_SCENARIOS.map((s) => countDischargeHours(s.id, TIMELINE_POINT_COUNT)).filter(
      (h) => h !== null && 0 < h && h < 24,
    );
    expect(partial.length).toBeGreaterThanOrEqual(2);
  });

  it('창을 좁히면 값이 늘지 않는다', () => {
    for (const scenario of SITE_SCENARIOS) {
      const day = countDischargeHours(scenario.id, TIMELINE_POINT_COUNT);
      const sixHours = countDischargeHours(scenario.id, TIMELINE_POINT_COUNT / 4);
      if (day === null || sixHours === null) continue;
      expect(sixHours).toBeLessThanOrEqual(day);
      expect(sixHours).toBeLessThanOrEqual(6);
    }
  });
});

