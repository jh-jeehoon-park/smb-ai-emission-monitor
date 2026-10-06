import { describe, expect, it } from 'vitest';
import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { LEGAL_CHECK_ITEMS } from '@/shared/config/discharge-limits';
import {
  REGULATORY_RULES,
  getRegulatoryProfile,
  resolveDischargeStandard,
} from '@/entities/regulation';
import { sheetsToRules } from './lib/sheets-to-rules';
import { resolveLimitTable } from './lib/resolve';
import type { LimitSheets, SiteClassification } from './lib/storage';

/**
 * **두 경로가 같은 답을 내야 소비처를 하나씩 옮길 수 있다**
 * `[사용자 요청 2026-09-28: 설정 재설계 검토]`.
 *
 * 지금 화면 여덟은 옛 경로(`resolveLimitTable` → `DischargeLimitTable`)를 쓰고, 새 「적용 기준」
 * 표 하나만 새 경로(규정 + 사실관계 → `ResolvedStandard`)를 쓴다. **둘이 갈리면 한 화면이
 * 다른 화면과 다른 진실을 말한다** — 그 상태로 소비처를 옮기면 옮길 때마다 값이 바뀐다.
 *
 * 이 파일은 그 일치를 값으로 잠근다.
 */
const SITE = 'S-02';
const NOTHING: SiteClassification = { regionGrade: null, dischargeScale: null, dailyWastewaterM3: null, dischargeRoute: null, reuse: null, reuseDailyM3: null };
const CLASSIFIED: SiteClassification = { regionGrade: '가지역', dischargeScale: '200㎥ 미만', dailyWastewaterM3: null, dischargeRoute: null, reuse: null, reuseDailyM3: null };
const ISO = '2026-09-28T00:00:00.000Z';

const sheetWith = (entries: Record<string, { min: number | null; max: number | null }>) =>
  ({ 가지역: { '200㎥ 미만': entries } }) as LimitSheets;

/** 새 경로로 그 사업장의 법정 점검 항목을 푼다 */
function viaRules(sheets: LimitSheets | null, classification: SiteClassification) {
  const rules = [...REGULATORY_RULES, ...sheetsToRules(sheets, classification, ISO)];
  const profile = getRegulatoryProfile(SITE);

  return Object.fromEntries(
    LEGAL_CHECK_ITEMS.filter((item) => item.code !== null).map((item) => [
      item.code,
      resolveDischargeStandard({
        profile,
        rules,
        pollutantCode: item.code!,
        asOf: DEMO_NOW_ISO,
      }),
    ]),
  );
}

/** 옛 경로 */
function viaTable(sheets: LimitSheets | null, classification: SiteClassification) {
  return resolveLimitTable(sheets, classification, ISO).table;
}

describe('옛 경로와 새 경로가 같은 값을 낸다', () => {
  it('설정이 없으면 pH는 법정, 나머지는 시연값이다', () => {
    const rules = viaRules(null, NOTHING);
    const table = viaTable(null, NOTHING);

    expect(rules.pH!.status).toBe('RESOLVED');
    expect([rules.pH!.min, rules.pH!.max]).toEqual([table.pH!.min, table.pH!.max]);

    for (const code of ['TOC', 'TN', 'TP'] as const) {
      expect(rules[code]!.status, code).toBe('PROVISIONAL');
      expect(rules[code]!.max, code).toBe(table[code]!.max);
      /* 옛 경로도 시연값임을 밝힌다 — 두 경로가 «법정/시연» 구분에서도 갈리지 않는다 */
      expect(table[code]!.basis, code).toBe('provisional');
    }
  });

  it('사용자가 넣은 값을 두 경로가 똑같이 받는다', () => {
    const sheets = sheetWith({ TOC: { min: null, max: 25 } });
    const rules = viaRules(sheets, CLASSIFIED);
    const table = viaTable(sheets, CLASSIFIED);

    expect(rules.TOC!.max).toBe(25);
    expect(table.TOC!.max).toBe(25);
    expect(rules.TOC!.status).toBe('RESOLVED');
    expect(table.TOC!.basis).toBe('legal');
  });

  /** pH는 정적 표에 값이 있는데도 **사용자 값이 이긴다** — 두 경로가 같은 순서를 따른다 */
  it('사용자 pH가 통상 범위를 덮는다', () => {
    const sheets = sheetWith({ pH: { min: 6.5, max: 8 } });
    const rules = viaRules(sheets, CLASSIFIED);
    const table = viaTable(sheets, CLASSIFIED);

    expect([rules.pH!.min, rules.pH!.max]).toEqual([6.5, 8]);
    expect([table.pH!.min, table.pH!.max]).toEqual([6.5, 8]);
    expect(rules.pH!.decisiveRuleId).toBe('RULE-USER-pH');
  });

  /**
   * **분류가 없으면 사용자 값을 쓰지 않는다** — 어느 시트를 볼지 정할 수 없다.
   * 옛 경로가 그렇게 동작하고(실측으로 확인했다), 새 경로도 같아야 한다.
   */
  it('분류가 없으면 입력값이 두 경로 모두에서 쓰이지 않는다', () => {
    const sheets = sheetWith({ TOC: { min: null, max: 25 } });
    const rules = viaRules(sheets, NOTHING);
    const table = viaTable(sheets, NOTHING);

    expect(rules.TOC!.max).not.toBe(25);
    expect(table.TOC!.max).not.toBe(25);
  });

  /**
   * **입력 시각을 시행일로 쓰면 값이 조용히 사라진다.** 화면은 고정된 시연 시각을 보는데
   * 입력 시각은 실제 «지금»이라, 넣은 규정이 전부 «아직 시행 전»으로 걸러진다
   * (만들면서 실제로 밟았다).
   *
   * 게다가 그 날짜는 «타이핑한 때»이지 허가조건이 효력을 갖기 시작한 때가 아니다 —
   * **모르는 것은 `null`로 둔다.** 자리표시 날짜를 박으면 화면이 그것을 실제 시행일로
   * 인쇄한다(`2000-01-01`이 전 항목에 찍히는 것을 보고 걷었다).
   */
  it('시행일을 모르면 null이고, 시연 시각보다 나중에 입력해도 규정이 걸린다', () => {
    const rules = sheetsToRules(sheetWith({ TOC: { min: null, max: 25 } }), CLASSIFIED, ISO);

    expect(rules).toHaveLength(1);
    expect(rules[0]!.effectiveFrom).toBeNull();
    /* 언제 넣었는지는 출처 문구가 갖는다 */
    expect(rules[0]!.citation).toContain('2026-09-28');

    /* 시행일을 몰라도 판정에서 빠지지 않는다 */
    const resolved = viaRules(sheetWith({ TOC: { min: null, max: 25 } }), CLASSIFIED);
    expect(resolved.TOC!.max).toBe(25);
  });
});
