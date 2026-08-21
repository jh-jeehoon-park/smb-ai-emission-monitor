import { describe, expect, it } from 'vitest';
import { SITE_SCENARIOS } from '@/shared/config/demo-scenario';
import { CHEMICAL_SAVING_RANGE, ENERGY_SAVING_TARGET } from '../config/constants';
import { PROVISIONAL_OPERATING_GAIN } from '@/shared/config/provisional';
import type { OperatingSignals, OptimizationSummary } from '../model/types';
import { getOptimization } from './fixtures';

/** 조정 문턱을 넘는 변화를 준다 — 신호가 약하면 제안이 만들어지지 않는다(그 자체를 아래에서 검증한다) */
const SIGNALS = {
  dissolvedOxygen: { recent: 4.2, baseline: 5.4, ratio: 4.2 / 5.4 },
  flow: { recent: 280, baseline: 400, ratio: 0.7 },
};

const ONLINE = SITE_SCENARIOS.filter((s) => s.online).map((s) => s.id);
const OFFLINE = SITE_SCENARIOS.filter((s) => !s.online).map((s) => s.id);

/**
 * 판별 유니온이라 online을 좁혀야 권장값에 닿는다. 테스트에서도 단언(`!`)을 쓰지 않는다 —
 * 좁히기를 강제하는 것이 이 타입을 그렇게 만든 이유다.
 */
function onlineSummary(
  siteId: string,
  energyNow: number | null,
  signals: OperatingSignals = SIGNALS,
) {
  const summary: OptimizationSummary = getOptimization(siteId, energyNow, signals);
  if (!summary.online) throw new Error(`${siteId}는 수신 중인 사업장이어야 한다`);
  return summary;
}

describe('getOptimization', () => {
  it('같은 입력에는 같은 값을 낸다 — SSR/CSR이 갈리면 안 된다', () => {
    expect(getOptimization('S-02', 2.4, SIGNALS)).toEqual(getOptimization('S-02', 2.4, SIGNALS));
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
    const { energy } = getOptimization('S-02', 2.4, SIGNALS);
    expect(energy.current).toBeCloseTo(2.4, 3);
    expect(energy.target).toBeCloseTo(2.4 * (1 - ENERGY_SAVING_TARGET / 100), 3);
    expect(energy.savingRate).toBe(ENERGY_SAVING_TARGET);
  });

  it('계측값이 없으면 에너지 값을 만들지 않는다', () => {
    const { energy } = getOptimization('S-02', null, SIGNALS);
    expect(energy.current).toBeNull();
    expect(energy.target).toBeNull();
  });

  it('통신이 두절된 사업장은 권장값을 아예 갖지 않는다(E3)', () => {
    expect(OFFLINE.length).toBeGreaterThan(0);
    for (const id of OFFLINE) {
      const summary = getOptimization(id, 2.4, SIGNALS);
      expect(summary.online).toBe(false);
      // 판별 유니온이라 online:false 갈래에는 dosing 자체가 없다
      expect('dosing' in summary).toBe(false);
      expect('operating' in summary).toBe(false);
    }
  });

  it('두절 사업장의 산출 시각은 마지막 수신 시각이지 지금이 아니다', () => {
    for (const id of OFFLINE) {
      const summary = getOptimization(id, 2.4, SIGNALS);
      const online = getOptimization(ONLINE[0]!, 2.4, SIGNALS);
      expect(summary.computedAtIso).not.toBe(online.computedAtIso);
    }
  });
});

/**
 * **없는 제안을 만들지 않는다.** 조정폭이 난수였을 때는 신호와 무관하게 늘 세 행이 나왔다 —
 * 통신이 끊겨도, 값이 안 변해도 `+13%`를 권했다.
 */
