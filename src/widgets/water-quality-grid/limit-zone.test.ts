import { describe, expect, it } from 'vitest';
import { DISCHARGE_LIMITS } from '@/shared/config/discharge-limits';
import { limitZone } from './lib/limit-zone';

const USER_MAX = {
  ...DISCHARGE_LIMITS,
  TOC: { min: null, max: 40, source: '사업장 설정', unavailableReason: null },
};

describe('기준에 맞춘 y축', () => {
  it('양방향 기준은 위아래를 모두 축에 넣는다', () => {
    const zone = limitZone('pH', [7, 7.2], DISCHARGE_LIMITS)!;
    expect(zone.min).toBe(5.8);
    expect(zone.max).toBe(8.6);
    expect(zone.domain[0]).toBeLessThan(5.8);
    expect(zone.domain[1]).toBeGreaterThan(8.6);
  });

  /**
   * **사용자가 상한을 넣으면 축이 그것에 맞아야 한다.** 예전에는 `min`이 없으면 `null`을
   * 돌려줘서, 값을 넣어도 격자가 계속 `기준값 미확정`으로 적고 y축은 데이터에 붙었다.
   */
  it('상한만 있는 기준도 축을 낸다', () => {
    const zone = limitZone('TOC', [24, 28], USER_MAX)!;
    expect(zone.min).toBeNull();
    expect(zone.max).toBe(40);
    expect(zone.domain[1]).toBeGreaterThan(40);
  });

  /** 눈금이 데이터에 따라 달라지면 "같은 항목의 모든 사업장이 같은 눈금"이 깨진다 */
  it('기준 안에 있는 값들은 축을 흔들지 않는다', () => {
    const a = limitZone('TOC', [10, 12], USER_MAX)!;
    const b = limitZone('TOC', [30, 33], USER_MAX)!;
    expect(a.domain[1]).toBe(b.domain[1]);
  });

  it('기준을 넘은 값이 있으면 그 값까지 넓힌다 — 잘리면 초과를 못 본다', () => {
    const zone = limitZone('TOC', [24, 52], USER_MAX)!;
    expect(zone.domain[1]).toBeGreaterThan(52);
  });

  it('기준을 모르는 항목은 축을 내지 않는다', () => {
    expect(limitZone('TOC', [24, 28], DISCHARGE_LIMITS)).toBeNull();
  });
});
