import { describe, expect, it } from 'vitest';
import { resolveDischargeStandard } from './lib/resolve-standard';
import { REGULATORY_RULES, getRegulatoryProfile } from './index';
import type { RegulatoryRule, SiteRegulatoryProfile } from './model/types';

/**
 * **기준은 사람이 덮어쓰는 숫자가 아니라 규정 + 사실관계에서 «나오는» 값이다**
 * `[사용자 요청 2026-09-28: 설정 재설계 검토]`.
 *
 * 이 파일이 지키는 것 셋.
 * 1. **`Math.min`으로 충돌을 풀지 않는다** — 근거 없는 「항상 더 엄격한 값」 일반화 금지
 * 2. **모르는 사실을 «해당 없음»으로 떨어뜨리지 않는다** — `UNRESOLVED ≠ NOT_APPLICABLE`
 * 3. **시연값으로 법정 판정을 하지 않는다**
 */
const ASOF = '2026-09-28T00:00:00.000Z';

const profile = (over: Partial<SiteRegulatoryProfile> = {}): SiteRegulatoryProfile => ({
  siteId: 'S-TEST',
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
  ...over,
});

const rule = (over: Partial<RegulatoryRule> & Pick<RegulatoryRule, 'id'>): RegulatoryRule => ({
  pollutantCode: 'TOC',
  source: 'NATIONAL',
  effect: 'BASE',
  comparator: 'MAX',
  min: null,
  max: 40,
  unit: 'mg/L',
  scope: {},
  effectiveFrom: '2000-01-01T00:00:00.000Z',
  effectiveTo: null,
  citation: '검사용',
  ...over,
});

const run = (rules: RegulatoryRule[], p = profile(), code: 'TOC' | 'pH' = 'TOC') =>
  resolveDischargeStandard({ profile: p, rules, pollutantCode: code, asOf: ASOF });

/** 같은 지역·같은 배출량이라도 **방류 경로가 다르면 다른 규정**이 걸린다 */
describe('방류 경로가 답을 가른다', () => {
  const rules = [
    rule({ id: 'R-직접', max: 30, scope: { dischargeRoutes: ['PUBLIC_WATER'] } }),
    rule({ id: 'R-하수', max: 120, scope: { dischargeRoutes: ['SEWAGE_TREATMENT'] } }),
  ];
  const base = { regionGrade: '가지역' as const, dailyWastewaterM3: 150 };

  it('직접방류는 배출허용기준을 받는다', () => {
    const r = run(rules, profile({ ...base, dischargeRoute: 'PUBLIC_WATER' }));

    expect(r.status).toBe('RESOLVED');
    expect(r.max).toBe(30);
    expect(r.decisiveRuleId).toBe('R-직접');
  });

  it('공공하수처리시설 유입은 다른 기준을 받는다 — 적용되는 법이 다르다', () => {
    const r = run(rules, profile({ ...base, dischargeRoute: 'SEWAGE_TREATMENT' }));

    expect(r.max).toBe(120);
    expect(r.decisiveRuleId).toBe('R-하수');
  });

  /** 경로를 모르면 **둘 중 어느 것도 고를 수 없다** — 하나를 골라 두면 그게 틀린 판정이다 */
  it('경로가 미확정이면 UNRESOLVED다', () => {
    const r = run(rules, profile(base));

    expect(r.status).toBe('UNRESOLVED');
    expect(r.max).toBeNull();
    expect(r.trace.flatMap((t) => t.missing ?? [])).toContain('방류·처리 경로');
  });
});

