export const EQUIPMENT_SORT_KEYS = ['mpi', 'failure', 'rul'] as const;
export type EquipmentSortKey = (typeof EQUIPMENT_SORT_KEYS)[number];

export const EQUIPMENT_SORT_OPTIONS: { value: EquipmentSortKey; label: string }[] = [
  { value: 'mpi', label: 'MPI 높은 순' },
  { value: 'failure', label: '고장 확률 높은 순' },
  { value: 'rul', label: '잔여 수명 짧은 순' },
];
