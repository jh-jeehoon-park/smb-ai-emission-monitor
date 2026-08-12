import { describe, expect, it } from 'vitest';
import { MEASUREMENT_ITEMS, WATER_QUALITY_CODES } from '@/shared/config/measurement';
import { formatValue, formatWithUnit } from './format';

describe('formatValue — 결측 처리(E4)', () => {
  it('결측은 0이 아니라 —로 표시한다', () => {
    expect(formatValue('pH', null)).toBe('—');
    expect(formatValue('TOC', null)).toBe('—');
  });

  it('0은 결측이 아니다 — 실제 0을 —로 지우면 안 된다', () => {
    expect(formatValue('TOC', 0)).toBe('0.0');
  });

  it('NaN도 결측으로 다룬다', () => {
    expect(formatValue('pH', Number.NaN)).toBe('—');
  });
});

describe('formatValue — 항목별 자릿수 고정(E1)', () => {
  it.each([
    ['pH' as const, 7.1234, '7.12'],
    ['EC' as const, 1840.6, '1841'],
    ['DO' as const, 5.4, '5.40'],
    ['TOC' as const, 26.55, '26.6'],
    ['flow' as const, 412.7, '413'],
  ])('%s는 정해진 자릿수로만 표시한다', (code, input, expected) => {
    expect(formatValue(code, input)).toBe(expected);
  });

  it('수질 8항목 모두 자릿수가 정의되어 있다 — 화면마다 다르게 반올림하지 않는다', () => {
    for (const code of WATER_QUALITY_CODES) {
      expect(MEASUREMENT_ITEMS[code].decimals).toBeTypeOf('number');
      expect(formatValue(code, 1.23456)).toBe((1.23456).toFixed(MEASUREMENT_ITEMS[code].decimals));
    }
  });
});

describe('formatWithUnit', () => {
  it('단위를 붙인다', () => {
    expect(formatWithUnit('DO', 5.4)).toBe('5.40 mg/L');
  });

  it('단위가 없는 항목(pH)은 값만 준다', () => {
    expect(formatWithUnit('pH', 7.1)).toBe('7.10');
  });

  it('결측이면 단위를 붙이지 않는다', () => {
    expect(formatWithUnit('DO', null)).toBe('—');
  });
});
