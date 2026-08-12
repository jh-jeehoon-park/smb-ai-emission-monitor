/** slice Public API — 바깥에서는 이 파일만 import 한다(FSD §6) */
export { getMeasurementSeries } from './api/fixtures';
export { WATER_SERIES_CODES, EQUIPMENT_SERIES_CODES } from './config/constants';
export { sliceRecentHours, summarizeSeries } from './lib/series-stats';
export type { SeriesStats } from './lib/series-stats';
export type { MeasurementPoint, SeriesCode, Reading } from './model/types';
