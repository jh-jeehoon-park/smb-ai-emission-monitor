import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { getScenario, siteSeed } from '@/shared/config/demo-scenario';
import { PROVISIONAL_DOSING_UNIT } from '@/shared/config/provisional';
import { clamp, createRng, roundTo } from '@/shared/lib/prng';
import {
  CHEMICAL_SAVING_RANGE,
  DOSING_DECIMALS,
  ENERGY_SAVING_TARGET,
  OPTIMIZATION_MODEL_LABEL,
} from '../config/constants';
import type { DosingAdvice, OperatingAdvice, OptimizationSummary } from '../model/types';

/** 시연용 기준 주입량. 단위와 마찬가지로 원문에 없다(PROVISIONAL) */
const BASE_DOSE = 38;

const INPUT_WINDOW_LABEL = '최근 24시간 운전·계측 데이터';

/**
 * 이상 상황이 심한 사업장일수록 약품을 더 붓고 있다고 본다.
 * 원문의 인과(약품 주입량 감소 → 응집 효율 저하 → SS·TP 증가, 사업계획서 p.24·p.63)를
 * 뒤집어 놓은 것이며, 과투입이 곧 절감 여지가 된다.
 */
function buildDosing(intensity: number, rng: () => number): DosingAdvice {
  const currentDose = roundTo(
    BASE_DOSE * (1 + intensity * 0.5) + (rng() - 0.5) * 4,
    DOSING_DECIMALS,
  );

  const [minSaving, maxSaving] = CHEMICAL_SAVING_RANGE;
  const savingRate = roundTo(minSaving + rng() * (maxSaving - minSaving), DOSING_DECIMALS);
  const recommendedDose = roundTo(currentDose * (1 - savingRate / 100), DOSING_DECIMALS);

  const basis = ['최근 24시간 TOC·탁도 추이', '응집 효율 대비 과투입 구간 탐지'];
  if (intensity > 0.5) basis.push('이상 점수 상승 구간에서 주입량이 함께 올라감');

  return { currentDose, recommendedDose, unit: PROVISIONAL_DOSING_UNIT, savingRate, basis };
}

/**
 * 절대 단위(폭기량 m³/min, 펌프 회전수 rpm 등)가 원문에 없다.
 * 값을 지어내지 않고 **현재 대비 상대 변화**만 낸다 — 방향과 크기만으로도
 * 운전자가 판단할 수 있고, 단위가 확정되면 그때 절대값을 붙이면 된다.
 */
function buildOperating(intensity: number, rng: () => number): OperatingAdvice[] {
  const aeration = Math.round(clamp(4 + intensity * 9 + rng() * 3, 2, 18));
  const pump = -Math.round(clamp(2 + rng() * 6, 1, 10));

  return [
    {
      id: 'aeration',
      parameter: '폭기량',
      target: '폭기 블로워',
      deltaPercent: aeration,
      reason: 'DO 하한 여유가 좁아 응집·질산화 효율이 떨어지는 구간이 있다',
    },
    {
      id: 'inlet-pump',
      parameter: '펌프 속도',
      target: '유입 펌프',
      deltaPercent: pump,
      reason: '유입 부하가 낮은 시간대에 정격으로 돌고 있다',
    },
    {
      id: 'dosing-pump',
      parameter: '주입 속도',
      target: '약품주입 펌프',
      deltaPercent: -Math.round(clamp(6 + intensity * 8, 4, 20)),
      reason: '권장 주입량에 맞춰 속도를 낮춘다',
    },
  ];
}

/**
 * 에너지 효율의 **현재값은 여기서 만들지 않는다.** 계측 전력·유량에서 계산해야 하는데
 * 그것은 measurement slice의 몫이고 slice끼리는 참조하지 않는다(FSD §8).
 * 화면이 계산한 값을 넣어 주면 목표값을 붙여 돌려준다.
 */
export function getOptimization(siteId: string, energyNow: number | null): OptimizationSummary {
  const scenario = getScenario(siteId);
  const intensity = scenario.eventRise / 74;

  const energy = {
    current: energyNow === null ? null : roundTo(energyNow, 3),
    target: energyNow === null ? null : roundTo(energyNow * (1 - ENERGY_SAVING_TARGET / 100), 3),
    savingRate: ENERGY_SAVING_TARGET,
  };

  // 통신이 끊기면 최적화도 산출되지 않는다. 옛 권장값을 현재값처럼 두지 않는다(E3)
  if (!scenario.online) {
    return {
      online: false,
      computedAtIso: '2026-08-11T13:35:00Z',
      inputWindowLabel: INPUT_WINDOW_LABEL,
      modelLabel: OPTIMIZATION_MODEL_LABEL,
      energy,
    };
  }

  const rng = createRng(siteSeed(siteId, 31337));

  return {
    online: true,
    computedAtIso: DEMO_NOW_ISO,
    inputWindowLabel: INPUT_WINDOW_LABEL,
    modelLabel: OPTIMIZATION_MODEL_LABEL,
    energy,
    dosing: buildDosing(intensity, rng),
    operating: buildOperating(intensity, rng),
  };
}
