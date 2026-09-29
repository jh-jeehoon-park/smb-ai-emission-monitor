/** slice Public API — 바깥에서는 이 파일만 import 한다 */
export type {
  ComplianceJudgement,
  ComplianceResult,
  DischargeRoute,
  RegulatoryEvidence,
  RegulatoryRule,
  ResolvedStandard,
  RuleComparator,
  RuleEffect,
  RuleScope,
  RuleSource,
  SiteRegulatoryProfile,
  StandardStatus,
  TraceEntry,
  VerificationStatus,
} from './model/types';
export { resolveDischargeStandard, type ResolveInput } from './lib/resolve-standard';
export { judgeCompliance } from './lib/judge';
export { matchScope, type ScopeMatch } from './lib/match-scope';
export {
  COMPLIANCE_LABELS,
  DISCHARGE_ROUTES,
  DISCHARGE_ROUTE_DESCRIPTIONS,
  DISCHARGE_ROUTE_LABELS,
  RULE_EFFECT_LABELS,
  RULE_SOURCE_LABELS,
  STANDARD_STATUS_LABELS,
} from './config/constants';
export { StandardTable, type StandardRow } from './ui/standard-table';
export { REGULATORY_RULES, DEMO_LIMIT_SOURCE, userLimitSource } from './api/fixtures/rules';
export { SITE_REGULATORY_PROFILES, getRegulatoryProfile } from './api/fixtures/profiles';
