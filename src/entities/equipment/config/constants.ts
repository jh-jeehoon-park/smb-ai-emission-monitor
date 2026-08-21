import { COLLECTION_INTERVAL_MINUTES } from '@/shared/config/measurement';

/**
 * 정렬 축 셋. **예전 셋(MPI·고장 확률·잔여 수명)을 회의가 내리게 했다** `[INC-107]` —
 * 값이 사라졌으므로 이상 신호 쪽 축으로 옮겼다.
 */
export const EQUIPMENT_SORT_KEYS = ['status', 'duration', 'signals'] as const;
export type EquipmentSortKey = (typeof EQUIPMENT_SORT_KEYS)[number];

export const EQUIPMENT_SORT_OPTIONS: { value: EquipmentSortKey; label: string }[] = [
  { value: 'status', label: '상태 나쁜 순' },
  { value: 'duration', label: '이상 오래된 순' },
  { value: 'signals', label: '이상 신호 많은 순' },
];

/**
 * 가동 격자의 칸 수. 원문 예시가 `00시~24시`를 시간 단위로 끊는다 `[원문 발표 p.18 그림]`.
 * 5분 표본 그대로면 288칸이라 색을 구분할 수 없다.
 */
export const STATUS_TIMELINE_HOURS = 24;

/** 한 칸에 들어가는 표본 수 — 수집 주기가 바뀌면 여기 하나만 따라 바뀐다 */
export const SAMPLES_PER_STATUS_CELL = 60 / COLLECTION_INTERVAL_MINUTES;
