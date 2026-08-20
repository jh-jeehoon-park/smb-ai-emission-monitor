import { describe, expect, it } from 'vitest';
import { MEASUREMENT_ITEMS, WATER_QUALITY_CODES } from '@/shared/config/measurement';
import { formatKstDateTime, formatKstWallClock, formatValue, formatWithUnit } from './format';

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

describe('formatKstDateTime — 헤더 시계(E5)', () => {
  it('UTC를 KST(+9)로 옮긴다', () => {
    expect(formatKstDateTime(new Date('2026-08-18T05:04:22Z'))).toBe('2026-08-18 14:04:22');
  });

  it('자정을 24시가 아니라 00시로 쓴다', () => {
    expect(formatKstDateTime(new Date('2026-08-17T15:00:00Z'))).toBe('2026-08-18 00:00:00');
  });

  it('날짜 경계에서 날짜도 함께 넘어간다', () => {
    expect(formatKstDateTime(new Date('2026-08-17T14:59:59Z'))).toBe('2026-08-17 23:59:59');
  });

  it('브라우저 시간대와 무관하게 KST를 쓴다 — 입력 오프셋이 달라도 결과가 같다', () => {
    const utc = formatKstDateTime(new Date('2026-08-18T05:04:22Z'));
    const newYork = formatKstDateTime(new Date('2026-08-18T01:04:22-04:00'));
    expect(newYork).toBe(utc);
  });
});

/**
 * 헤더의 현재 시각 표기. `formatKstDateTime`과 **쓰임이 다르다** — 그쪽은 데이터의 시각을
 * 적는 자리라 연·초까지 남기고, 이쪽은 *지금이 언제인지*만 말한다 `[사용자 요청 2026-08-20]`.
 */
describe('formatKstWallClock — 헤더 현재 시각', () => {
  it('월·일·요일·오전오후·시각을 요청한 형식으로 적는다', () => {
    expect(formatKstWallClock(new Date('2026-08-20T01:17:56Z'))).toBe(
      '8월 20일 (목) 오전 10:17:56',
    );
  });

  /** `h12`는 자정을 `0시`로 준다. 시계에 `오전 0:00`이 뜨면 잘못 읽힌다 */
  it('자정을 0시가 아니라 12시로 쓴다', () => {
    expect(formatKstWallClock(new Date('2026-08-19T15:00:00Z'))).toBe(
      '8월 20일 (목) 오전 12:00:00',
    );
  });

  it('정오는 오후 12시다', () => {
    expect(formatKstWallClock(new Date('2026-08-20T03:00:00Z'))).toBe(
      '8월 20일 (목) 오후 12:00:00',
    );
  });

  it('오전과 오후가 11:59에서 갈린다', () => {
    expect(formatKstWallClock(new Date('2026-08-20T02:59:59Z'))).toBe(
      '8월 20일 (목) 오전 11:59:59',
    );
    expect(formatKstWallClock(new Date('2026-08-20T03:00:01Z'))).toBe(
      '8월 20일 (목) 오후 12:00:01',
    );
  });

  it('날짜 경계에서 날짜와 요일이 함께 넘어간다', () => {
    expect(formatKstWallClock(new Date('2026-08-20T15:00:00Z'))).toBe(
      '8월 21일 (금) 오전 12:00:00',
    );
  });

  it('브라우저 시간대와 무관하게 KST를 쓴다 — 입력 오프셋이 달라도 결과가 같다', () => {
    const utc = formatKstWallClock(new Date('2026-08-20T01:17:56Z'));
    const newYork = formatKstWallClock(new Date('2026-08-19T21:17:56-04:00'));
    expect(newYork).toBe(utc);
  });

  /** 연도는 적지 않고 초는 적는다 — 시계가 살아 있다는 것을 초가 보여 준다 */
  it('연도는 적지 않고 초는 적는다', () => {
    const out = formatKstWallClock(new Date('2026-08-20T01:17:33Z'));
    expect(out).not.toContain('2026');
    expect(out).toMatch(/:33$/);
  });

  /** 한 자리 초를 `:7`로 적으면 자리가 흔들려 옆 요소가 밀린다 */
  it('초를 두 자리로 채운다', () => {
    expect(formatKstWallClock(new Date('2026-08-20T01:17:07Z'))).toMatch(/:07$/);
  });
});
