import type { StatusLevel } from '@/shared/config/provisional';

/** 알람 우선순위 3단계 (사업계획서 p.32) */
export type AlarmPriority = 'urgent' | 'caution' | 'info';

/** 알람 조건 4종 (사업계획서 p.32) */
export type AlarmCondition = 'anomaly' | 'pollutionSurge' | 'qualityShift' | 'equipment';

export type AlarmState = 'open' | 'acknowledged' | 'resolved';

export interface Alarm {
  id: string;
  siteId: string;
  /**
   * 상태 등급. **우선순위와 다른 축이다** — `[원문 발표 p.20 그림]`이 둘을 다른 열로 보여준다.
   * 우선순위는 이 값에서 `PRIORITY_BY_LEVEL`로 파생되므로 둘이 어긋날 수 없다 `[INC-02]`.
   */
  level: StatusLevel;
  priority: AlarmPriority;
  condition: AlarmCondition;
  siteName: string;
  title: string;
  detail: string;
  raisedAtIso: string;
  state: AlarmState;
}

export const ALARM_PRIORITY_LABELS: Record<AlarmPriority, string> = {
  urgent: '긴급',
  caution: '주의',
  info: '정보',
};

export const ALARM_CONDITION_LABELS: Record<AlarmCondition, string> = {
  anomaly: '이상 탐지',
  pollutionSurge: '오염도 급변',
  qualityShift: '수질 변화 이상',
  equipment: '설비 이상',
};

export const ALARM_STATE_LABELS: Record<AlarmState, string> = {
  open: '미확인',
  acknowledged: '확인',
  resolved: '조치 완료',
};
