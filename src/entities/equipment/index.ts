/** slice Public API — 바깥에서는 이 파일만 import 한다(FSD §6) */
export { getEquipment } from './api/fixtures';
export {
  daysUntilDepleted,
  getRulHistory,
  getRulSeries,
  getStatusTimeline,
  getTreatmentTimeline,
} from './api/history';
export { sortEquipment, compareEquipment } from './lib/sort-equipment';
export {
  EQUIPMENT_SORT_KEYS,
  RUL_HISTORY_DAYS,
  STATUS_TIMELINE_HOURS,
  EQUIPMENT_SORT_OPTIONS,
  type EquipmentSortKey,
} from './config/constants';
export type {
  Equipment,
  EquipmentStatusCell,
  RulPoint,
  RulSeriesPoint,
  TreatmentCell,
} from './model/types';
