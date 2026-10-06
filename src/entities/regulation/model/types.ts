import type { MeasurementItemCode } from '@/shared/config/measurement';
import type { RegionGrade } from '@/shared/config/discharge-limits';

/**
 * **배출허용기준을 «입력받는 값»에서 «산출되는 값»으로 바꾼다**
 * `[사용자 요청 2026-09-28: 설정 재설계 검토]`.
 *
 * 지금까지는 사람이 `(지역구분 × 규모 × 항목)` 표에 숫자를 직접 넣었고 그것이 곧 적용값이었다.
 * 그 방식이 세 가지를 표현하지 못했다 — **사업장별 차이**(표에 사업장 축이 없다) ·
 * **방류 경로**(`[TBD-45]`가 결정 인자로 등록한 셋 중 하나가 코드에 없다) ·
 * **규칙의 성격**(국가 일반기준인지 조례 강화인지, 언제부터 유효한지).
 *
 * 그래서 축을 둘로 나눈다 — **규정(Rule)** 과 **사업장의 사실관계(Profile)**. 적용값은
 * 둘을 Resolver에 넣어 얻는 결과이고, 그 결과는 **왜 그 값인지를 역추적할 수 있다**(`trace`).
 *
 * **서버가 생기면 이 slice가 그대로 서버로 간다** — 순수 타입과 순수 함수뿐이고 React도
 * localStorage도 모른다.
 */

/**
 * 규정이 **어디서 왔는가**.
 *
 * **`DEMO`가 이 목록에 있는 이유** — 시연값을 «근거 없는 법정 기준»으로 섞지 않고 원천의
 * 한 종류로 드러낸다. 이 값이면 법정 판정을 하지 않는다(`isLegalSource`).
 *
 * **`PERMIT_CONDITION`의 법적 지위는 아직 모른다** `[TBD-62]` — 개별 허가조건이 국가
 * 일반기준을 대체하는지 강화하는지 확인되지 않았다. 그래서 그 «무엇을 하는가»는 원천이
 * 아니라 `RuleEffect`가 규칙마다 따로 선언한다.
 */
export type RuleSource =
  | 'NATIONAL'
  | 'LOCAL_ORDINANCE'
  | 'SPECIAL_AREA'
  | 'SEPARATE_STANDARD'
  | 'PERMIT_CONDITION'
  | 'DEMO';

/**
 * 그 규정이 **기존 기준에 무엇을 하는가**.
 *
 * **숫자를 비교해 추론하지 않는다** `[사용자 요청 2026-09-28]`. 「항상 더 엄격한 값이
 * 이긴다」는 일반화에는 법적 근거가 없고, pH처럼 범위형 기준에는 «더 엄격»이라는 말이
 * 한 방향으로 정해지지도 않는다. 규정이 **스스로 선언한 것만** 쓴다.
 */
export type RuleEffect = 'BASE' | 'TIGHTEN' | 'REPLACE' | 'EXEMPT';

/** 기준이 값을 거는 방향 */
export type RuleComparator = 'MAX' | 'MIN' | 'RANGE';

/**
 * 방류·처리 경로 `[TBD-45]`가 결정 인자로 든 셋째 축이다.
 *
 * 하천 직접방류는 **배출허용기준**을, 공공처리시설 유입은 **방류수 수질기준**을 받는다
 * `[공정자료 p.11]` — 적용되는 법 자체가 다르다. 실증 5개소 현장조사 36개 속성에도 이 값이
 * 없어 지금은 전부 미확인이다.
 */
export type DischargeRoute =
  | 'PUBLIC_WATER'
  | 'SEWAGE_TREATMENT'
  | 'WASTEWATER_TREATMENT'
  | 'FULL_CONSIGNMENT'
  | 'FULL_REUSE';

