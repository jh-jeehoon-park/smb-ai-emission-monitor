/** slice Public API — 바깥에서는 이 파일만 import 한다(FSD §6) */
export { getEquipment } from './api/fixtures';
export { getRunTimeline } from './api/history';
export { sortEquipment, compareEquipment } from './lib/sort-equipment';
export { STATUS_TIMELINE_HOURS, type EquipmentSortKey } from './config/constants';
export { EQUIPMENT_SIGNAL_LABELS } from './model/types';
export type { Equipment, EquipmentRunCell, EquipmentSignal } from './model/types';
