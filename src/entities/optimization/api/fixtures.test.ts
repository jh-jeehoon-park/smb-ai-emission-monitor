import { describe, expect, it } from 'vitest';
import { SITE_SCENARIOS } from '@/shared/config/demo-scenario';
import { CHEMICAL_SAVING_RANGE, ENERGY_SAVING_TARGET } from '../config/constants';
import type { OptimizationSummary } from '../model/types';
import { getOptimization } from './fixtures';

const ONLINE = SITE_SCENARIOS.filter((s) => s.online).map((s) => s.id);
const OFFLINE = SITE_SCENARIOS.filter((s) => !s.online).map((s) => s.id);

/**
 * 판별 유니온이라 online을 좁혀야 권장값에 닿는다. 테스트에서도 단언(`!`)을 쓰지 않는다 —
 * 좁히기를 강제하는 것이 이 타입을 그렇게 만든 이유다.
 */
function onlineSummary(siteId: string, energyNow: number | null) {
  const summary: OptimizationSummary = getOptimization(siteId, energyNow);
  if (!summary.online) throw new Error(`${siteId}는 수신 중인 사업장이어야 한다`);
  return summary;
}

describe('getOptimization', () => {
  it('같은 입력에는 같은 값을 낸다 — SSR/CSR이 갈리면 안 된다', () => {
    expect(getOptimization('S-02', 2.4)).toEqual(getOptimization('S-02', 2.4));
  });

  it('약품 절감률이 원문 검증 수준 안에 든다', () => {
    for (const id of ONLINE) {
      const { dosing } = onlineSummary(id, 2.4);
      expect(dosing.savingRate).toBeGreaterThanOrEqual(CHEMICAL_SAVING_RANGE[0]);
      expect(dosing.savingRate).toBeLessThanOrEqual(CHEMICAL_SAVING_RANGE[1]);
    }
  });

  it('권장 주입량이 현재보다 적고 절감률과 맞아떨어진다', () => {
    for (const id of ONLINE) {
      const { dosing } = onlineSummary(id, 2.4);
      expect(dosing.recommendedDose).toBeLessThan(dosing.currentDose);
      expect(dosing.recommendedDose).toBeCloseTo(
        dosing.currentDose * (1 - dosing.savingRate / 100),
        1,
      );
    }
  });

  it('AI 산출값에는 근거가 함께 붙는다(E3)', () => {
    for (const id of ONLINE) {
      const summary = onlineSummary(id, 2.4);
      expect(summary.dosing.basis.length).toBeGreaterThan(0);
      for (const advice of summary.operating) {
        expect(advice.reason.length).toBeGreaterThan(0);
      }
    }
  });

  it('에너지 목표가 현재값에서 원문 절감률만큼 내려간다', () => {
    const { energy } = getOptimization('S-02', 2.4);
    expect(energy.current).toBeCloseTo(2.4, 3);
    expect(energy.target).toBeCloseTo(2.4 * (1 - ENERGY_SAVING_TARGET / 100), 3);
    expect(energy.savingRate).toBe(ENERGY_SAVING_TARGET);
  });

  it('계측값이 없으면 에너지 값을 만들지 않는다', () => {
    const { energy } = getOptimization('S-02', null);
    expect(energy.current).toBeNull();
    expect(energy.target).toBeNull();
  });

  it('통신이 두절된 사업장은 권장값을 아예 갖지 않는다(E3)', () => {
    expect(OFFLINE.length).toBeGreaterThan(0);
    for (const id of OFFLINE) {
      const summary = getOptimization(id, 2.4);
      expect(summary.online).toBe(false);
      // 판별 유니온이라 online:false 갈래에는 dosing 자체가 없다
      expect('dosing' in summary).toBe(false);
      expect('operating' in summary).toBe(false);
    }
  });

  it('두절 사업장의 산출 시각은 마지막 수신 시각이지 지금이 아니다', () => {
    for (const id of OFFLINE) {
      const summary = getOptimization(id, 2.4);
      const online = getOptimization(ONLINE[0]!, 2.4);
      expect(summary.computedAtIso).not.toBe(online.computedAtIso);
    }
  });
});
