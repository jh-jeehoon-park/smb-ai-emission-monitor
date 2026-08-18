/** slice Public API — 바깥에서는 이 파일만 import 한다(FSD §6) */
export { ALARMS, getAlarmsForView, countAnomalyAlarms } from './api/fixtures';
/**
 * 집계는 **배열을 받는 순수 함수**다. 모듈 상수를 직접 읽는 함수를 두면 확인 처리로
 * 덮어쓴 상태를 볼 수 없어, 화면마다 다른 숫자가 나온다.
 */
export { countOpen, openAlarms, openCountBySite, countByPriorityIn } from './lib/count';
export { raisedWhileNotDischarging } from './lib/discharge-context';
export {
  ALARM_PRIORITY_LABELS,
  ALARM_CONDITION_LABELS,
  ALARM_STATE_LABELS,
} from './model/types';
export type { Alarm, AlarmPriority, AlarmCondition, AlarmState } from './model/types';
