import { SITE_SCENARIOS } from '@/shared/config/demo-scenario';
import type { SiteRegulatoryProfile } from '../../model/types';

/**
 * 사업장의 **사실관계** — 지금은 대부분 비어 있고, 그것이 사실이다
 * `[사용자 요청 2026-09-28: 설정 재설계 검토]`.
 *
 * **비어 있음을 채우지 않는다.** 실증 1차 5개소 현장조사 36개 속성에도 **지역구분과 방류
 * 경로가 없다** `[TBD-45]`. 배출량은 현장조사가 알려 주지만 *"실 데이터 연동 전까지는 내용만
 * 참고한다"* `[사용자 결정 2026-09-28]` — 시연 10개소에 그 값을 옮겨 적으면 어느 것이
 * 실측이고 어느 것이 시연값인지 구별되지 않는다.
 *
 * **그래서 화면은 비지 않는다.** 법정 규정이 걸리지 않으면 시연 규정이 받으므로
 * (`PROVISIONAL`) 값과 판정이 그대로 보이고, **무엇을 몰라서 법정 판정이 아닌지**는
 * `trace.missing`이 적는다 — 회의에서 물어야 할 것이 화면에 있게 된다.
 *
 * 서버가 생기면 이 fixture가 제거 대상이다 — 사업장 규제정보는 서버가 갖는다.
 */
export const SITE_REGULATORY_PROFILES: readonly SiteRegulatoryProfile[] = SITE_SCENARIOS.map(
  (scenario) => ({
    siteId: scenario.id,
    /* 원문·현장조사 어디에도 없다 — `demo-scenario.ts`가 이미 `null`로 두고 그 이유를 적었다 */
    regionGrade: scenario.regionGrade,
    dailyWastewaterM3: null,
    dischargeRoute: null,
    receivingFacilityId: null,
    industryCodes: null,
    facilityCodes: null,
    dischargedPollutants: null,
    hazardousPollutants: null,
    specialAreaCodes: null,
    evidence: [],
    verificationStatus: 'UNVERIFIED',
  }),
);

const BY_ID = new Map(SITE_REGULATORY_PROFILES.map((profile) => [profile.siteId, profile]));

/**
 * 없는 사업장을 물으면 **빈 프로필**을 낸다.
 *
 * `undefined`를 내면 호출부가 판정을 건너뛰어 그 사업장이 조용히 목록에서 빠진다 —
 * 빈 프로필이면 `UNRESOLVED`가 되어 «확인할 수 없다»가 화면에 남는다(**E4**).
 */
export function getRegulatoryProfile(siteId: string): SiteRegulatoryProfile {
  return (
    BY_ID.get(siteId) ?? {
      siteId,
      regionGrade: null,
      dailyWastewaterM3: null,
      dischargeRoute: null,
      receivingFacilityId: null,
      industryCodes: null,
      facilityCodes: null,
      dischargedPollutants: null,
      hazardousPollutants: null,
      specialAreaCodes: null,
      evidence: [],
      verificationStatus: 'UNVERIFIED',
    }
  );
}
