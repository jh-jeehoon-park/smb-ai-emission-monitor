/** 약품 주입량 최적화 (FR-16) */
export interface DosingAdvice {
  currentDose: number;
  recommendedDose: number;
  /** 단위가 원문에 없어 PROVISIONAL_DOSING_UNIT을 쓴다 */
  unit: string;
  /** 현재 대비 절감률 % */
  savingRate: number;
  /** 왜 이 값을 권했는지. AI 산출값에는 근거를 함께 낸다(E3) */
  basis: string[];
}

/** 설비 운전 조건 제안 (FR-17). 절대 단위가 원문에 없어 현재 대비 상대 변화로만 낸다 */
export interface OperatingAdvice {
  id: string;
  /** 조정 대상 운영 변수 — 폭기량·펌프 속도 등 (사업계획서 p.67) */
  parameter: string;
  target: string;
  deltaPercent: number;
  reason: string;
}

/** 에너지 효율 (FR-18). 현재값은 계측 전력·유량에서 실제로 계산한다 */
export interface EnergyAdvice {
  /** kWh/m³ */
  current: number | null;
  /** 목표 절감률을 적용한 값 */
  target: number | null;
  savingRate: number;
}

interface OptimizationBase {
  /** AI 산출 시각·대상 기간을 값과 함께 낸다(E3) */
  computedAtIso: string;
  inputWindowLabel: string;
  modelLabel: string;
  energy: EnergyAdvice;
}

/**
 * 통신이 끊기면 권장값이 **아예 없다.**
 *
 * `dosing: DosingAdvice | null` 로 두면 화면이 online을 확인한 뒤에도 컴파일러는
 * null 가능성을 계속 물고 있어 `dosing!` 같은 단언을 쓰게 된다(R2가 금지하는 escape hatch).
 * 판별 유니온으로 두면 online 분기 한 번에 타입이 좁혀지고, 두 상태를 섞어 쓰는
 * 실수를 컴파일러가 막아 준다.
 */
export type OptimizationSummary =
  | (OptimizationBase & { online: true; dosing: DosingAdvice; operating: OperatingAdvice[] })
  | (OptimizationBase & { online: false });
