import type { EquipmentSortKey } from '../config/constants';
import type { Equipment } from '../model/types';

/**
 * 정렬 기준이 셋인 이유는 관점이 셋이기 때문이다 —
 * 지금 손봐야 할 것(MPI), 곧 멈출 것(고장 확률), 교체 계획이 필요한 것(잔여 수명).
 */
const COMPARATORS: Record<EquipmentSortKey, (a: Equipment, b: Equipment) => number> = {
  mpi: (a, b) => b.maintenancePriorityIndex - a.maintenancePriorityIndex,
  failure: (a, b) => b.failureProbability - a.failureProbability,
  rul: (a, b) => a.remainingUsefulLifeDays - b.remainingUsefulLifeDays,
};

export function compareEquipment(by: EquipmentSortKey): (a: Equipment, b: Equipment) => number {
  return COMPARATORS[by];
}

export function sortEquipment(items: Equipment[], by: EquipmentSortKey): Equipment[] {
  return [...items].sort(COMPARATORS[by]);
}
