import {
  INLET_BY_OUTLET_CODE,
  MEASUREMENT_ITEMS,
  type InletSeriesCode,
} from '@/shared/config/measurement';
import {
  PROVISIONAL_TREATMENT_RETENTION,
  PROVISIONAL_TREATMENT_SIMILAR_PERCENT,
  PROVISIONAL_TREATMENT_STALL_RETENTION,
  PROVISIONAL_TREATMENT_STALL_SITES,
} from '@/shared/config/provisional';
import { clamp, roundTo } from '@/shared/lib/prng';
import type { MeasurementPoint, SeriesCode } from '../model/types';

/**
 * 유입 수질을 **유출 실측에서 역산해 표본에 채운다** `[TBD-59]` `[PROVISIONAL]`.
 *
 * `유입 = 유출 ÷ 잔존율`. 따로 만들면 유출과 무관하게 움직여 **두 지점의 차가 뜻을 잃는다** —
 * 이 값이 있는 이유가 그 차이다 `[회의 2026-09-08]`.
 *
 * **fixture와 실측이 이 함수 하나를 함께 쓴다.** 두 경로에 같은 식을 두 번 적으면 한쪽만
 * 고쳐져 «내장 데이터로 볼 때와 서버로 볼 때 처리 판정이 다른» 화면이 된다.
 *
 * **유출이 결측이면 유입도 결측이다.** 같은 사업장이 두절인 시간이라 «한쪽만 왔다»가
 * 성립하지 않고, 없는 값에서 역산하면 두절 구간이 정상처럼 이어진다(**E4**).
 *
 * 값을 **제자리에서 고친다** — 격자 표본이 1,440개라 표본마다 객체를 새로 만들면 사업장을
 * 넘길 때마다 그만큼 복사한다. 부르는 쪽이 방금 만든 표본에만 쓴다.
 */
export function fillInletQuality(point: MeasurementPoint, siteId: string): void {
  const stalled = PROVISIONAL_TREATMENT_STALL_SITES.includes(siteId);

  for (const [outletCode, inletCode] of Object.entries(INLET_BY_OUTLET_CODE) as [
    SeriesCode,
    InletSeriesCode,
  ][]) {
    const outlet = point[outletCode];
    if (outlet === null || outlet === undefined) {
      point[inletCode] = null;
      continue;
    }

    const [lo, hi] = MEASUREMENT_ITEMS[inletCode].range;
    point[inletCode] = roundTo(
      clamp(outlet / retentionOf(outletCode, stalled), lo, hi),
      MEASUREMENT_ITEMS[inletCode].decimals,
    );
  }
}

/**
 * 정체를 심은 사업장에서는 **판정 대상 항목만** 1에 가깝게 민다.
 *
 * 판정하지 않는 셋(pH·EC·수온)까지 밀면 «처리가 안 됐다»와 무관한 줄이 함께 붙어, 화면이
 * 무엇을 근거로 그렇게 적었는지 흐려진다.
 */
function retentionOf(outletCode: SeriesCode, stalled: boolean): number {
  const spec = PROVISIONAL_TREATMENT_RETENTION[outletCode];
  if (spec === undefined) return 1;
  return stalled && spec.judged ? PROVISIONAL_TREATMENT_STALL_RETENTION : spec.retention;
}

/** 이 항목에 «유사 = 처리 미흡»이 성립하는가 `[TBD-59]` */
export function isTreatmentJudged(outletCode: SeriesCode): boolean {
  return PROVISIONAL_TREATMENT_RETENTION[outletCode]?.judged === true;
}

/**
 * 유입 대비 변화율(%). **부호를 살린다** — 폭기가 올리는 DO는 양의 방향이고, 그것을 절댓값으로
 * 접으면 «올랐다»와 «줄었다»가 같아 보인다.
 *
 * 한쪽이라도 모르면 `null`이다(**E4**). 유입이 0이면 나눌 수 없어 역시 `null`이다 — 0으로
 * 두면 «변화 없음»이라는, 재 보지 않은 주장이 된다.
 */
export function changeRatePercent(inlet: number | null, outlet: number | null): number | null {
  if (inlet === null || outlet === null || inlet === 0) return null;
  return ((outlet - inlet) / inlet) * 100;
}

/**
 * **유입과 거의 같은가** — 회의가 «문제»라 규정한 상태 `[회의 2026-09-08]`.
 *
 * 경계는 `[TBD-59]`의 임시값이다. 판정 대상이 아닌 항목은 여기서 답하지 않는다 —
 * 부르는 쪽이 `isTreatmentJudged`로 먼저 거른다.
 */
export function isSimilar(changePercent: number | null): boolean {
  return changePercent !== null && Math.abs(changePercent) < PROVISIONAL_TREATMENT_SIMILAR_PERCENT;
}
