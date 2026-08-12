import {
  ALARM_PRIORITY_LABELS,
  ALARM_STATE_LABELS,
  type AlarmPriority,
  type AlarmState,
} from '@/entities/alarm';

export const PRIORITY_QUERY_KEY = 'prio';
export const STATE_QUERY_KEY = 'state';
export const SCOPE_QUERY_KEY = 'scope';

export const PRIORITY_FILTERS = ['all', 'urgent', 'caution', 'info'] as const;
export type PriorityFilter = (typeof PRIORITY_FILTERS)[number];

export const STATE_FILTERS = ['all', 'open', 'acknowledged', 'resolved'] as const;
export type StateFilter = (typeof STATE_FILTERS)[number];

export const SCOPE_FILTERS = ['all', 'site'] as const;
export type ScopeFilter = (typeof SCOPE_FILTERS)[number];

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

export const SCOPE_OPTIONS: { value: ScopeFilter; label: string }[] = [
  { value: 'all', label: '전 사업장' },
  { value: 'site', label: '선택 사업장' },
];
