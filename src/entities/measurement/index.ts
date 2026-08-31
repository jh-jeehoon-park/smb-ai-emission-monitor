/** slice Public API — 바깥에서는 이 파일만 import 한다(FSD §6) */
export { getMeasurementSeries } from './api/fixtures';
export {
  WATER_SERIES_CODES,
  EQUIPMENT_SERIES_CODES,
  SERIES_CODES,
  FLOW_SERIES_CODES,
  DISCHARGE_SERIES_CODES,
  BUCKET_UNITS,
  BUCKET_MINUTES,
  BUCKET_OPTIONS,
  BUCKET_STATS,
  STAT_OPTIONS,
  STAT_LABELS,
  DEFAULT_BUCKET,
  DEFAULT_STAT,
  WINDOW_HOURS,
  type BucketUnit,
  type BucketStat,
} from './config/constants';
export { bucketByMinutes, sliceRecentHours, summarizeSeries } from './lib/series-stats';
export { energyGap, energyIntensity, type EnergyGap } from './lib/energy';
export {
  dailyDischargeVolume,
  dailyDischargeSeries,
  type DailyDischargeVolume,
  type CumulativePoint,
} from './lib/discharge-volume';
export { windowChange, type WindowChange } from './lib/window-change';
export { outageNotice } from './lib/outage-notice';
export { buildBucketReport, bucketReportToCsv, type BucketRow } from './lib/bucket-report';
export { countOverLimit } from './lib/limit';
export { isSeriesCode } from './lib/series-code';
export type { SeriesBucket, SeriesStats } from './lib/series-stats';
export type { MeasurementPoint, SeriesCode, Reading } from './model/types';
