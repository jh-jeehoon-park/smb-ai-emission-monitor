import { siteSeed } from '@/shared/config/demo-scenario';
import { createRng } from '@/shared/lib/prng';
import { isMissingAt, isTreatmentIdleAt, timelineIsoAt } from '@/shared/lib/timeline';
import { STATUS_TIMELINE_HOURS, SAMPLES_PER_STATUS_CELL } from '../config/constants';
import type { Equipment, EquipmentRunCell, TreatmentCell } from '../model/types';

/**
 * 24시간 × 설비의 **가동 상태 격자**.
 *
 * 한 칸은 한 시간이다. 원문 예시가 `00시~24시`를 시간 단위로 끊는다 `[원문 발표 p.18 그림]`.
 * 5분 표본을 그대로 쓰면 288칸이 되어 색을 구분할 수 없다.
 *
 * **칸이 말하는 것이 바뀌었다** — 예전에는 상태 등급(고장 확률 기반)이었고 지금은 가동
 * 여부다 `[회의 2026-08-20]` `[INC-107]`. 회의가 확인 가능하다고 한 것이 on/off와 이상
 * 알림 둘이라 격자도 그 둘만 담는다.
 *
 * **한 시간 안에 결측이 하나라도 있으면 그 칸은 모름이다.** 나머지 표본으로 채워 넣으면
 * 끊긴 시간이 화면에서 사라진다(E4).
 */
export function getRunTimeline(siteId: string, equipment: Equipment): EquipmentRunCell[] {
  const rng = createRng(siteSeed(`${siteId}-${equipment.id}`, 88402));
  /* 이상이 시작된 시각부터 지금까지가 이상 구간이다. 카드에 적힌 값과 같은 축을 쓴다 */
  const anomalyFrom =
    equipment.anomalyHours === null ? null : STATUS_TIMELINE_HOURS - equipment.anomalyHours;

  return Array.from({ length: STATUS_TIMELINE_HOURS }, (_, hour) => {
    const from = hour * SAMPLES_PER_STATUS_CELL;
    const samples = Array.from({ length: SAMPLES_PER_STATUS_CELL }, (_, k) => from + k);
    const iso = timelineIsoAt(from);

    if (samples.some((index) => isMissingAt(siteId, index))) {
      return { hourOffset: hour, iso, running: null, signals: [] };
    }

    const last = hour === STATUS_TIMELINE_HOURS - 1;
    /*
     * **마지막 칸은 카드에 적힌 지금 값 그대로다.** 그 칸이 곧 현재라 흔들림을 얹으면
     * 격자는 `가동`, 카드는 `정지`가 되어 한 화면이 현재를 두 가지로 말한다.
     */
    const running = last ? equipment.running : rng() > 0.12;

    return {
      hourOffset: hour,
      iso,
      running,
      /* 이상 구간 안이면 지금 걸린 신호를 그대로 쓴다 — 시간마다 다른 신호를 만들 근거가 없다 */
      signals: anomalyFrom !== null && hour >= anomalyFrom ? equipment.signals : [],
    };
  });
}

/**
 * 같은 격자의 **방지시설 가동 여부** 줄.
 *
 * 설비 칸에 함께 담지 않는다. 방지시설 가동은 **사업장 단위 사실**이고, 설비 칸에 붙이면
 * "이 방류 펌프도 멈춰 있었다"를 주장하게 된다 — 방지시설은 멈췄는데 방류 펌프는 돌았다는
 * 것이 바로 무단방류 의심의 요지다(`TBD-46`). 두 축을 겹치면 그 구분이 사라진다.
 *
 * 판정 자체는 `isTreatmentIdleAt`이 이미 한다. 여기서는 시간 단위로 묶기만 한다.
 */
export function getTreatmentTimeline(siteId: string): TreatmentCell[] {
  return Array.from({ length: STATUS_TIMELINE_HOURS }, (_, hour) => {
    const from = hour * SAMPLES_PER_STATUS_CELL;
    const samples = Array.from({ length: SAMPLES_PER_STATUS_CELL }, (_, k) =>
      isTreatmentIdleAt(siteId, from + k),
    );

    /* 한 표본이라도 모르면 그 시간은 모름이다 — 아는 것만 모아 단정하면 공백이 사라진다(E4) */
    const idle = samples.some((v) => v === null) ? null : samples.some((v) => v === true);

    return { hourOffset: hour, iso: timelineIsoAt(from), idle };
  });
}
