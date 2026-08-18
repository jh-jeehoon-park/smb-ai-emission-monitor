import { TIMELINE_POINT_COUNT, isDischargingAt, isMissingAt, timelineIndexAt } from '@/shared/lib/timeline';
import type { Alarm } from '@/entities/alarm';
import type { AnomalyPoint } from '@/entities/anomaly';
import type { MeasurementPoint } from '@/entities/measurement';
import {
  assertFullDay,
  runningState,
  toRuns,
  toState,
  type AlarmMarker,
  type RibbonRun,
} from './build-ribbon';

export interface RibbonData {
  running: RibbonRun[];
  discharging: RibbonRun[];
  receiving: RibbonRun[];
  /** 표본별 이상 점수. 결측은 null이라 막대를 그리지 않는다(E4) */
  scores: (number | null)[];
  alarms: AlarmMarker[];
}

/**
 * 네 축을 **하나의 시간축 위에** 올린다.
 *
 * 이 위젯이 존재하는 이유가 여기 있다 — 지금 이 값들은 화면 여러 곳에 흩어져 있어
 * "이상이 튄 그 시각에 방류 중이었나, 설비는 돌았나"를 답하려면 타임스탬프를 눈으로
 * 맞춰야 한다. 사업장이 하나인 관리자는 겹쳐 볼 수 있고, 겹쳐야 의미가 생긴다.
 *
 * **entities를 직접 잇지 않는다**(FSD §8). 각 slice가 만든 값을 받아 여기서 조합한다.
 */
export function buildRibbon(
  siteId: string,
  series: MeasurementPoint[],
  anomaly: AnomalyPoint[],
  alarms: Alarm[],
): RibbonData {
  const running = series.map((point) => runningState(point.current));
  const discharging = Array.from({ length: TIMELINE_POINT_COUNT }, (_, i) =>
    toState(isDischargingAt(siteId, i)),
  );
  /**
   * 수신 행의 두 상태는 **수신됨 / 모름**이다. `off`를 쓰지 않는다 —
   * 결측은 "받았는데 값이 꺼져 있었다"가 아니라 **그 시각을 모른다**는 뜻이고,
   * `off`(중립면)로 칠하면 방류 중단 같은 '아는 꺼짐'과 같은 색이 된다.
   */
  const receiving = Array.from({ length: TIMELINE_POINT_COUNT }, (_, i) =>
    toState(isMissingAt(siteId, i) ? null : true),
  );

  assertFullDay(running, '가동');
  assertFullDay(discharging, '방류');
  assertFullDay(receiving, '수신');

  return {
    running: toRuns(running),
    discharging: toRuns(discharging),
    receiving: toRuns(receiving),
    scores: anomaly.map((point) => point.score),
    alarms: alarms.map((alarm) => ({
      id: alarm.id,
      index: timelineIndexAt(alarm.raisedAtIso),
      priority: alarm.priority,
      title: alarm.title,
      timeIso: alarm.raisedAtIso,
    })),
  };
}
