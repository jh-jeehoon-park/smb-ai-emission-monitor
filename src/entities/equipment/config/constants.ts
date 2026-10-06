import { COLLECTION_INTERVAL_MINUTES } from '@/shared/config/measurement';

/**
 * 정렬 축 셋. **예전 셋(MPI·고장 확률·잔여 수명)을 회의가 내리게 했다** `[INC-107]` —
 * 값이 사라졌으므로 이상 신호 쪽 축으로 옮겼다.
 *
 * **화면이 고르게 하지는 않는다** `[사용자 요청 2026-09-08]` — 세그먼트를 걷고 `'status'`로
 * 고정했다. 축은 남긴다: 정렬 함수의 계약이고, 다시 고르게 할 때 되살릴 곳이 여기 하나다.
 */
export const EQUIPMENT_SORT_KEYS = ['status', 'duration', 'signals'] as const;
export type EquipmentSortKey = (typeof EQUIPMENT_SORT_KEYS)[number];

/**
 * 가동 격자의 칸 수. 원문 예시가 `00시~24시`를 시간 단위로 끊는다 `[원문 발표 p.18 그림]`.
 * 5분 표본 그대로면 288칸이라 색을 구분할 수 없다.
 */
export const STATUS_TIMELINE_HOURS = 24;

/** 한 칸에 들어가는 표본 수 — 수집 주기가 바뀌면 여기 하나만 따라 바뀐다 */
export const SAMPLES_PER_STATUS_CELL = 60 / COLLECTION_INTERVAL_MINUTES;
