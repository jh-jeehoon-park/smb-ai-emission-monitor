/** slice Public API — 바깥에서는 이 파일만 import 한다(FSD §6) */
export { getForecast } from './api/fixtures';
export { TREND_LABELS } from './model/types';
export {
  FORECAST_TARGETS,
  FORECAST_TARGET_CODES,
  type ForecastTargetCode,
} from './config/constants';
export type { ForecastSummary, ForecastPoint, TrendEstimate, Trend } from './model/types';
