/** slice Public API — 바깥에서는 이 파일만 import 한다(FSD §6) */
export { getAnalysisRounds, getEstimated, hasAnalyzer, hasEstimation } from './api/fixtures';
export { buildComparison, computeMetrics, measuredMean } from './lib/compare';
export {
  ANALYSIS_ITEMS,
  ANALYSIS_ITEM_CODES,
  ANALYSIS_SOURCE_CYCLES,
  ANALYSIS_SOURCE_LABELS,
  ANALYZER_SITE_ID,
  LAB_ROUND_COUNT,
} from './config/constants';
export type {
  AnalysisItemCode,
  AnalysisRound,
  AnalysisSample,
  AnalysisSource,
  ComparisonRow,
  ValidationMetrics,
} from './model/types';
