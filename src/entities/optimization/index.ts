/** slice Public API — 바깥에서는 이 파일만 import 한다(FSD §6) */
export { getOptimization } from './api/fixtures';
export {
  CHEMICAL_SAVING_RANGE,
  DOSING_DECIMALS,
  ENERGY_DECIMALS,
  ENERGY_SAVING_TARGET,
  OPEX_SAVING_TARGET,
  COST_EXAMPLE_KRW,
  OPTIMIZATION_INPUT_LABEL,
  OPTIMIZATION_MODEL_LABEL,
} from './config/constants';
export type {
  OptimizationSummary,
  DosingAdvice,
  OperatingAdvice,
  EnergyAdvice,
} from './model/types';