/** 국가 BASE 위에 조례 강화기준이 얹힌다 — **규정이 스스로 «조인다»고 선언한 것만** */
describe('효력이 순서를 정한다', () => {
  it('강화기준이 국가 기준을 이긴다', () => {
    const r = run([
      rule({ id: 'R-국가', source: 'NATIONAL', effect: 'BASE', max: 40 }),
      rule({ id: 'R-조례', source: 'LOCAL_ORDINANCE', effect: 'TIGHTEN', max: 25 }),
    ]);

    expect(r.max).toBe(25);
    expect(r.decisiveRuleId).toBe('R-조례');
    expect(r.trace.some((t) => t.ruleId === 'R-국가' && t.outcome === 'SUPERSEDED')).toBe(true);
  });

  /** 별도기준이 **대체**한다 — 더 느슨해도 대체다. 숫자로 고르지 않는다 */
  it('REPLACE는 값이 더 느슨해도 이긴다 — Math.min이 아니다', () => {
    const r = run([
      rule({ id: 'R-국가', effect: 'BASE', max: 40 }),
      rule({ id: 'R-별도', source: 'SEPARATE_STANDARD', effect: 'REPLACE', max: 90 }),
    ]);

    expect(r.max).toBe(90);
    expect(r.decisiveRuleId).toBe('R-별도');
  });

  /** **적용 제외는 «모른다»가 아니다** */
  it('EXEMPT는 NOT_APPLICABLE이고 UNRESOLVED와 다르다', () => {
    const r = run([
      rule({ id: 'R-국가', effect: 'BASE', max: 40 }),
      rule({ id: 'R-제외', effect: 'EXEMPT', min: null, max: null }),
    ]);

    expect(r.status).toBe('NOT_APPLICABLE');
    expect(r.status).not.toBe('UNRESOLVED');
    expect(r.decisiveRuleId).toBe('R-제외');
  });
});

/** 풀 수 없는 충돌은 **한쪽을 고르지 않는다** */
describe('충돌', () => {
  it('같은 효력에 다른 값이면 CONFLICT다', () => {
    const r = run([
      rule({ id: 'R-조례A', source: 'LOCAL_ORDINANCE', effect: 'TIGHTEN', max: 25 }),
      rule({ id: 'R-조례B', source: 'LOCAL_ORDINANCE', effect: 'TIGHTEN', max: 20 }),
    ]);

    expect(r.status).toBe('CONFLICT');
    expect(r.decisiveRuleId).toBeNull();
    /* 「더 엄격한 20을 쓴다」로 떨어뜨리지 않는다 — 그 우선순위에 근거가 없다 */
    expect(r.max).toBeNull();
  });

  it('값이 같으면 둘이어도 충돌이 아니다', () => {
    const r = run([
      rule({ id: 'R-A', effect: 'BASE', max: 40 }),
      rule({ id: 'R-B', effect: 'BASE', max: 40 }),
    ]);

    expect(r.status).toBe('RESOLVED');
    expect(r.max).toBe(40);
  });

  it('단위가 어긋나면 비교할 수 없다', () => {
    const r = run([
      rule({ id: 'R-A', effect: 'BASE', max: 40, unit: 'mg/L' }),
      rule({ id: 'R-B', effect: 'REPLACE', max: 40, unit: 'ppm' }),
    ]);

    expect(r.status).toBe('CONFLICT');
  });
});

/** pH는 범위형이다 — 상한만 있는 항목과 다루는 방법이 다르다 */
describe('범위형 기준', () => {
  it('하한과 상한을 함께 낸다', () => {
    const r = run(REGULATORY_RULES as RegulatoryRule[], profile(), 'pH');

    expect(r.status).toBe('RESOLVED');
    expect(r.min).toBe(5.8);
    expect(r.max).toBe(8.6);
  });
});

/** 시행일 전후로 다른 규정이 걸린다 */
describe('시행일', () => {
  const rules = [
    rule({
      id: 'R-구',
      max: 60,
      effectiveFrom: '2000-01-01T00:00:00.000Z',
      effectiveTo: '2026-01-01T00:00:00.000Z',
    }),
    rule({ id: 'R-신', max: 40, effectiveFrom: '2026-01-01T00:00:00.000Z' }),
  ];

  it('지금은 새 규정이다', () => {
    const r = resolveDischargeStandard({
      profile: profile(),
      rules,
      pollutantCode: 'TOC',
      asOf: ASOF,
    });

    expect(r.max).toBe(40);
  });

  /** **과거 판정이 소급해 바뀌면 안 된다** — 그 시점에 유효했던 규정으로 본다 */
  it('작년 측정은 옛 규정으로 판정한다', () => {
    const r = resolveDischargeStandard({
      profile: profile(),
      rules,
      pollutantCode: 'TOC',
      asOf: '2025-06-01T00:00:00.000Z',
    });

    expect(r.max).toBe(60);
    expect(r.decisiveRuleId).toBe('R-구');
  });
});

