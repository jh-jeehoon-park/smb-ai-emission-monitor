import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { getScenario, siteSeed } from '@/shared/config/demo-scenario';
import { MEASUREMENT_ITEMS } from '@/shared/config/measurement';
import { PROVISIONAL_DOSING_UNIT, toOperatingDelta } from '@/shared/config/provisional';
import { createRng, roundTo } from '@/shared/lib/prng';
import {
  CHEMICAL_SAVING_RANGE,
  DOSING_DECIMALS,
  ENERGY_SAVING_TARGET,
  OPERATING_WINDOW,
  OPTIMIZATION_MODEL_LABEL,
} from '../config/constants';
import type {
  DosingAdvice,
  OperatingAdvice,
  OperatingSignal,
  OperatingSignals,
  OptimizationSummary,
} from '../model/types';

/** 시연용 기준 주입량. 단위와 마찬가지로 원문에 없다(PROVISIONAL) */
const BASE_DOSE = 38;

const INPUT_WINDOW_LABEL = '최근 24시간 운전·계측 데이터';

/** 신호가 없는 상태. 계측을 넘기지 않은 화면이 이 값을 받는다 */
const EMPTY_SIGNAL: OperatingSignal = { recent: null, baseline: null, ratio: null };
const NO_SIGNALS: OperatingSignals = { dissolvedOxygen: EMPTY_SIGNAL, flow: EMPTY_SIGNAL };

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
 * 운전 조건 제안 — **계측이 방향과 근거를 준다** `[사용자 결정 2026-08-21]`.
 *
 * 절대 단위(폭기량 m³/min, 펌프 회전수 rpm 등)가 원문에 없어 **현재 대비 상대 변화**만 낸다.
 *
 * 방향은 원문의 인과에서 온다.
 * - 폭기량 — `폭기량 감소 → DO 저하 → 질산화 저해 → TN 증가` `[원문 p.24·62]`. DO가 내려가는
 *   중이면 폭기량을 올린다(부호 `-1`).
 * - 펌프 속도 — 유입 유량이 줄었는데 정격으로 돌 이유가 없다(부호 `+1`).
 * - 주입 속도 — 우리가 권한 주입량을 따라간다. 공식은 아직 없다 `[TBD-51]`.
 *
 * 크기는 `PROVISIONAL_OPERATING_GAIN`이 정한다 — 원문이 "몇 %"를 주지 않는다.
 *
 * **신호가 없으면 그 행을 만들지 않는다.** 통신이 두절되거나 그 항목이 전부 결측이면 조정을
 * 권할 근거가 없다 — `0%`를 내면 "조정할 필요가 없다고 판단했다"는 사실 주장이 된다(E4).
 */
function buildOperating(signals: OperatingSignals, dosing: DosingAdvice): OperatingAdvice[] {
  const advices: OperatingAdvice[] = [];
  const { dissolvedOxygen, flow } = signals;

  const show = (signal: OperatingSignal, code: 'DO' | 'flow') => {
    const item = MEASUREMENT_ITEMS[code];
    const fmt = (v: number | null) => (v === null ? '—' : v.toFixed(item.decimals));
    return `${item.label} ${fmt(signal.baseline)} → ${fmt(signal.recent)} ${item.unit}`;
  };

  /* DO가 내려가면 폭기량을 올린다 — 부호가 원문 인과다 */
  const aeration = toOperatingDelta(dissolvedOxygen.ratio, -1);
  if (aeration !== null) {
    advices.push({
      id: 'aeration',
      parameter: '폭기량',
      target: '폭기 블로워',
      deltaPercent: aeration,
      observed: `${show(dissolvedOxygen, 'DO')} (최근 ${OPERATING_WINDOW.recentHours}시간 vs 직전 ${OPERATING_WINDOW.baselineHours}시간)`,
      reason:
        aeration > 0
          ? '폭기 감소는 질산화를 저해해 TN을 올린다 [원문 p.24·62]'
          : 'DO 여유가 늘어 폭기에 쓰는 전력을 줄일 수 있다 [원문 p.67 에너지 효율]',
    });
  }

  /* 유입 유량이 줄면 펌프 속도도 줄인다 */
  const pump = toOperatingDelta(flow.ratio, 1);
  if (pump !== null) {
    advices.push({
      id: 'inlet-pump',
      parameter: '펌프 속도',
      target: '유입 펌프',
      deltaPercent: pump,
      observed: `${show(flow, 'flow')} (같은 창)`,
      reason:
        pump > 0
          ? '유입 부하가 늘었다 — 정격을 넘기지 않는 범위에서 올린다 [설계]'
          : '유입 부하가 낮은데 정격으로 돌고 있다 [설계]',
    });
  }

  /*
   * 주입 속도는 **우리가 권한 주입량을 따라간다.** 계측에서 직접 내지 않는 이유는 산정 공식이
   * 아직 없기 때문이다 `[TBD-51]` — 회의가 "약품 탱크에 유량계가 붙어 있다"고 확인해 줬으나
   * 그 값으로 주입량을 계산하는 식은 받지 못했다.
   */
  if (dosing.savingRate > 0) {
    advices.push({
      id: 'dosing-pump',
      parameter: '주입 속도',
      target: '약품주입 펌프',
      /* 상한을 걸지 않는다 — 우리 배율이 아니라 원문 절감률 20~30%를 따라간다 `[원문 p.27·31]` */
      deltaPercent: -Math.round(dosing.savingRate),
      observed: `권장 주입량 ${dosing.recommendedDose} ${dosing.unit} · 현재 ${dosing.currentDose} ${dosing.unit}`,
      reason: '권장 주입량에 맞춘다 — 산정 공식은 미확보 [TBD-51]',
    });
  }

  return advices;
}

/**
 * 에너지 효율의 **현재값은 여기서 만들지 않는다.** 계측 전력·유량에서 계산해야 하는데
 * 그것은 measurement slice의 몫이고 slice끼리는 참조하지 않는다(FSD §8).
 * 화면이 계산한 값을 넣어 주면 목표값을 붙여 돌려준다.
 */
export function getOptimization(
  siteId: string,
  energyNow: number | null,
  /**
   * 운전 조건 제안이 볼 계측 신호. **넘기지 않으면 운전 조건을 만들지 않는다.**
   *
   * 비용 절감 현황·관리자 요약은 약품·에너지만 쓴다 — 그 화면들에 계측 신호 계산을 강제하면
   * 쓰지도 않을 값을 만들게 된다. 신호가 없다는 것은 **방향을 낼 근거가 없다**는 뜻이라
   * 빈 목록이 정확한 답이다(E4).
   */
  signals: OperatingSignals = NO_SIGNALS,
): OptimizationSummary {
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
      computedAtIso: '2026-08-21T13:35:00Z',
      inputWindowLabel: INPUT_WINDOW_LABEL,
      modelLabel: OPTIMIZATION_MODEL_LABEL,
      energy,
    };
  }

  const rng = createRng(siteSeed(siteId, 31337));
  const dosing = buildDosing(intensity, rng);

  return {
    online: true,
    computedAtIso: DEMO_NOW_ISO,
    inputWindowLabel: INPUT_WINDOW_LABEL,
    modelLabel: OPTIMIZATION_MODEL_LABEL,
    energy,
    dosing,
    /* 주입 속도 제안이 주입량 권고를 따라가므로 같은 값을 넘긴다 */
    operating: buildOperating(signals, dosing),
  };
}