describe('운전 조건 제안의 근거', () => {
  const flat = {
    dissolvedOxygen: { recent: 5.0, baseline: 5.0, ratio: 1 },
    flow: { recent: 400, baseline: 400, ratio: 1 },
  };

  it('신호가 없으면 DO·유량 제안을 만들지 않는다', () => {
    const { operating } = onlineSummary('S-02', 2.4, {
      dissolvedOxygen: { recent: null, baseline: null, ratio: null },
      flow: { recent: null, baseline: null, ratio: null },
    });
    expect(operating.some((a) => a.id === 'aeration')).toBe(false);
    expect(operating.some((a) => a.id === 'inlet-pump')).toBe(false);
  });

  /** 문턱을 두지 않으면 잡음마다 설비를 흔들라고 권한다 */
  it('변화가 문턱 아래면 조정을 권하지 않는다 — 0%를 내지 않는다', () => {
    const { operating } = onlineSummary('S-02', 2.4, flat);
    expect(operating.every((a) => a.deltaPercent !== 0)).toBe(true);
    expect(operating.some((a) => a.id === 'aeration')).toBe(false);
  });

  /** `폭기량 감소 → DO 저하 → 질산화 저해 → TN 증가` `[원문 p.24·62]`의 방향이다 */
  it('DO가 내려가면 폭기량을 올린다', () => {
    const { operating } = onlineSummary('S-02', 2.4, SIGNALS);
    const aeration = operating.find((a) => a.id === 'aeration');
    expect(aeration?.deltaPercent).toBeGreaterThan(0);
  });

  it('DO가 올라가면 폭기량을 내린다 — 전력을 줄일 여지다', () => {
    const { operating } = onlineSummary('S-02', 2.4, {
      ...flat,
      dissolvedOxygen: { recent: 6.5, baseline: 5.0, ratio: 1.3 },
    });
    expect(operating.find((a) => a.id === 'aeration')?.deltaPercent).toBeLessThan(0);
  });

  it('유입 유량이 줄면 펌프 속도도 내린다', () => {
    const { operating } = onlineSummary('S-02', 2.4, SIGNALS);
    expect(operating.find((a) => a.id === 'inlet-pump')?.deltaPercent).toBeLessThan(0);
  });

  /**
   * 계측이 튀는 순간 `+180%`가 나오면 그것이 곧 안전 문제다 — 우리는 제어하지 않지만
   * (REQ-CO-002 미구현) 운영자가 손으로 따라 할 수 있다.
   *
   * **주입 속도는 이 상한을 받지 않는다** — 그 값은 우리 배율이 아니라 원문 약품 절감률
   * 20~30% `[원문 p.27·31]`을 따라가므로 20%로 자르면 원문과 어긋난다.
   */
  it('계측에서 낸 조정폭에는 상한이 있다', () => {
    const { operating } = onlineSummary('S-02', 2.4, {
      dissolvedOxygen: { recent: 0.1, baseline: 5.0, ratio: 0.02 },
      flow: { recent: 4000, baseline: 400, ratio: 10 },
    });
    /*
     * **상한 자체를 숫자로 못박는다.** `maxPercent`를 그대로 비교하면 누가 상수를 500으로
     * 올려도 통과한다 — 안전 한계는 파생시키면 안 된다. 실제로 깨뜨려 확인했다.
     */
    expect(PROVISIONAL_OPERATING_GAIN.maxPercent).toBeLessThanOrEqual(25);

    const fromMeasurement = operating.filter((a) => a.id !== 'dosing-pump');
    expect(fromMeasurement.length).toBe(2);
    for (const advice of fromMeasurement) {
      expect(Math.abs(advice.deltaPercent)).toBeLessThanOrEqual(
        PROVISIONAL_OPERATING_GAIN.maxPercent,
      );
    }
  });

  it('주입 속도는 권장 주입량 절감률을 그대로 따른다', () => {
    const summary = onlineSummary('S-02', 2.4, SIGNALS);
    const pump = summary.operating.find((a) => a.id === 'dosing-pump');
    expect(pump?.deltaPercent).toBe(-Math.round(summary.dosing.savingRate));
  });

  /** 계측을 근거로 말하려면 그 값이 화면에 있어야 한다(E3) */
  it('모든 제안이 관측값을 함께 낸다', () => {
    const { operating } = onlineSummary('S-02', 2.4, SIGNALS);
    expect(operating.length).toBeGreaterThan(0);
    for (const advice of operating) {
      expect(advice.observed.length).toBeGreaterThan(0);
      expect(advice.reason.length).toBeGreaterThan(0);
    }
  });
});
