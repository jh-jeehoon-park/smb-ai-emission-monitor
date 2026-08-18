import { describe, expect, it } from 'vitest';
import { ALARMS } from './api/fixtures';
import { raisedWhileNotDischarging } from './lib/discharge-context';

const waterQuality = ALARMS.filter(
  (a) => a.condition === 'pollutionSurge' || a.condition === 'qualityShift',
);

describe('raisedWhileNotDischarging', () => {
  it('수질 계열이 아닌 알람은 방류와 무관하다', () => {
    const others = ALARMS.filter((a) => !waterQuality.includes(a));
    expect(others.length).toBeGreaterThan(0);
    for (const alarm of others) {
      expect(raisedWhileNotDischarging(alarm)).toBe(false);
    }
  });

  /**
   * 시연에서 이 구분을 보여줄 사례가 실제로 있어야 한다.
   * 시나리오의 방류 중단 구간이나 알람 시각이 바뀌어 사례가 사라지면 여기서 걸린다.
   */
  it('비방류 중 발생한 수질 알람이 정확히 하나 있다', () => {
    const flagged = waterQuality.filter(raisedWhileNotDischarging);
    expect(flagged).toHaveLength(1);
    expect(flagged[0]!.siteId).toBe('S-10');
  });

  it('나머지 수질 알람은 방류 중 발생이라 표시가 붙지 않는다', () => {
    const clean = waterQuality.filter((a) => a.siteId !== 'S-10');
    expect(clean.length).toBeGreaterThan(0);
    for (const alarm of clean) {
      expect(raisedWhileNotDischarging(alarm)).toBe(false);
    }
  });
});
