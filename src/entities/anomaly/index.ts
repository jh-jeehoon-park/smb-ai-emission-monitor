/** slice Public API — 바깥에서는 이 파일만 import 한다(FSD §6) */
export { getAnomalySeries, getAnomalySummary } from './api/fixtures';
export {
  canJudgeIdleDischarge,
  findIdleDischargeRuns,
  type IdleDischargeRun,
} from './lib/idle-discharge';
export type { AnomalyPoint, AnomalySummary, Contribution } from './model/types';
