import {
  ALARM_PRIORITY_LABELS,
  ALARM_STATE_LABELS,
  type AlarmPriority,
  type AlarmState,
} from '@/entities/alarm';

export const PRIORITY_QUERY_KEY = 'prio';
export const STATE_QUERY_KEY = 'state';

export const PRIORITY_FILTERS = ['all', 'urgent', 'caution', 'info'] as const;
export type PriorityFilter = (typeof PRIORITY_FILTERS)[number];

export const STATE_FILTERS = ['all', 'open', 'acknowledged', 'resolved'] as const;
export type StateFilter = (typeof STATE_FILTERS)[number];

/** 라벨은 entities에서 가져온다 — 알람 용어가 화면마다 갈리면 안 된다 */
export const PRIORITY_OPTIONS: { value: PriorityFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  ...(['urgent', 'caution', 'info'] as AlarmPriority[]).map((p) => ({
    value: p as PriorityFilter,
    label: ALARM_PRIORITY_LABELS[p],
  })),
];

export const STATE_OPTIONS: { value: StateFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  ...(['open', 'acknowledged', 'resolved'] as AlarmState[]).map((s) => ({
    value: s as StateFilter,
    label: ALARM_STATE_LABELS[s],
  })),
];

/**
 * 상세 모달에 싣는 계측 항목.
 *
 * 11종을 다 실으면 무엇을 보라는 것인지 알 수 없다. **수질 이상 판단에 쓰이는 항목**과
 * 방류·가동을 가르는 **유량·전류**를 고른다 — 후자는 방류 상태 표기의 근거이기도 하다.
 * 순서는 계측 화면(`WATER_SERIES_CODES`)과 같게 두어 두 화면이 같은 순서로 읽히게 한다.
 */
export const SNAPSHOT_CODES = ['pH', 'DO', 'EC', 'turbidity', 'TOC', 'flow', 'current'] as const;
