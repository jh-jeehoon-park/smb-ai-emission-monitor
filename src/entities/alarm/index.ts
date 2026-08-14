/** slice Public API — 바깥에서는 이 파일만 import 한다(FSD §6) */
export {
  ALARMS,
  getAlarmsForView,
  countOpenAlarms,
  countOpenAlarmsAcrossSites,
  openAlarmCountBySite,
  countByPriority,
  countAnomalyAlarms,
} from './api/fixtures';
export {
  ALARM_PRIORITY_LABELS,
  ALARM_CONDITION_LABELS,
  ALARM_STATE_LABELS,
} from './model/types';
export type { Alarm, AlarmPriority, AlarmCondition, AlarmState } from './model/types';
