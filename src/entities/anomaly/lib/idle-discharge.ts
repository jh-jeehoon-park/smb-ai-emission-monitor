import { PROVISIONAL_IDLE_DISCHARGE_MIN_SAMPLES } from '@/shared/config/provisional';
import {
  TIMELINE_POINT_COUNT,
  isDischargingAt,
  isTreatmentIdleAt,
  timelineIsoAt,
} from '@/shared/lib/timeline';

/**
 * 방지시설이 멈춘 채 방류가 이어진 구간.
 *
 * **`무단`이라고 부르지 않는다.** 무단 여부는 신고 정보가 있어야 정해지고, 원문도
 * *"방류 유무 판단 **가능성 검토**"* 까지만 말한다 `[원문 발표 p.13]` `[TBD-46]`.
 * 저류된 물을 내보내는 중일 수도 있다 — 화면이 판정이 아니라 의심으로 적어야 하는 이유다.
 */
export interface IdleDischargeRun {
  /** 표본 인덱스(시작·끝 포함) */
  from: number;
  to: number;
  fromIso: string;
  toIso: string;
  /** 표본 수. 시간 환산은 화면이 한다 */
  samples: number;
}

/**
 * 의심 구간을 찾는다.
 *
 * 조건은 **방류 중(`true`) ∧ 방지시설 미가동(`true`)** 이 연속으로 이어진 것이다.
 * 어느 한쪽이라도 `null`(수신 없음)이면 **구간이 거기서 끊긴다** — 모르는 시간을 이어 붙이면
 * 없는 의심을 만든다(E4). `false`로 접지 않는 이유도 같다.
 *
 * **체류시간 보정은 하지 않는다.** 원문이 "고려한다"고만 하고 값을 주지 않았다 `[TBD-46]`.
 * 보정 없이 세면 유입이 멈춘 직후 잔류수가 흘러나가는 시간까지 의심으로 잡힐 수 있다 —
 * 화면이 그 한계를 함께 적는다.
 */
export function findIdleDischargeRuns(
  siteId: string,
  minSamples: number = PROVISIONAL_IDLE_DISCHARGE_MIN_SAMPLES,
): IdleDischargeRun[] {
  const runs: IdleDischargeRun[] = [];
  let start: number | null = null;

  const close = (end: number) => {
    if (start === null) return;
    const samples = end - start + 1;
    if (samples >= minSamples) {
      runs.push({
        from: start,
        to: end,
        fromIso: timelineIsoAt(start),
        toIso: timelineIsoAt(end),
        samples,
      });
    }
    start = null;
  };

  for (let i = 0; i < TIMELINE_POINT_COUNT; i += 1) {
    const suspect = isDischargingAt(siteId, i) === true && isTreatmentIdleAt(siteId, i) === true;
    if (suspect) {
      if (start === null) start = i;
      continue;
    }
    close(i - 1);
  }
  close(TIMELINE_POINT_COUNT - 1);

  return runs;
}

/**
 * 판정 자체가 불가능한 사업장인가.
 *
 * 전 구간이 결측이면 의심 **0건**이 아니라 **모름**이다. 0건으로 적으면 "확인했더니 없었다"는
 * 사실 주장이 되어, 통신이 끊긴 사업장이 깨끗한 사업장으로 둔갑한다(E4).
 */
export function canJudgeIdleDischarge(siteId: string): boolean {
  for (let i = 0; i < TIMELINE_POINT_COUNT; i += 1) {
    if (isTreatmentIdleAt(siteId, i) !== null) return true;
  }
  return false;
}
