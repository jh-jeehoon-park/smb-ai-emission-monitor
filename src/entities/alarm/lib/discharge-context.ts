import { isDischargingAt, timelineIndexAt } from '@/shared/lib/timeline';
import type { Alarm, AlarmCondition } from '../model/types';

/**
 * 방류 여부가 해석을 바꾸는 알람 조건.
 *
 * 수질 계열만 해당한다 — 방류하지 않는 시간의 수질값은 **배출 수질이 아니라서**
 * 배출기준 초과 판정에 넣으면 틀린다. 이상 탐지·설비 이상은 방류와 무관하게
 * 공정에서 일어나는 일이라 이 구분을 붙이지 않는다.
 */
const WATER_QUALITY_CONDITIONS: readonly AlarmCondition[] = ['pollutionSurge', 'qualityShift'];

/**
 * 이 알람이 **방류하지 않는 동안** 올라왔는가.
 *
 * 알람에 필드로 저장하지 않고 `raisedAtIso`에서 파생한다 — 저장하면 시나리오와 어긋날 수
 * 있지만 파생은 어긋날 수 없다.
 *
 * `=== false`로 비교하는 것이 핵심이다. 통신이 끊긴 구간은 `null`(모름)이고, 모르는 것을
 * "방류 안 했다"로 바꿔 적으면 없는 사실을 주장하게 된다(E4).
 */
export function raisedWhileNotDischarging(alarm: Alarm): boolean {
  if (!WATER_QUALITY_CONDITIONS.includes(alarm.condition)) return false;

  return isDischargingAt(alarm.siteId, timelineIndexAt(alarm.raisedAtIso)) === false;
}
