import type { MeasurementItemCode } from '@/shared/config/measurement';
import { matchScope } from './match-scope';
import type {
  RegulatoryRule,
  ResolvedStandard,
  RuleEffect,
  SiteRegulatoryProfile,
  StandardStatus,
  TraceEntry,
} from '../model/types';

/**
 * 규정 + 사업장 사실관계 → **그 사업장 그 항목에 지금 적용되는 기준**.
 *
 * **순수 함수다.** React도 localStorage도 모른다 — 서버가 생기면 이 파일이 그대로 서버로 간다.
 *
 * 세 가지를 지킨다 `[사용자 요청 2026-09-28: 설정 재설계 검토]`.
 *
 * 1. **`Math.min`으로 충돌을 풀지 않는다.** 「항상 더 엄격한 값이 이긴다」는 일반화에는
 *    법적 근거가 없고, pH처럼 범위형 기준에는 «더 엄격»의 방향이 정해지지도 않는다.
 *    규정이 **스스로 선언한 효력**(`RuleEffect`)만 쓰고, 풀 수 없으면 `CONFLICT`로 낸다.
 * 2. **모르는 사실을 «해당 없음»으로 떨어뜨리지 않는다.** 규정이 요구하는 축을 사업장이
 *    모르면 그 규정이 걸리는지 알 수 없고, 그러면 **답 자체가 확정되지 않는다**(`UNRESOLVED`).
 * 3. **시연값으로 법정 판정을 하지 않는다.** `source: 'DEMO'`는 법정 규정이 하나도 답을
 *    주지 못했을 때만 쓰이고, 그때 상태는 `PROVISIONAL`이다.
 */
export interface ResolveInput {
  profile: SiteRegulatoryProfile;
  rules: readonly RegulatoryRule[];
  pollutantCode: MeasurementItemCode;
  /** 이 시점에 유효한 규정으로 판정한다. 과거 측정은 그때 값을 넣는다 */
  asOf: string;
}

const isLegal = (rule: RegulatoryRule) => rule.source !== 'DEMO';

/**
 * 그 시점에 살아 있는 규정인가. `effectiveTo`는 **열린 끝**이다(그 날부터는 적용 안 함).
 *
 * **시행일을 모르면 걸러 내지 않는다.** 모른다는 이유로 빼면 지금 우리가 가진 규정이
 * 전부 사라진다 — 시행일을 아는 규정이 아직 하나도 없다.
 */
function inPeriod(rule: RegulatoryRule, asOf: string): boolean {
  if (rule.effectiveFrom !== null && asOf < rule.effectiveFrom) return false;
  return rule.effectiveTo === null || asOf < rule.effectiveTo;
}

const sameValue = (a: RegulatoryRule, b: RegulatoryRule) =>
  a.min === b.min && a.max === b.max && a.unit === b.unit && a.comparator === b.comparator;

/** 한 효력 단에서 **하나를 고를 수 있는가**. 값이 같으면 여럿이어도 충돌이 아니다 */
function pickOne(rules: readonly RegulatoryRule[]): RegulatoryRule | 'CONFLICT' | null {
  if (rules.length === 0) return null;
  const [first, ...rest] = rules;
  return rest.every((rule) => sameValue(first!, rule)) ? first! : 'CONFLICT';
}

