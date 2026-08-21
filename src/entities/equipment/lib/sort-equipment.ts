import { PROVISIONAL_STATUS_LEVELS } from '@/shared/config/provisional';
import type { EquipmentSortKey } from '../config/constants';
import type { Equipment } from '../model/types';

/** 나쁜 등급이 앞이다. `PROVISIONAL_STATUS_LEVELS`가 정상→위험 순이라 뒤에서부터 센다 */
const severity = (equipment: Equipment) => PROVISIONAL_STATUS_LEVELS.indexOf(equipment.status);

/**
 * 정렬 기준이 셋인 이유는 관점이 셋이기 때문이다 — **지금 무엇이 나쁜가**(등급),
 * **얼마나 오래됐나**(지속), **무엇이 걸렸나**(신호 수).
 *
 * 예전 셋(MPI·고장 확률·잔여 수명)은 회의가 내리게 했다 `[INC-107]`. 값이 사라졌으므로
 * 정렬 축도 이상 신호 쪽으로 옮긴다.
 */
const COMPARATORS: Record<EquipmentSortKey, (a: Equipment, b: Equipment) => number> = {
  /* 등급이 같으면 오래된 것이 앞이다 — 같은 색 안에서도 순서가 있어야 목록이 읽힌다 */
  status: (a, b) => severity(b) - severity(a) || (b.anomalyHours ?? 0) - (a.anomalyHours ?? 0),
  duration: (a, b) => (b.anomalyHours ?? 0) - (a.anomalyHours ?? 0) || severity(b) - severity(a),
  signals: (a, b) => b.signals.length - a.signals.length || severity(b) - severity(a),
};

export function compareEquipment(by: EquipmentSortKey): (a: Equipment, b: Equipment) => number {
  return COMPARATORS[by];
}

export function sortEquipment(items: Equipment[], by: EquipmentSortKey): Equipment[] {
  return [...items].sort(COMPARATORS[by]);
}
