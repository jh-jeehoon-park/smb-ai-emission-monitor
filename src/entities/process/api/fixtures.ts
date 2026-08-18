import { getScenario } from '@/shared/config/demo-scenario';
import { COLLECTION_INTERVAL_MINUTES } from '@/shared/config/measurement';
import { TIMELINE_POINT_COUNT, isDischargingAt } from '@/shared/lib/timeline';
import { PROCESS_STAGES } from '../config/constants';
import type { OperatingState, ProcessStage } from '../model/types';

/**
 * 공정 구성은 사업장이 달라도 같다(사용자 결정 2026-08-14 · TBD-44).
 * 사업장별로 달라지는 것은 계측값과 설비 상태이지 단계 구성이 아니다.
 */
export function getProcessStages(): readonly ProcessStage[] {
  return PROCESS_STAGES;
}

/**
 * 가동·방류 상태.
 *
 * 실증 데이터(docs/datasets Non_TMS_sites/04)는 유량·전력·전류를 **시간별 0/1 플래그**로
 * 준다. 진유원은 전류 96.1%·전력 99.6%가 1인 반면 유량은 88.3%에 하루 3~24시간으로
 * 들쭉날쭉했다 — `가동배출 = 상시가동 간헐방류`라는 분류가 데이터와 정확히 맞는다.
 *
 * **방류하지 않는 시간의 수질값은 배출 수질이 아니다.** 화면이 그 구분을 하지 않으면
 * 배출량 집계와 기준 초과 판정이 틀린다.
 */
export function getOperatingState(siteId: string): OperatingState {
  const scenario = getScenario(siteId);

  // 통신이 끊기면 가동 여부 자체를 알 수 없다. 돌고 있다고 적지 않는다.
  if (!scenario.online) {
    return { running: false, discharging: false, idleHours: null, pattern: '수신 없음' };
  }

  const discharging = isDischargingAt(siteId, TIMELINE_POINT_COUNT - 1) === true;

  return {
    running: true,
    discharging,
    idleHours: discharging ? null : idleHoursUntilNow(siteId),
    pattern: '상시가동 간헐방류',
  };
}

/**
 * 지금까지 몇 시간째 멈춰 있는지 — 마지막 표본부터 거슬러 세어 실제 구간에서 낸다.
 *
 * **마지막 표본이 결측이면 `null`이다.** 가동 중이어도 그 시각 데이터를 못 받았으면
 * 방류 여부를 모른다. 0시간째라고 적으면 "방금 멈췄다"는 없는 사실을 주장하게 된다(E4).
 */
function idleHoursUntilNow(siteId: string): number | null {
  if (isDischargingAt(siteId, TIMELINE_POINT_COUNT - 1) === null) return null;

  let samples = 0;
  for (let i = TIMELINE_POINT_COUNT - 1; i >= 0; i -= 1) {
    if (isDischargingAt(siteId, i) !== false) break;
    samples += 1;
  }
  return Math.round(samples / (60 / COLLECTION_INTERVAL_MINUTES));
}
