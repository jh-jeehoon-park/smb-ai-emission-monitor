import { INLET_BY_OUTLET_CODE, MEASUREMENT_ITEMS } from '@/shared/config/measurement';
import { SITE_SCENARIOS } from '@/shared/config/demo-scenario';
import { ALARMS, buildEquipmentAlarms, buildTreatmentAlarms, type Alarm } from '@/entities/alarm';
import { getEquipment } from '@/entities/equipment';
import { EQUIPMENT_SIGNAL_LABELS } from '@/entities/equipment';
import {
  changeRatePercent,
  getMeasurementSeries,
  isSimilar,
  isTreatmentJudged,
  type MeasurementPoint,
  type SeriesCode,
} from '@/entities/measurement';
import { getSite } from '@/entities/site';

/**
 * 손으로 쓴 알람 + **설비 상태에서 만든 설비 이상 알람** + **계측 대조에서 만든 처리 미흡 알람**.
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
 *
 * **처리 미흡 알람의 입력은 fixture 계열이다** — 이 목록이 모듈 로드 시 1회 계산이라 비동기
 * 실측을 볼 수 없다. 새 타협이 아니다: 설비 알람도 fixture `getEquipment`를 보고 `/anomaly`의
 * 방류 의심도 시나리오를 본다. 실측과 fixture가 **같은 역산 함수**를 지나므로(`fillInletQuality`)
 * 두 원천의 판정이 갈리지도 않는다.
 *
 * **화면은 자기 판정을 따로 하지 않고 이 목록을 읽는다** — `equipment-view`가
 * `condition === 'equipment'`로 거르는 것과 같은 방식이다. 각자 판정하면 화면은 «처리 확인됨»,
 * 헤더 배지는 «미확인 1건»이 되는 어긋남이 생긴다.
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
  ...SITE_SCENARIOS.flatMap((scenario) =>
    buildTreatmentAlarms(
      scenario.id,
      getSite(scenario.id).name,
      treatmentRows(scenario.id),
      lastKnownIso(scenario.id),
    ),
  ),
].sort((a, b) => b.raisedAtIso.localeCompare(a.raisedAtIso));

/**
 * 처리 판정에 넣을 항목 줄. **변화율은 여기서 한 번만 낸다** — 알람 쪽이 다시 계산하면
 * 화면과 알람이 다른 판정을 낼 길이 열린다.
 *
 * **가장 최근 관측값을 쓴다.** 마지막 표본을 그대로 읽으면 서버가 우리 시간축보다 조금
 * 뒤에 있어 늘 결측이고, 그러면 열 사업장이 전부 «판정 불가»가 된다 — 이 화면이 겪은 그
 * 함정이다(`inout-compare`의 `lastObserved`).
 *
 * **판정 대상이 아닌 항목은 넣지 않는다** `[TBD-59]` — 수온·EC·pH가 유입과 같은 것은
 * 정상이라, 넣으면 모든 사업장이 상시로 울려 진짜 정체가 묻힌다.
 */
function treatmentRows(siteId: string) {
  const points = getMeasurementSeries(siteId);

  return (Object.keys(INLET_BY_OUTLET_CODE) as SeriesCode[])
    .filter(isTreatmentJudged)
    .map((outletCode) => {
      const inletCode = INLET_BY_OUTLET_CODE[outletCode as keyof typeof INLET_BY_OUTLET_CODE];
      const changePercent = changeRatePercent(
        lastObserved(points, inletCode),
        lastObserved(points, outletCode),
      );

      return {
        code: outletCode,
        label: MEASUREMENT_ITEMS[outletCode].label,
        changePercent,
        similar: isSimilar(changePercent),
      };
    });
}

/** 마지막으로 값이 있던 표본. 없으면 `null` — 0으로 두면 «쟀는데 0이었다»가 된다(E4) */
function lastObserved(points: MeasurementPoint[], code: SeriesCode): number | null {
  for (let i = points.length - 1; i >= 0; i -= 1) {
    const value = points[i]![code];
    if (value !== null) return value;
  }
  return null;
}

/** 판정의 근거가 된 마지막 관측 시각. 한 점도 없으면 `null`이라 빌더가 «모름»으로 적는다 */
function lastKnownIso(siteId: string): string | null {
  const points = getMeasurementSeries(siteId);
  for (let i = points.length - 1; i >= 0; i -= 1) {
    if (points[i]!.TOC !== null) return points[i]!.t;
  }
  return null;
}

/** 한 사업장의 알람만 최신순으로. 합친 목록을 쓴다 — 설비 알람이 빠지면 안 된다 */
export function allAlarmsForSite(siteId: string): Alarm[] {
  return ALL_ALARMS.filter((alarm) => alarm.siteId === siteId);
}
