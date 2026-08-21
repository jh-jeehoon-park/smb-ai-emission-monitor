import { describe, expect, it } from 'vitest';
import {
  DISCHARGE_LIMITS,
  formatLimitRange,
  hasLimit,
  isOverLimit,
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
  it('TOC는 기준표가 없어 판정하지 않는다', () => {
    expect(hasLimit('TOC')).toBe(false);
    expect(DISCHARGE_LIMITS.TOC?.unavailableReason).toContain('TBD-45');
  });

  it('계측하지 않는 항목은 아예 등록되지 않는다 — BOD·SS·COD', () => {
    for (const code of ['EC', 'DO', 'turbidity'] as const) {
      expect(hasLimit(code)).toBe(false);
    }
  });

  it('기준이 있는 항목에는 근거 표기가 붙는다', () => {
    expect(DISCHARGE_LIMITS.pH?.source).toContain('공정자료 p.11');
    /* "통상"이므로 확정 기준처럼 보이면 안 된다 */
    expect(DISCHARGE_LIMITS.pH?.source).toContain('허가증');
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
    const limit = { min: null, max: 40, source: '테스트', unavailableReason: null };
    expect(formatLimitRange(limit, 1)).toBe('≤ 40.0');
  });

  it('하한만 있어도 적는다', () => {
    const limit = { min: 2, max: null, source: '테스트', unavailableReason: null };
    expect(formatLimitRange(limit, 1)).toBe('≥ 2.0');
  });

  it('기준을 모르면 null이다 — 소비처가 미확정 문구를 적는다', () => {
    expect(formatLimitRange(DISCHARGE_LIMITS.TOC, 1)).toBeNull();
    expect(formatLimitRange(undefined, 1)).toBeNull();
  });
});
