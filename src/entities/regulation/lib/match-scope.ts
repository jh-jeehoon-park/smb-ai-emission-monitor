import type { RuleScope, SiteRegulatoryProfile } from '../model/types';

/**
 * 규정이 그 사업장에 **걸리는가**.
 *
 * 세 답이다 — 걸린다 · 안 걸린다 · **알 수 없다**. 셋째를 둘째로 떨어뜨리면 모르는 사실이
 * «해당 없음»이 되어 판정에서 조용히 빠진다(**E4**와 같은 종류의 구분이다).
 */
export type ScopeMatch =
  | { kind: 'MATCH' }
  | { kind: 'MISS'; axis: string }
  | { kind: 'UNKNOWN'; missing: readonly string[] };

/** 사람이 읽는 축 이름 — `trace.missing`에 그대로 실린다 */
const AXIS_LABEL = {
  regionGrades: '지역구분',
  dischargeRoutes: '방류·처리 경로',
  dailyFlow: '1일 폐수배출량',
  receivingFacilityIds: '연결 공공처리시설',
  industryCodes: '업종',
  facilityCodes: '폐수배출시설 유형',
  specialAreaCodes: '특별지역 지정',
} as const;

/** 한 축을 본다. 규정이 지정하지 않았으면 «무관»이라 통과다 */
function axis<T>(
  required: readonly T[] | undefined,
  actual: T | readonly T[] | null,
): 'pass' | 'miss' | 'unknown' {
  if (required === undefined) return 'pass';
  if (actual === null) return 'unknown';

  const values = Array.isArray(actual) ? (actual as readonly T[]) : [actual as T];
  /* 사업장이 «아무것도 없음»을 사실로 신고한 경우와 모르는 경우는 다르다 — 빈 배열은 사실이다 */
  return values.some((value) => required.includes(value)) ? 'pass' : 'miss';
}

export function matchScope(scope: RuleScope, profile: SiteRegulatoryProfile): ScopeMatch {
  const missing: string[] = [];

  const checks: [ReturnType<typeof axis>, string][] = [
    [axis(scope.regionGrades, profile.regionGrade), AXIS_LABEL.regionGrades],
    [
      axis(scope.dischargeRoutes, profile.dischargeRoute),
      AXIS_LABEL.dischargeRoutes,
    ],
    [
      axis(scope.receivingFacilityIds, profile.receivingFacilityId),
      AXIS_LABEL.receivingFacilityIds,
    ],
    [axis(scope.industryCodes, profile.industryCodes), AXIS_LABEL.industryCodes],
    [axis(scope.facilityCodes, profile.facilityCodes), AXIS_LABEL.facilityCodes],
    [
      axis(scope.specialAreaCodes, profile.specialAreaCodes),
      AXIS_LABEL.specialAreaCodes,
    ],
    [flowAxis(scope, profile), AXIS_LABEL.dailyFlow],
  ];

  /*
   * **«안 걸린다»가 «모른다»보다 세다.** 한 축이라도 확실히 어긋나면 나머지를 몰라도 그
   * 규정은 걸리지 않는다 — 모르는 축을 먼저 보면 «알 수 없다»가 되어 판정이 멈춘다.
   */
  const miss = checks.find(([result]) => result === 'miss');
  if (miss) return { kind: 'MISS', axis: miss[1] };

  for (const [result, label] of checks) {
    if (result === 'unknown') missing.push(label);
  }
  return missing.length > 0 ? { kind: 'UNKNOWN', missing } : { kind: 'MATCH' };
}

/** 배출량은 목록이 아니라 구간이다. **경계는 포함**이다 */
function flowAxis(scope: RuleScope, profile: SiteRegulatoryProfile): 'pass' | 'miss' | 'unknown' {
  const range = scope.dailyFlow;
  if (range === undefined) return 'pass';

  const value = profile.dailyWastewaterM3;
  if (value === null) return 'unknown';
  if (range.minM3 !== undefined && value < range.minM3) return 'miss';
  if (range.maxM3 !== undefined && value > range.maxM3) return 'miss';
  return 'pass';
}