/**
 * 규정이 **어느 사업장에 걸리는가**.
 *
 * **지정하지 않은 축은 «무관»이다.** 전부 적어야 하면 축이 하나 늘 때마다 기존 규정을 전부
 * 고쳐야 한다 — 지금 우리가 아는 축은 넷뿐이고 앞으로 더 늘어난다.
 *
 * **모르는 사실은 «해당 없음»이 아니다.** 규정이 방류 경로를 요구하는데 사업장이 그것을
 * 모르면, 걸리는지 안 걸리는지를 **판정할 수 없다**(`UNKNOWN`) — «안 걸린다»로 떨어뜨리면
 * 모르는 것이 안전으로 둔갑한다(**E4**와 같은 종류의 구분이다).
 */
export interface RuleScope {
  regionGrades?: readonly RegionGrade[];
  dischargeRoutes?: readonly DischargeRoute[];
  /** 1일 폐수배출량 구간. **경계는 포함**이다(`minM3 <= 실측 <= maxM3`) */
  dailyFlow?: { minM3?: number; maxM3?: number };
  receivingFacilityIds?: readonly string[];
  industryCodes?: readonly string[];
  facilityCodes?: readonly string[];
  specialAreaCodes?: readonly string[];
}

export interface RegulatoryRule {
  id: string;
  pollutantCode: MeasurementItemCode;
  source: RuleSource;
  effect: RuleEffect;
  comparator: RuleComparator;
  /** `EXEMPT`는 값을 갖지 않는다 */
  min: number | null;
  max: number | null;
  /** 항목 사전의 단위와 같아야 한다 — 어긋나면 Resolver가 `CONFLICT`로 낸다 */
  unit: string;
  scope: RuleScope;
  /**
   * 시행일. 과거 측정은 **그때 유효했던 규정**으로 판정한다.
   *
   * **`null`은 «모른다»이고 언제나 유효한 것으로 본다.** 자리표시 날짜를 박아 두면 화면이
   * 그것을 실제 시행일로 인쇄한다 — `2000-01-01`이 전 항목에 찍히는 것을 보고 걷었다.
   * 지금 시행일을 아는 규정은 **하나도 없다**: 법령 표 자체가 없고 `[TBD-45]`, 사용자가
   * 넣는 허가증 값도 시행일을 받는 칸이 아직 없다.
   */
  effectiveFrom: string | null;
  /** 종료일. `null`이면 계속 유효하다 */
  effectiveTo: string | null;
  /** 근거 표기 — 화면이 이 문자열을 그대로 보인다 */
  citation: string;
}

/**
 * 사업장의 **사실관계**. 규정이 아니라 그 사업장이 어떤 곳인가다.
 *
 * **구간이 아니라 원시 값을 담는다** `[사용자 요청 2026-09-28]` — `'200㎥ 미만'`이 아니라
 * `dailyWastewaterM3: 191.6`이다. 구간 경계는 규정이 정하고 법이 바뀌면 규정만 바뀐다.
 * 구간 문자열을 저장하면 경계가 바뀔 때 **사업장 데이터를 전부 다시 분류해야 한다.**
 *
 * **모르는 것은 `null`이다.** 실증 5개소 현장조사 36개 속성에도 지역구분과 방류 경로가
 * 없어 지금은 대부분 `null`이고, Resolver가 그 사실을 `UNRESOLVED`와 `trace.missing`으로
 * 드러낸다.
 */
export interface SiteRegulatoryProfile {
  siteId: string;
  regionGrade: RegionGrade | null;
  /** 1일 폐수배출량(㎥). 허가량이 아니라 **실제 배출량**이다 */
  dailyWastewaterM3: number | null;
  dischargeRoute: DischargeRoute | null;
  /** 연결된 공공처리시설. 방류 경로가 그쪽일 때만 뜻이 있다 */
  receivingFacilityId: string | null;
  industryCodes: readonly string[] | null;
  facilityCodes: readonly string[] | null;
  dischargedPollutants: readonly MeasurementItemCode[] | null;
  hazardousPollutants: readonly string[] | null;
  specialAreaCodes: readonly string[] | null;
  evidence: readonly RegulatoryEvidence[];
  verificationStatus: VerificationStatus;
}

