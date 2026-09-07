/** slice Public API — 바깥에서는 이 파일만 import 한다(FSD §6) */
export { getForecast, getFlowForecast } from './api/fixtures';
export { formatR2 } from './lib/format-r2';
export { trendVerdict, type TrendVerdict } from './lib/verdict';
export { hasPlottableValues, peakValue } from './lib/has-values';
export {
  LIMIT_BASE_PERCENT,
  buildOverlayRows,
  toLimitPercent,
  type OverlayRow,
} from './lib/limit-ratio';
export { SERIES_ORIGIN_LABELS, TREND_LABELS } from './model/types';
export { TREND_VISUAL } from './config/trend-visual';
export { TrendChip } from './ui/trend-chip';
export { SERIES_WINDOW_HOURS } from './config/constants';
export {
  FLOW_FORECAST,
  ORIGIN_DASH,
  SERIES_INK,
  FLOW_FORECAST_CODE,
  INFLOW_FORECAST_CODE,
  FORECAST_TARGETS,
  FORECAST_TARGET_CODES,
  type ForecastSeriesCode,
  type ForecastTargetCode,
} from './config/constants';
export type {
  ForecastSummary,
  ForecastPoint,
  SeriesOrigin,
  TrendEstimate,
  Trend,
} from './model/types';