export function resolveDischargeStandard(input: ResolveInput): ResolvedStandard {
  const { profile, rules, pollutantCode, asOf } = input;
  const trace: TraceEntry[] = [];
  const matched: RegulatoryRule[] = [];
  const missing = new Set<string>();

  for (const rule of rules) {
    if (rule.pollutantCode !== pollutantCode) continue;

    if (!inPeriod(rule, asOf)) {
      trace.push({
        ruleId: rule.id,
        outcome: 'OUT_OF_PERIOD',
        reason: `${rule.effectiveFrom ? `${rule.effectiveFrom.slice(0, 10)} 시행` : '시행일 미상'}${rule.effectiveTo ? ` · ${rule.effectiveTo.slice(0, 10)} 종료` : ''} — 이 시점에 유효하지 않다`,
      });
      continue;
    }

    const scope = matchScope(rule.scope, profile);
    if (scope.kind === 'MISS') {
      trace.push({ ruleId: rule.id, outcome: 'OUT_OF_SCOPE', reason: `${scope.axis}이(가) 다르다` });
      continue;
    }
    if (scope.kind === 'UNKNOWN') {
      for (const axis of scope.missing) missing.add(axis);
      trace.push({
        ruleId: rule.id,
        outcome: 'UNKNOWN_FACT',
        reason: '이 규정이 걸리는지 판정할 수 없다 — 사업장 사실관계가 비어 있다',
        missing: scope.missing,
      });
      continue;
    }

    matched.push(rule);
    trace.push({ ruleId: rule.id, outcome: 'MATCHED', reason: `${rule.citation}` });
  }

  /*
   * **적용 제외가 가장 세다.** 걸리는 규정이 «이 사업장 이 항목은 대상이 아니다»라고
   * 선언하면 나머지를 따질 이유가 없다. 이것만이 `NOT_APPLICABLE`을 만든다 —
   * «아직 모른다»(`UNRESOLVED`)와 절대 합치지 않는다.
   */
  const exempt = matched.find((rule) => rule.effect === 'EXEMPT');
  if (exempt) {
    trace.push({ ruleId: exempt.id, outcome: 'DECISIVE', reason: '적용 제외' });
    return build(input, 'NOT_APPLICABLE', null, matched, exempt.id, trace);
  }

  /* 법정 규정으로 먼저 푼다. 시연값은 법정이 아무 답도 주지 못했을 때만 쓴다 */
  const legal = resolveTier(matched.filter(isLegal), trace);
  if (legal === 'CONFLICT') return build(input, 'CONFLICT', null, matched, null, trace);

  if (legal) {
    /* 사실관계를 몰라 걸릴지 알 수 없는 규정이 남아 있으면 이 답은 **확정이 아니다** */
    if (missing.size > 0) {
      trace.push({
        ruleId: null,
        outcome: 'UNKNOWN_FACT',
        reason: '걸릴 수 있는 다른 규정이 있어 이 값이 최종인지 알 수 없다',
        missing: [...missing],
      });
      return build(input, 'UNRESOLVED', null, matched, null, trace);
    }
    trace.push({ ruleId: legal.id, outcome: 'DECISIVE', reason: legal.citation });
    return build(input, 'RESOLVED', legal, matched, legal.id, trace);
  }

  const demo = resolveTier(matched.filter((rule) => !isLegal(rule)), trace);
  if (demo === 'CONFLICT') return build(input, 'CONFLICT', null, matched, null, trace);
  if (demo) {
    trace.push({
      ruleId: demo.id,
      outcome: 'DECISIVE',
      /*
       * 근거 문구를 **그대로** 쓴다. 한때 뒤에 「— 법정 배출허용기준이 아니다」를 덧붙였는데 시연
       * 규정의 문구가 이미 `법정 기준 아님`이라 화면에 같은 말이 두 번 찍혔다. 법정이 아니라는
       * 보증은 문구가 아니라 **상태(`PROVISIONAL`)** 가 진다.
       */
      reason: demo.citation,
      ...(missing.size > 0 ? { missing: [...missing] } : {}),
    });
    return build(input, 'PROVISIONAL', demo, matched, demo.id, trace);
  }

  /*
   * 아무 규정도 답을 주지 못했다. **«대상이 아니다»가 아니라 «모른다»다** — 그 항목에
   * 규정이 없다는 것은 규제 밖이라는 뜻이 아니라 우리가 아직 그 규정을 갖고 있지 않다는 뜻이다.
   */
  if (missing.size > 0) {
    trace.push({
      ruleId: null,
      outcome: 'UNKNOWN_FACT',
      reason: '사업장 사실관계가 비어 있어 규정을 고를 수 없다',
      missing: [...missing],
    });
  }
  return build(input, 'UNRESOLVED', null, matched, null, trace);
}

/**
 * 한 원천 단(법정 또는 시연) 안에서 **효력 순서대로** 값을 정한다.
 *
 * `BASE`가 기준을 세우고 `REPLACE`가 그것을 갈아치우며 `TIGHTEN`이 조인다. **순서는
 * 규정이 선언한 효력이 정하고 숫자가 정하지 않는다.** 같은 단에 값이 다른 규정이 둘이면
 * 어느 쪽이 governing인지 우리가 알 수 없으므로 `CONFLICT`다.
 */
function resolveTier(
  rules: readonly RegulatoryRule[],
  trace: TraceEntry[],
): RegulatoryRule | 'CONFLICT' | null {
  if (rules.length === 0) return null;

  const of = (effect: RuleEffect) => rules.filter((rule) => rule.effect === effect);

  for (const effect of ['REPLACE', 'TIGHTEN', 'BASE'] as const) {
    const picked = pickOne(of(effect));
    if (picked === 'CONFLICT') {
      for (const rule of of(effect)) {
        trace.push({
          ruleId: rule.id,
          outcome: 'CONFLICT',
          reason: `같은 효력(${effect})의 규정이 서로 다른 값을 준다 — 어느 쪽이 우선인지 근거가 없다`,
        });
      }
      return 'CONFLICT';
    }
    if (picked) {
      /* 아래 단은 이 규정에 밀린다 — 밀렸다는 사실도 기록한다 */
      for (const rule of rules) {
        if (rule.id !== picked.id && rule.effect !== effect) {
          trace.push({ ruleId: rule.id, outcome: 'SUPERSEDED', reason: `${effect} 규정에 밀린다` });
        }
      }
      return picked;
    }
  }
  return null;
}

/** 단위가 어긋나면 값을 비교할 수 없다 — 조용히 쓰면 자릿수가 통째로 틀린 판정이 된다 */
function build(
  { profile, pollutantCode, asOf }: ResolveInput,
  status: StandardStatus,
  decisive: RegulatoryRule | null,
  matched: readonly RegulatoryRule[],
  decisiveRuleId: string | null,
  trace: TraceEntry[],
): ResolvedStandard {
  const units = new Set(matched.map((rule) => rule.unit));
  const finalStatus = units.size > 1 ? 'CONFLICT' : status;
  if (units.size > 1) {
    trace.push({
      ruleId: null,
      outcome: 'CONFLICT',
      reason: `걸린 규정의 단위가 다르다(${[...units].join(' · ')}) — 값을 비교할 수 없다`,
    });
  }

  return {
    siteId: profile.siteId,
    pollutantCode,
    asOf,
    status: finalStatus,
    min: finalStatus === 'RESOLVED' || finalStatus === 'PROVISIONAL' ? (decisive?.min ?? null) : null,
    max: finalStatus === 'RESOLVED' || finalStatus === 'PROVISIONAL' ? (decisive?.max ?? null) : null,
    unit: decisive?.unit ?? null,
    matchedRuleIds: matched.map((rule) => rule.id),
    decisiveRuleId: finalStatus === 'CONFLICT' ? null : decisiveRuleId,
    effectiveFrom: finalStatus === 'CONFLICT' ? null : (decisive?.effectiveFrom ?? null),
    trace,
  };
}