/** **시연값만 있으면 법정 판정을 하지 않는다** */
describe('시연값', () => {
  it('법정 규정이 없으면 PROVISIONAL이다', () => {
    const r = run(REGULATORY_RULES as RegulatoryRule[]);

    expect(r.status).toBe('PROVISIONAL');
    expect(r.status).not.toBe('RESOLVED');
    expect(r.max).toBe(40);
    /* 보증은 상태가 진다 — 문구는 규정의 근거 문구 그대로다(같은 말이 두 번 찍히던 것을 걷었다) */
    expect(r.decisiveRuleId).toMatch(/^RULE-DEMO-/);
    expect(r.trace.at(-1)?.reason).toContain('법정 기준 아님');
  });

  it('법정 규정이 답을 주면 시연값은 쓰이지 않는다', () => {
    const r = run([...(REGULATORY_RULES as RegulatoryRule[]), rule({ id: 'R-법정', max: 12 })]);

    expect(r.status).toBe('RESOLVED');
    expect(r.max).toBe(12);
  });
});

/** 사업장 정보가 모자라면 **확정하지 않는다** */
describe('사실관계가 비면', () => {
  it('걸릴 수 있는 규정이 남아 있으면 확정하지 않는다', () => {
    const r = run([
      rule({ id: 'R-무관', effect: 'BASE', max: 40 }),
      rule({ id: 'R-특별', effect: 'TIGHTEN', max: 10, scope: { specialAreaCodes: ['SA-01'] } }),
    ]);

    expect(r.status).toBe('UNRESOLVED');
    expect(r.trace.flatMap((t) => t.missing ?? [])).toContain('특별지역 지정');
  });

  it('규정이 아예 없으면 NOT_APPLICABLE이 아니라 UNRESOLVED다', () => {
    const r = run([]);

    expect(r.status).toBe('UNRESOLVED');
    expect(r.status).not.toBe('NOT_APPLICABLE');
  });
});

/** 어느 규정이 왜 쓰였는지 되짚을 수 있어야 한다 */
describe('역추적', () => {
  it('걸린 규정·결정 규정·빠진 이유가 모두 남는다', () => {
    const r = run(
      [
        rule({ id: 'R-기간밖', max: 99, effectiveTo: '2020-01-01T00:00:00.000Z' }),
        rule({ id: 'R-범위밖', max: 99, scope: { regionGrades: ['청정지역'] } }),
        rule({ id: 'R-채택', max: 40 }),
      ],
      profile({ regionGrade: '가지역' }),
    );

    const by = (id: string) => r.trace.find((t) => t.ruleId === id)?.outcome;

    expect(by('R-기간밖')).toBe('OUT_OF_PERIOD');
    expect(by('R-범위밖')).toBe('OUT_OF_SCOPE');
    expect(r.decisiveRuleId).toBe('R-채택');
    expect(r.matchedRuleIds).toEqual(['R-채택']);
  });
});

/** 사업장마다 자기 사실관계로 푼다 — 한 사업장의 답이 다른 사업장에 번지지 않는다 */
describe('사업장이 섞이지 않는다', () => {
  it('프로필이 다르면 답이 다르다', () => {
    const rules = [
      rule({ id: 'R-청정', max: 10, scope: { regionGrades: ['청정지역'] } }),
      rule({ id: 'R-가', max: 40, scope: { regionGrades: ['가지역'] } }),
    ];

    expect(run(rules, profile({ regionGrade: '청정지역' })).max).toBe(10);
    expect(run(rules, profile({ regionGrade: '가지역' })).max).toBe(40);
  });

  it('없는 사업장을 물어도 판정에서 빠지지 않는다', () => {
    const r = run(REGULATORY_RULES as RegulatoryRule[], getRegulatoryProfile('없는-사업장'));

    expect(r.siteId).toBe('없는-사업장');
    expect(r.status).toBe('PROVISIONAL');
  });
});
