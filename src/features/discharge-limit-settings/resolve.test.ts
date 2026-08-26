import { describe, expect, it } from 'vitest';
import { DISCHARGE_LIMITS, hasLimit, isOverLimit } from '@/shared/config/discharge-limits';
import { UNRESOLVED_REASONS } from './config/constants';
import { resolveLimitTable } from './lib/resolve';
import { parseSheets, validEntry, type LimitSheets } from './lib/storage';

const NOTHING = { regionGrade: null, dischargeScale: null };
const CLASSIFIED = { regionGrade: '가지역' as const, dischargeScale: '200㎥ 미만' as const };
const ISO = '2026-08-20T09:00:00.000Z';

const sheetWith = (entries: Record<string, { min: number | null; max: number | null }>) =>
  ({ 가지역: { '200㎥ 미만': entries } }) as LimitSheets;

describe('사업장 분류가 없으면', () => {
  /**
   * **시연 기본값이 얹힌다** `[사용자 결정 2026-08-25]` `[PROVISIONAL]`. 법정 표
   * (`DISCHARGE_LIMITS`)는 그대로 두고 *"사용자가 이미 넣어 둔 상태"* 를 만든다 —
   * 그래야 기준 대비 판정이 시연에서 동작한다.
   */
  it('시연 기본값을 얹되 무엇을 해야 하는지 적는다', () => {
    const { table, unresolvedReason, isUserSet } = resolveLimitTable(null, NOTHING, null);
    expect(table).not.toBe(DISCHARGE_LIMITS);
    expect(hasLimit('TOC', table)).toBe(true);
    expect(unresolvedReason).toBe(UNRESOLVED_REASONS.noClassification);
    expect(isUserSet).toBe(false);
  });

  /**
   * **이것이 이 기능의 안전장치다.** 시연값을 법정 판정으로 읽으면 안 된다 — 화면이
   * `출처` 열에 이 문자열을 그대로 보여 주므로 값과 함께 읽힌다.
   */
  it('시연 기본값은 출처에 법정 기준이 아님을 적는다', () => {
    const { table } = resolveLimitTable(null, NOTHING, null);
    ['TOC', 'TN', 'TP'].forEach((code) => {
      const source = table[code as 'TOC']!.source;
      expect(source, code).toContain('시연 기본값');
      expect(source, code).toContain('법정 기준 아님');
    });
  });

  /** pH는 손대지 않는다 — 통상 범위가 `[공정자료 p.11]`에 실제로 있다 */
  it('pH는 공정자료 값 그대로다', () => {
    const { table } = resolveLimitTable(null, NOTHING, null);
    expect(table.pH).toEqual(DISCHARGE_LIMITS.pH);
  });

  /** 두 축 중 하나만 있어도 시트를 고를 수 없다 */
  it('한 축만 있어도 고르지 못한다', () => {
    const half = { regionGrade: '가지역' as const, dischargeScale: null };
    expect(resolveLimitTable(null, half, null).unresolvedReason).toBe(
      UNRESOLVED_REASONS.noClassification,
    );
  });
});

describe('분류는 됐지만 기준치가 없으면', () => {
  it('시트가 없다는 사실을 분류 미설정과 다르게 적는다', () => {
    const { unresolvedReason } = resolveLimitTable(null, CLASSIFIED, null);
    expect(unresolvedReason).toBe(UNRESOLVED_REASONS.noSheet);
  });

  it('빈 시트도 없는 것과 같다', () => {
    const { unresolvedReason } = resolveLimitTable(sheetWith({}), CLASSIFIED, null);
    expect(unresolvedReason).toBe(UNRESOLVED_REASONS.noSheet);
  });
});