/**
 * **증빙은 값이 아니라 출처다** `[사용자 요청 2026-09-28]`.
 *
 * 허가증·신고증을 «기준값이 적힌 문서»로 다루지 않는다 — 그 문서가 확인해 주는 것은
 * 배출량·배출물질·시설 유형·처리방식·방류경로 같은 **사실관계**다. 개별 허가조건이
 * 기준값을 대체하거나 강화하는 법적 근거가 확인되면 그때 `PERMIT_CONDITION` 규정으로
 * 등록한다 `[TBD-62]`.
 */
export interface RegulatoryEvidence {
  kind: 'PERMIT' | 'REPORT' | 'FIELD_SURVEY' | 'SELF_DECLARATION';
  /** 무엇을 확인해 주는가 */
  confirms: readonly string[];
  citation: string;
  obtainedIso: string | null;
}

export type VerificationStatus = 'UNVERIFIED' | 'SELF_REPORTED' | 'VERIFIED';

/**
 * 기준을 **정할 수 있었는가**.
 *
 * **`UNRESOLVED`와 `NOT_APPLICABLE`은 다른 말이다** `[사용자 요청 2026-09-28]` —
 * 「아직 모른다」와 「적용 대상이 아니다」를 한 상태로 만들면, 모르는 항목이 규제 밖 항목으로
 * 읽힌다. `NOT_APPLICABLE`은 **적용 제외를 선언한 규정이 실제로 걸렸을 때만** 나온다.
 */
export type StandardStatus =
  | 'RESOLVED'
  | 'PROVISIONAL'
  | 'UNRESOLVED'
  | 'NOT_APPLICABLE'
  | 'CONFLICT';

/** 규정 하나가 **어떻게 처리됐는가** — 이 줄들이 모여 «왜 이 값인가»가 된다 */
export interface TraceEntry {
  ruleId: string | null;
  outcome:
    | 'DECISIVE'
    | 'MATCHED'
    | 'SUPERSEDED'
    | 'OUT_OF_SCOPE'
    | 'OUT_OF_PERIOD'
    | 'UNKNOWN_FACT'
    | 'CONFLICT';
  /** 사람이 읽는 한 줄 */
  reason: string;
  /** `UNKNOWN_FACT`일 때 **무엇을 모르는가** — 화면이 그것을 물어야 한다 */
  missing?: readonly string[];
}

export interface ResolvedStandard {
  siteId: string;
  pollutantCode: MeasurementItemCode;
  /** 어느 시점 기준인가. 과거 측정은 그때 유효했던 규정으로 판정한다 */
  asOf: string;
  status: StandardStatus;
  min: number | null;
  max: number | null;
  unit: string | null;
  matchedRuleIds: readonly string[];
  decisiveRuleId: string | null;
  /**
   * **결정 규정의 시행일** — 「언제부터 이 값인가」다 `[사용자 요청 2026-09-28]`.
   *
   * 값만 있고 시행일이 없으면, 기준이 바뀌었을 때 **과거 판정이 왜 달랐는지**를 화면에서
   * 되짚을 수 없다. 결정 규정이 없거나 **그 규정이 시행일을 모르면** `null`이다.
   */
  effectiveFrom: string | null;
  trace: readonly TraceEntry[];
}

/**
 * 측정값이 기준을 지켰는가.
 *
 * **여섯을 가른다** `[사용자 요청 2026-09-28]`. `boolean | null` 하나로는 「값이 없다」와
 * 「기준이 없다」와 「적용 대상이 아니다」가 전부 같은 `null`이 된다 — 화면이 셋에 대해
 * 서로 다른 말을 해야 하는데 구분할 방법이 없다.
 */
export type ComplianceJudgement =
  | 'COMPLIANT'
  | 'EXCEEDED'
  | 'PENDING_STANDARD'
  | 'NOT_APPLICABLE'
  | 'NO_MEASUREMENT'
  | 'CONFLICT';

export interface ComplianceResult {
  judgement: ComplianceJudgement;
  /**
   * **무엇으로 판정했는가.** `provisional`이면 법정 초과가 아니다 — 화면 문구와 색이
   * 이 값으로 갈린다(`shared/config/discharge-limits.ts`의 `LimitBasis`와 같은 축이다).
   */
  basis: 'legal' | 'provisional' | 'none';
  standard: ResolvedStandard;
}
