/** slice Public API — 바깥에서는 이 파일만 import 한다(FSD §6) */
export { getOperatingState, getProcessStages } from './api/fixtures';
export {
  ESTIMATED_ITEMS,
  OPTICAL_ITEMS,
  PROBE_ITEMS,
  PROCESS_STAGES,
  REGULATED_ITEMS,
  STAGE_IDS,
  STAGE_QUERY_KEY,
} from './config/constants';
export type { OperatingState, ProcessStage, TreatmentType } from './model/types';