describe('사용자 값이 정적 표를 덮는다', () => {
  const sheets = sheetWith({ TOC: { min: null, max: 40 } });

  it('입력한 항목은 판정할 수 있게 된다', () => {
    const { table, isUserSet } = resolveLimitTable(sheets, CLASSIFIED, ISO);
    expect(hasLimit('TOC', table)).toBe(true);
    expect(isOverLimit('TOC', 41, table)).toBe(true);
    expect(isOverLimit('TOC', 40, table)).toBe(false);
    expect(isUserSet).toBe(true);
  });

  /** 출처가 화면에 그대로 뜬다 — 우리가 정한 값이 아니라 사용자가 넣은 값임을 밝힌다 */
  it('출처에 사용자 설정이라고 적힌다', () => {
    const { table } = resolveLimitTable(sheets, CLASSIFIED, ISO);
    expect(table.TOC!.source).toContain('사용자 설정');
    expect(table.TOC!.source).toContain('2026-08-20');
  });

  /**
   * **항목 단위로 떨어진다.** 통째로 갈아치우면 TOC만 넣은 순간 pH의 통상 범위가 사라진다.
   */
  it('입력하지 않은 항목은 시연 기본값이 남는다', () => {
    const { table } = resolveLimitTable(sheets, CLASSIFIED, ISO);
    expect(table.pH).toEqual(DISCHARGE_LIMITS.pH);
    expect(table.TN!.source).toContain('시연 기본값');
  });

  /**
   * **사용자 값과 시연값이 섞이는 것이 정상이다.** 항목 단위로 떨어지므로 사용자가 TOC만
   * 넣으면 TN·TP는 시연값이 남는다 — 출처가 둘을 갈라 준다.
   */
  it('사용자가 넣은 항목만 출처가 사용자 설정이다', () => {
    const { table } = resolveLimitTable(sheets, CLASSIFIED, ISO);
    expect(table.TOC!.source).toContain('사용자 설정');
    expect(table.TN!.source).not.toContain('사용자 설정');
  });

  it('네 항목을 다 넣으면 미확정 사유가 사라진다', () => {
    const full = sheetWith({
      TOC: { min: null, max: 40 },
      TN: { min: null, max: 60 },
      TP: { min: null, max: 8 },
      pH: { min: 6, max: 8.5 },
    });
    expect(resolveLimitTable(full, CLASSIFIED, ISO).unresolvedReason).toBeNull();
  });

  /**
   * pH는 정적 표에 값이 있는데도 사용자 값이 이긴다 — `[공정자료 p.11]`이 "정확한 적용
   * 구간은 허가증에서 확인"이라 했고 그 허가증은 사용자 손에 있다.
   */
  it('pH도 사용자 값이 통상 범위를 덮는다', () => {
    const { table } = resolveLimitTable(sheetWith({ pH: { min: 6, max: 8 } }), CLASSIFIED, ISO);
    expect(table.pH!.min).toBe(6);
    expect(isOverLimit('pH', 8.4, table)).toBe(true);
    /* 정적 표(5.8~8.6)로는 초과가 아니었다 — 덮어쓰기가 실제로 판정을 바꾼다 */
    expect(isOverLimit('pH', 8.4)).toBe(false);
  });
});

describe('입력 검증 — 구조만 본다', () => {
  it('뒤집힌 범위를 막는다', () => {
    expect(validEntry('pH', { min: 9, max: 5 })).toBe(false);
    expect(validEntry('pH', { min: 5.8, max: 8.6 })).toBe(true);
  });

  /** 센서 측정 범위 밖의 기준은 초과가 영원히 안 뜨거나 늘 뜬다 */
  it('센서 측정 범위 밖의 값을 막는다', () => {
    expect(validEntry('pH', { min: 5, max: 20 })).toBe(false);
    expect(validEntry('TOC', { min: null, max: 900 })).toBe(false);
  });

  it('상한형 항목에 하한을 넣지 못한다', () => {
    expect(validEntry('TOC', { min: 1, max: 40 })).toBe(false);
    expect(validEntry('TOC', { min: null, max: 40 })).toBe(true);
  });

  it('범위형 항목은 둘 다 있어야 한다', () => {
    expect(validEntry('pH', { min: null, max: 8.6 })).toBe(false);
  });

  it('법정 점검 항목이 아닌 것은 받지 않는다', () => {
    expect(validEntry('DO', { min: null, max: 5 })).toBe(false);
  });
});

describe('저장값 걸러 내기 — 모르는 키는 버린다', () => {
  it('없는 지역·규모·항목을 버린다', () => {
    const parsed = parseSheets({
      없는지역: { '200㎥ 미만': { TOC: { min: null, max: 40 } } },
      가지역: {
        없는규모: { TOC: { min: null, max: 40 } },
        '200㎥ 미만': { 없는항목: { min: null, max: 1 }, TOC: { min: null, max: 40 } },
      },
    });
    expect(parsed).toEqual({ 가지역: { '200㎥ 미만': { TOC: { min: null, max: 40 } } } });
  });

  /** 통과한 값이 하나도 없으면 빈 껍데기도 만들지 않는다 — 시트가 있는 것처럼 보이면 안 된다 */
  it('검증을 통과하지 못한 값을 버린다', () => {
    const parsed = parseSheets({ 가지역: { '200㎥ 미만': { pH: { min: 9, max: 5 } } } });
    expect(parsed).toEqual({});
  });

  /**
   * **빈 값은 미설정이며 0이 아니다.** 그리고 **값이 하나도 없는 기준은 저장하지 않는다** —
   * 저장하면 판정 가능으로 표시되고 `isOverLimit`이 경계 없이 모든 값에 `false`를 돌려준다.
   */
  it('숫자가 아닌 값은 버린다 — 값 없는 기준을 만들지 않는다', () => {
    expect(parseSheets({ 가지역: { '200㎥ 미만': { TOC: { min: null, max: '40' } } } })).toEqual({});
    expect(validEntry('TOC', { min: null, max: null })).toBe(false);
  });

  it('객체가 아니면 null이다', () => {
    expect(parseSheets('문자열')).toBeNull();
    expect(parseSheets(null)).toBeNull();
  });
});
