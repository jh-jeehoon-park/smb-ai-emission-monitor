import { describe, expect, it } from 'vitest';
import {
  DISCHARGE_LIMITS,
  checkLimit,
  formatLimitRange,
  hasAnyLimit,
  hasLimit,
  isOverLimit,
  type DischargeLimit,
  type DischargeLimitTable,
} from './discharge-limits';

describe('기준값 보유 여부', () => {
  /** `[공정자료 p.11]`이 "통상 5.8~8.6"을 준 유일한 항목이다 */
  it('pH만 판정할 수 있다', () => {
    expect(hasLimit('pH')).toBe(true);
  });

  /**
   * 원문이 "규모·지역별 별도 기준표가 있으며"라고만 적었다. 값을 지어내면
   * 없는 초과 판정을 만든다 — 선을 긋지 않는 것이 옳다.
   */
  /**
   * **문구가 근거 태그를 달던 자리다** `[사용자 요청 2026-09-15: 화면 설명문 일괄 제거]`.
   * `[TBD-45]`는 문서 규약이라 화면에서 걷었다 — 대신 **왜 판정하지 않는지**를 단정한다.
   * 사유가 비면 화면이 «기준 안»이라 읽히므로 이 단정은 남는다(**E4**).
   */
  it('TOC는 기준표가 없어 판정하지 않는다', () => {
    expect(hasLimit('TOC')).toBe(false);
    expect(DISCHARGE_LIMITS.TOC?.unavailableReason).toContain('기준표');
    expect(DISCHARGE_LIMITS.TOC?.unavailableReason).not.toContain('TBD-');
  });

  it('계측하지 않는 항목은 아예 등록되지 않는다 — BOD·SS·COD', () => {
    for (const code of ['EC', 'DO', 'turbidity'] as const) {
      expect(hasLimit(code)).toBe(false);
    }
  });

  /**
   * **출처는 남고 근거 태그만 걷혔다** `[사용자 요청 2026-09-15]`. `[공정자료 p.11]`은
   * 문서 규약이라 화면에서 뺐지만, **이 값이 확정 기준이 아니라는 사실**은 남아야 한다 —
   * 법정 판정값을 우리가 정하지 않는다는 규약이다(`README` §3.1).
   */
  it('기준이 있는 항목의 출처가 «확정 기준이 아님»을 말한다', () => {
    expect(DISCHARGE_LIMITS.pH?.source).toContain('통상');
    expect(DISCHARGE_LIMITS.pH?.source).toContain('허가증');
    expect(DISCHARGE_LIMITS.pH?.source).not.toContain('공정자료');
  });
});

describe('isOverLimit — 경계값은 초과가 아니다', () => {
  it('범위 안은 false', () => {
    expect(isOverLimit('pH', 7.0)).toBe(false);
  });

  it('하한·상한 그 값은 허용 범위다', () => {
    expect(isOverLimit('pH', 5.8)).toBe(false);
    expect(isOverLimit('pH', 8.6)).toBe(false);
  });

  it('벗어나면 true', () => {
    expect(isOverLimit('pH', 5.79)).toBe(true);
    expect(isOverLimit('pH', 8.61)).toBe(true);
  });
});

describe('isOverLimit — 모를 때 판정하지 않는다(E4)', () => {
  /** false를 주면 "기준 안에 있다"는 사실 주장이 된다 */
  it('결측이면 null이다', () => {
    expect(isOverLimit('pH', null)).toBeNull();
  });

  it('기준표가 없는 항목이면 null이다 — false가 아니다', () => {
    expect(isOverLimit('TOC', 999)).toBeNull();
    expect(isOverLimit('EC', 5000)).toBeNull();
  });
});

/**
 * **상한만 있는 기준을 다뤄야 한다.** `LIMIT_INPUT_KIND`가 TOC·TN·TP를 `'max'`로 규정하고
 * 설정 화면이 상한 한 칸만 받는데, 표기하는 쪽이 `min`과 `max`를 둘 다 요구해서 사용자가
 * 값을 넣어도 세 화면이 계속 `미확정`으로 적었다.
 */
describe('기준 표기', () => {
  it('양방향 기준은 범위로 적는다', () => {
    expect(formatLimitRange(DISCHARGE_LIMITS.pH, 2)).toBe('5.80–8.60');
  });

  it('상한만 있으면 부등호로 적는다', () => {
    const limit = { min: null, max: 40, source: '테스트', unavailableReason: null, basis: 'legal' as const };
    expect(formatLimitRange(limit, 1)).toBe('≤ 40.0');
  });

  it('하한만 있어도 적는다', () => {
    const limit = { min: 2, max: null, source: '테스트', unavailableReason: null, basis: 'legal' as const };
    expect(formatLimitRange(limit, 1)).toBe('≥ 2.0');
  });

  it('기준을 모르면 null이다 — 소비처가 미확정 문구를 적는다', () => {
    expect(formatLimitRange(DISCHARGE_LIMITS.TOC, 1)).toBeNull();
    expect(formatLimitRange(undefined, 1)).toBeNull();
  });
});

/**
 * **시연 임계값은 법정 판정을 하지 않는다** `[사용자 요청 2026-09-28: 설정 재설계 검토]`.
 *
 * 한때 `basis` 축이 없어 «값이 있다»가 곧 «판정할 수 있다»였다. 시연 임계값
 * (`PROVISIONAL_DEMO_LIMITS`)이 `unavailableReason: null`로 표에 얹히면서 법정 판정
 * 자격을 함께 얻었고, 화면이 출처에 `법정 기준 아님`이라 적으면서 판정 칸에는
 * 「기준보다 높음」, 근거 칸에는 「사업장이 설정한 기준치로 판정」을 찍었다(실측).
 */
describe('법정과 시연을 가른다', () => {
  const demo: DischargeLimit = {
    min: null,
    max: 40,
    source: '[시연 기본값] 법정 기준 아님',
    unavailableReason: null,
    basis: 'provisional',
  };
  const table: DischargeLimitTable = { TOC: demo, pH: DISCHARGE_LIMITS.pH };

  it('시연값으로는 법정 초과를 말하지 않는다', () => {
    expect(hasLimit('TOC', table)).toBe(false);
    expect(isOverLimit('TOC', 41, table)).toBeNull();
    /* 「기준 안」도 말하지 않는다 — 그쪽이 더 위험한 거짓말이다 */
    expect(isOverLimit('TOC', 1, table)).toBeNull();
  });

  it('그릴 선은 있다 — 차트는 구간을 그린다', () => {
    expect(hasAnyLimit('TOC', table)).toBe(true);
  });

  it('시연 축에서는 넘었는지 말할 수 있다', () => {
    expect(checkLimit('TOC', 41, table)).toEqual({ over: true, basis: 'provisional' });
    expect(checkLimit('TOC', 40, table)).toEqual({ over: false, basis: 'provisional' });
  });

  it('법정값은 그대로 법정으로 판정한다', () => {
    expect(checkLimit('pH', 8.61, table)).toEqual({ over: true, basis: 'legal' });
    expect(isOverLimit('pH', 8.61, table)).toBe(true);
  });

  /** 값이 없는 것과 기준이 없는 것은 **둘 다** 판정 불가이되 `basis`로 가려지지 않는다 */
  it('판정하지 못하면 basis가 none이다', () => {
    expect(checkLimit('TOC', null, table)).toEqual({ over: null, basis: 'none' });
    expect(checkLimit('TN', 10, table)).toEqual({ over: null, basis: 'none' });
  });
});
