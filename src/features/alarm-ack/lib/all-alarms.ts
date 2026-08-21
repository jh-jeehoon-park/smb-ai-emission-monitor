import { SITE_SCENARIOS } from '@/shared/config/demo-scenario';
import { ALARMS, buildEquipmentAlarms, type Alarm } from '@/entities/alarm';
import { getEquipment } from '@/entities/equipment';
import { EQUIPMENT_SIGNAL_LABELS } from '@/entities/equipment';
import { getSite } from '@/entities/site';

/**
 * 손으로 쓴 알람 + **설비 상태에서 만든 설비 이상 알람**.
 *
 * **여기서 합치는 이유** — 두 원천이 서로 다른 슬라이스에 있고 같은 레이어끼리는 참조하지
 * 않는다(FSD §8). 합치는 일은 위 레이어의 몫이고, 이 feature가 이미 앱 전체의 알람 목록을
 * 다루는 유일한 곳이다(`useAlarmStates`).
 *
 * **화면마다 따로 합치지 않는다.** 헤더 배지·알람 이력·통합 관제·설비 화면이 각자 합치면
 * 어느 화면은 설비 알람을 세고 어느 화면은 안 세게 된다 — 미확인 건수가 화면마다 달라진다.
 *
 * 모듈 로드 시 한 번 계산한다. `getEquipment`는 시드 고정 순수 함수라 매번 같은 값이 나오고,
 * 화면마다 다시 만들면 열 사업장 × 4대를 화면 전환마다 다시 돈다.
 */
export const ALL_ALARMS: Alarm[] = [
  ...ALARMS,
  ...SITE_SCENARIOS.flatMap((scenario) =>
    buildEquipmentAlarms(
      scenario.id,
      getSite(scenario.id).name,
      getEquipment(scenario.id).map((eq) => ({
        id: eq.id,
        name: eq.name,
        status: eq.status,
        /* 신호 코드를 라벨로 바꿔 넘긴다 — 알람 쪽이 설비 신호 종류를 알 이유가 없다 */
        signalLabels: eq.signals.map((signal) => EQUIPMENT_SIGNAL_LABELS[signal]),
        anomalySinceIso: eq.anomalySinceIso,
        anomalyHours: eq.anomalyHours,
      })),
    ),
  ),
].sort((a, b) => b.raisedAtIso.localeCompare(a.raisedAtIso));

/** 한 사업장의 알람만 최신순으로. 합친 목록을 쓴다 — 설비 알람이 빠지면 안 된다 */
export function allAlarmsForSite(siteId: string): Alarm[] {
  return ALL_ALARMS.filter((alarm) => alarm.siteId === siteId);
}
