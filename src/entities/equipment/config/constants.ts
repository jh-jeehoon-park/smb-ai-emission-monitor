import { COLLECTION_INTERVAL_MINUTES } from '@/shared/config/measurement';

export const EQUIPMENT_SORT_KEYS = ['mpi', 'failure', 'rul'] as const;
export type EquipmentSortKey = (typeof EQUIPMENT_SORT_KEYS)[number];

export const EQUIPMENT_SORT_OPTIONS: { value: EquipmentSortKey; label: string }[] = [
  { value: 'mpi', label: 'MPI 높은 순' },
  { value: 'failure', label: '고장 확률 높은 순' },
  { value: 'rul', label: '잔여 수명 짧은 순' },
];

/**
 * 잔여 수명 추이를 며칠치 보여줄지.
 *
 * 원문 예시의 x축이 **0~150**이다 `[원문 발표 p.18 그림]`. 그대로 150일을 쓰면 우리
 * 잔여 수명(수십~수백 일)과 겹쳐 곡선이 화면을 벗어나므로 **90일**로 줄였다 —
 * 추세를 읽는 데는 충분하고 눈금도 남는다. **시연값이다.**
 */
export const RUL_HISTORY_DAYS = 90;

/**
 * 상태 격자의 칸 수. 원문 예시가 `00시~24시`를 시간 단위로 끊는다 `[원문 발표 p.18 그림]`.
 * 5분 표본 그대로면 288칸이라 색을 구분할 수 없다.
 */
export const STATUS_TIMELINE_HOURS = 24;

/** 한 칸에 들어가는 표본 수 — 수집 주기가 바뀌면 여기 하나만 따라 바뀐다 */
export const SAMPLES_PER_STATUS_CELL = 60 / COLLECTION_INTERVAL_MINUTES;
