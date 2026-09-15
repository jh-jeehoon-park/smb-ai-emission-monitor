/** slice Public API — 바깥에서는 이 파일만 import 한다(FSD §6) */
export { getOptimization } from './api/fixtures';
export {
  CHEMICAL_SAVING_RANGE,
  DOSING_DECIMALS,
  ENERGY_DECIMALS,
  ENERGY_SAVING_TARGET,
  OPERATING_WINDOW,
  OPEX_SAVING_TARGET,
  OPTIMIZATION_INPUT_LABEL,
  OPTIMIZATION_MODEL_LABEL,
} from './config/constants';
export type {
  OptimizationSummary,
  DosingAdvice,
  OperatingAdvice,
  OperatingSignals,
  EnergyAdvice,
} from './model/types';
