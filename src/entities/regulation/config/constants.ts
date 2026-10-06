import type {
  ComplianceJudgement,
  DischargeRoute,
  RuleEffect,
  RuleSource,
  StandardStatus,
} from '../model/types';

/**
 * 화면이 쓰는 말 — **한 곳에서 정한다.**
 *
 * 같은 상태를 화면마다 다른 낱말로 적으면 읽는 사람이 서로 다른 상태로 읽는다.
 * `UNRESOLVED_LIMIT_TEXT`가 네 화면의 `배출허용기준 미확정`·`미확정`·`기준값 미확정`·
 * `기준 미설정`을 하나로 묶은 것과 같은 이유다(`shared/config/discharge-limits.ts`).
 */

/**
 * **「아직 모른다」와 「적용 대상이 아니다」의 낱말이 겹치지 않는다**
 * `[사용자 요청 2026-09-28: 설정 재설계 검토]`. 겹치면 모르는 항목이 규제 밖 항목으로 읽힌다.
 */
export const STANDARD_STATUS_LABELS: Record<StandardStatus, string> = {
  RESOLVED: '적용 기준 확정',
  PROVISIONAL: '시연 임계값',
  UNRESOLVED: '기준 미확정',
  NOT_APPLICABLE: '적용 대상 아님',
  CONFLICT: '규정 충돌',
};

export const COMPLIANCE_LABELS: Record<ComplianceJudgement, string> = {
  COMPLIANT: '기준 이내',
  EXCEEDED: '기준 초과',
  PENDING_STANDARD: '기준 미확정 — 판정 보류',
  NOT_APPLICABLE: '적용 대상 아님',
  NO_MEASUREMENT: '수신 없음',
  CONFLICT: '규정 충돌 — 판정 보류',
};

/** 규정의 원천. 화면이 「왜 이 값인가」를 적을 때 쓴다 */
export const RULE_SOURCE_LABELS: Record<RuleSource, string> = {
  NATIONAL: '국가 일반기준',
  LOCAL_ORDINANCE: '조례 강화기준',
  SPECIAL_AREA: '특별지역 기준',
  SEPARATE_STANDARD: '별도배출허용기준',
  PERMIT_CONDITION: '허가조건',
  DEMO: '시연 기본값',
};

export const RULE_EFFECT_LABELS: Record<RuleEffect, string> = {
  BASE: '기준 설정',
  TIGHTEN: '강화',
  REPLACE: '대체',
  EXEMPT: '적용 제외',
};

/**
 * 방류·처리 경로의 선택지와 라벨 `[TBD-45]`가 결정 인자로 든 셋째 축이다.
 *
 * **배열이 따로 있는 이유** — 타입 유니온만으로는 화면이 순서대로 늘어놓을 수 없고,
 * 저장값을 걸러 낼 때도 실제 목록이 필요하다(모르는 문자열이 섞여 들어온다).
 */
export const DISCHARGE_ROUTES = [
  'PUBLIC_WATER',
  'SEWAGE_TREATMENT',
  'WASTEWATER_TREATMENT',
  'FULL_CONSIGNMENT',
  'FULL_REUSE',
] as const;

export const DISCHARGE_ROUTE_LABELS: Record<DischargeRoute, string> = {
  PUBLIC_WATER: '공공수역 직접방류',
  SEWAGE_TREATMENT: '공공하수처리시설 유입',
  WASTEWATER_TREATMENT: '공공폐수처리시설 유입',
  FULL_CONSIGNMENT: '전량 위탁',
  FULL_REUSE: '전량 재이용',
};

/**
 * 경로마다 **무엇을 뜻하는가** — 고르는 사람이 차이를 알고 골라야 하는 자리다
 * `[사용자 요청 2026-09-29: 사업장 설정 UI/UX 개편]`.
 *
 * **법적 효과는 근거가 있는 둘에만 적는다.** `[공정자료 p.11]`이 하천 직접방류는
 * **배출허용기준**, 공공하수처리장 위탁은 **공공처리시설 방류수 수질기준**을 받는다고 적었다.
 * 나머지 셋은 그 경로가 무엇인지만 적는다 — 어떤 기준이 걸리는지를 우리가 지어내면
 * 법정 판정값을 정하는 것과 같다(`README` §3.1).
 */
export const DISCHARGE_ROUTE_DESCRIPTIONS: Record<DischargeRoute, string> = {
  PUBLIC_WATER: '하천 등 공공수역으로 직접 내보낸다 · 배출허용기준을 받는다',
  SEWAGE_TREATMENT: '하수관로로 공공하수처리시설에 보낸다 · 방류수 수질기준을 받는다',
  WASTEWATER_TREATMENT: '공공폐수처리시설로 보낸다',
  FULL_CONSIGNMENT: '방류하지 않고 처리업체에 전량 위탁한다',
  FULL_REUSE: '방류하지 않고 전량 재이용한다',
};
