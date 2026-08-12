/** slice Public API — 바깥에서는 이 파일만 import 한다(FSD §6) */
export { getEquipment } from './api/fixtures';
export { sortEquipment, compareEquipment } from './lib/sort-equipment';
export {
  EQUIPMENT_SORT_KEYS,
  EQUIPMENT_SORT_OPTIONS,
  type EquipmentSortKey,
} from './config/constants';
export type { Equipment } from './model/types';
