import { describe, expect, it } from 'vitest';
import {
  EQUIPMENT_CODES,
  MEASUREMENT_ITEMS,
  WATER_QUALITY_CODES,
  type MeasurementItem,
} from './measurement';

const items = Object.values(MEASUREMENT_ITEMS) as MeasurementItem[];

/**
 * **타입은 필드가 있는지만 강제한다.** `Record<MeasurementItemCode, MeasurementItem>`이
 * 항목 하나를 빠뜨리는 것은 막지만 `unitKo: ''`로 채우는 것은 통과시킨다 — 새 항목을
 * 넣을 때 그 칸을 비워 두면 리포트·시계열의 단위 열과 그리드 툴팁이 조용히 빈 칸이 된다
 * `[회의 피드백 2026-08-24: 단위들도 다 한글까지 병기]`.
 */
describe('단위 한글 병기 — 항목마다 있다', () => {
  it.each(items.map((i) => [i.code, i] as const))('%s에 한글 단위가 있다', (_code, item) => {
    expect(item.unitKo.trim()).not.toBe('');
  });

  /**
   * 병기는 **기호를 대체하지 않고 덧붙이는 것**이다(`measurement.ts` 필드 주석).
   * 기호를 그대로 복사해 두면 화면에 `mg/L mg/L`이 찍힌다.
   */
  it('기호를 그대로 베끼지 않는다', () => {
    items.forEach((item) => {
      expect(item.unitKo).not.toBe(item.unit);
    });
  });

  /**
   * 단위가 없는 항목(pH·진동)은 **그 사실을 적는다.** 빈 칸으로 두면 값을 못 받은 것으로
   * 읽히고, 툴팁이 `단위 없음` 뒤에 아무 말도 없이 끝난다.
   */
  it('단위가 없는 항목도 무엇인지 말한다', () => {
    const unitless = items.filter((i) => i.unit === '');
    expect(unitless.map((i) => i.code)).toEqual(['pH', 'vibration']);
    unitless.forEach((item) => {
      expect(item.unitKo).toContain('무차원');
    });
  });

  /** 같은 단위 기호는 같은 한글로 풀린다 — 화면마다 다르게 풀리면 병기가 소음이 된다 */
  it('같은 단위 기호는 한 가지로만 풀린다', () => {
    const byUnit = new Map<string, Set<string>>();
    items.forEach((item) => {
      if (!item.unit) return;
      const set = byUnit.get(item.unit) ?? new Set<string>();
      set.add(item.unitKo);
      byUnit.set(item.unit, set);
    });
    byUnit.forEach((glosses, unit) => {
      expect(glosses.size, `${unit}가 ${[...glosses].join(' / ')}로 갈렸다`).toBe(1);
    });
  });
});

/** 계열 배열이 사전 밖 코드를 가리키면 화면이 `undefined.label`로 터진다 */
describe('계열 배열은 사전 안의 코드만 가리킨다', () => {
  it.each([...WATER_QUALITY_CODES, ...EQUIPMENT_CODES])('%s가 사전에 있다', (code) => {
    expect(MEASUREMENT_ITEMS[code]).toBeDefined();
  });
});
