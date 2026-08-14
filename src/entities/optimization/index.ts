/** slice Public API — 바깥에서는 이 파일만 import 한다(FSD §6) */
export { getOptimization } from './api/fixtures';
export {
  ANNUAL_SAVING_KRW_RANGE,
  CHEMICAL_SAVING_RANGE,
  DOSING_DECIMALS,
  ENERGY_DECIMALS,
  ENERGY_SAVING_TARGET,
  INCIDENT_AVOIDED_KRW_RANGE,
  OPEX_SAVING_TARGET,
  COST_EXAMPLE_KRW,
  OPTIMIZATION_INPUT_LABEL,
  OPTIMIZATION_MODEL_LABEL,
  TMS_AVOIDED_KRW_RANGE,
} from './config/constants';
export { calcCostSavings, formatKrw, toManwon } from './lib/cost-savings';
export type { CostSavings } from './lib/cost-savings';
export type {
  OptimizationSummary,
  DosingAdvice,
  OperatingAdvice,
  EnergyAdvice,
} from './model/types';
