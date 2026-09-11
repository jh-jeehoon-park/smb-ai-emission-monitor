import type { StatusLevel } from '@/shared/config/provisional';

/** 알람 우선순위 3단계 (사업계획서 p.32) */
export type AlarmPriority = 'urgent' | 'caution' | 'info';

/**
 * 알람 조건 — 원문 4종 `[원문 p.32]` + 우리가 더한 하나.
 *
 * **원문이 «등»으로 열어 두었다** — *"이상 탐지, 오염도 급변, 수질 변화 이상, 설비 이상 **등**"*
 * `[원문 p.32]`. 그 여지 안에서 `treatmentStall`을 더한다 `[사용자 요청 2026-09-10]`.
 *
 * **`qualityShift`에 욱여넣지 않는다.** 그쪽은 «방류 수질이 튀었다»이고 이것은 «처리가 되지
 * 않았다»다 — 앞은 방류를 멈추고 원인을 찾는 일이고, 뒤는 공정 설비를 보는 일이라 **사용자가
 * 해야 할 행동이 다르다.** 한 조건으로 묶으면 목록에서 그 둘을 가를 수 없다.
 */
export type AlarmCondition =
  | 'anomaly'
  | 'pollutionSurge'
  | 'qualityShift'
  | 'equipment'
  | 'treatmentStall';

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
  /* 라벨만 바뀌었다 — 조건 키·판정 규칙·우선순위는 그대로다 `[사용자 요청 2026-09-10]` */
  treatmentStall: '처리 상태 확인',
};

export const ALARM_STATE_LABELS: Record<AlarmState, string> = {
  open: '미확인',
  acknowledged: '확인',
  resolved: '조치 완료',
};
