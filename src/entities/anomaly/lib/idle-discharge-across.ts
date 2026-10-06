import { canJudgeIdleDischarge, findIdleDischargeRuns } from './idle-discharge';

/** 사업장 하나의 방류 의심 판정 결과 */
export interface IdleDischargeVerdict {
  siteId: string;
  /** 판정할 수 없으면 `null`. **0이 아니다** */
  runs: number | null;
}

/**
 * 관내 사업장들의 방류 의심을 한 번에 센다.
 *
 * **판정 로직을 다시 쓰지 않는다** — 단일 사업장 화면과 같은 함수를 감싸기만 한다.
 * 두 화면이 같은 구간을 다르게 세면 어느 쪽이 맞는지 알 방법이 없고, 임계값
 * `[TBD-46]`이 확정될 때 고칠 자리도 둘이 된다.
 */
export function idleDischargeAcross(siteIds: readonly string[]): IdleDischargeVerdict[] {
  return siteIds.map((siteId) => ({
    siteId,
    runs: canJudgeIdleDischarge(siteId) ? findIdleDischargeRuns(siteId).length : null,
  }));
}

export interface IdleDischargeTally {
  /** 의심 구간이 하나 이상인 사업장 수 */
  suspected: number;
  /** 판정할 수 없는 사업장 수. **`suspected`에 더하지 않는다** */
  unjudged: number;
  /** 의심 구간의 총합. 판정 불가는 세지 않는다 */
  runs: number;
}

/**
 * **두 수를 함께 낸다.** `의심 0개소`만 적으면 감독자가 *"관내가 깨끗하다"* 로 읽는데,
 * 두절된 사업장은 **확인되지 않았을 뿐**이다(**E4**).
 *
 * ```
 * 틀림   방류의심 0개소            ← 두절을 "깨끗함"으로 둔갑시킨다
 * 맞음   방류의심 0개소 · 판정 불가 1개소
 * ```
 */
export function tallyIdleDischarge(verdicts: readonly IdleDischargeVerdict[]): IdleDischargeTally {
  return {
    suspected: verdicts.filter((v) => v.runs !== null && v.runs > 0).length,
    unjudged: verdicts.filter((v) => v.runs === null).length,
    runs: verdicts.reduce((sum, v) => sum + (v.runs ?? 0), 0),
  };
}
