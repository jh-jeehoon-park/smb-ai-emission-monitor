/** slice Public API — 바깥에서는 이 파일만 import 한다(FSD §6) */
export { getEquipment } from './api/fixtures';
export { getRunTimeline, getTreatmentTimeline } from './api/history';
export { sortEquipment, compareEquipment } from './lib/sort-equipment';
export {
  EQUIPMENT_SORT_KEYS,
  STATUS_TIMELINE_HOURS,
  EQUIPMENT_SORT_OPTIONS,
  type EquipmentSortKey,
} from './config/constants';
export { EQUIPMENT_SIGNAL_LABELS } from './model/types';
export type {
  Equipment,
  EquipmentRunCell,
  EquipmentSignal,
  TreatmentCell,
} from './model/types';
