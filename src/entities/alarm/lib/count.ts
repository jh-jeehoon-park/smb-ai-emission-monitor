import type { Alarm, AlarmPriority } from '../model/types';

/**
 * 미확인 알람 수. **배열을 받는다.**
 *
 * 예전에는 모듈 상수 `ALARMS`를 직접 읽는 함수들이었다. 그러면 확인 처리로 덮어쓴
 * 상태를 볼 수 없어, 알람 이력에서 처리해도 사이드바 배지가 그대로였다.
 * 세는 대상을 인자로 받으면 호출부가 무엇을 세는지도 드러난다.
 *
 * `siteId`를 주면 그 사업장만, 주지 않으면 준 목록 전체를 센다 — 범위는 목록을 만드는
 * 쪽이 이미 정했다.
 */
export function countOpen(alarms: readonly Alarm[], siteId?: string): number {
  return alarms.filter((a) => a.state === 'open' && (!siteId || a.siteId === siteId)).length;
}

/** 미확인 알람만 최근순으로. 헤더 알림과 목록이 같은 순서를 쓴다 */
export function openAlarms(alarms: readonly Alarm[], siteId?: string): Alarm[] {
  return alarms
    .filter((a) => a.state === 'open' && (!siteId || a.siteId === siteId))
    .sort((a, b) => b.raisedAtIso.localeCompare(a.raisedAtIso));
}

/** 사업장 카드에 표시할 미확인 수 */
export function openCountBySite(alarms: readonly Alarm[]): Record<string, number> {
  return alarms.reduce<Record<string, number>>((acc, a) => {
    if (a.state === 'open') acc[a.siteId] = (acc[a.siteId] ?? 0) + 1;
    return acc;
  }, {});
}

/** 우선순위별 집계. 상태를 지정하지 않으면 미확인만 센다 */
export function countByPriorityIn(
  alarms: readonly Alarm[],
  state: Alarm['state'] = 'open',
  siteId?: string,
): Record<AlarmPriority, number> {
  const counts: Record<AlarmPriority, number> = { urgent: 0, caution: 0, info: 0 };
  for (const alarm of alarms) {
    if (alarm.state !== state) continue;
    if (siteId && alarm.siteId !== siteId) continue;
    counts[alarm.priority] += 1;
  }
  return counts;
}
