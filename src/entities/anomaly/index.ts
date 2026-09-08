/** slice Public API — 바깥에서는 이 파일만 import 한다(FSD §6) */
export { getAnomalySeries, getAnomalySummary, getAnomalySummaryAt } from './api/fixtures';
export {
  idleDischargeAcross,
  tallyIdleDischarge,
  type IdleDischargeTally,
  type IdleDischargeVerdict,
} from './lib/idle-discharge-across';
export {
  canJudgeIdleDischarge,
  findIdleDischargeRuns,
  type IdleDischargeRun,
} from './lib/idle-discharge';
export {
  ANOMALY_RUN_MIN_SCORE,
  canJudgeAnomalyRuns,
  findAnomalyRuns,
  type AnomalyRun,
} from './lib/anomaly-runs';
export type { AnomalyPoint, AnomalySummary, Contribution } from './model/types';
