/** slice Public API — 바깥에서는 이 파일만 import 한다(FSD §6) */
export { getForecast, getFlowForecast } from './api/fixtures';
export { formatR2 } from './lib/format-r2';
export { hasPlottableValues, peakForecast } from './lib/has-values';
export { TREND_LABELS } from './model/types';
export {
  FLOW_FORECAST,
  FLOW_FORECAST_CODE,
  FORECAST_TARGETS,
  FORECAST_TARGET_CODES,
  type ForecastSeriesCode,
  type ForecastTargetCode,
} from './config/constants';
export type { ForecastSummary, ForecastPoint, TrendEstimate, Trend } from './model/types';
