import { describe, expect, it } from 'vitest';
import {
  EQUIPMENT_CODES,
  INLET_BY_OUTLET_CODE,
  MEASUREMENT_ITEMS,
  WATER_QUALITY_CODES,
  type MeasurementItem,
  type MeasurementItemCode,
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
   *
   * `inletPH`는 유입 쪽 같은 항목이라 함께 무차원이다 `[회의 2026-09-08]` — 같은 프로브다.
   */
  it('단위가 없는 항목도 무엇인지 말한다', () => {
    const unitless = items.filter((i) => i.unit === '');
    expect(unitless.map((i) => i.code)).toEqual(['pH', 'vibration', 'inletPH']);
    unitless.forEach((item) => {
      expect(item.unitKo).toContain('무차원');
    });
  });

  /**
   * **유입과 유출은 같은 단위를 쓴다** `[사용자 결정 2026-08-25]`. 나란히 놓고 빼는 값이라
   * 단위가 갈리면 그 차이가 뜻을 잃는다 — 화면이 `차` 칸을 그 둘에서 낸다.
   */
  it('유입과 유출은 단위와 자릿수가 같다', () => {
    const inflow = MEASUREMENT_ITEMS.inflow;
    const outflow = MEASUREMENT_ITEMS.flow;
    expect(inflow.unit).toBe(outflow.unit);
    expect(inflow.decimals).toBe(outflow.decimals);
  });

  /**
   * **유입 수질 8종은 유출 8종의 사양을 그대로 쓴다** `[회의 2026-09-08]` — 같은 프로브를
   * 양 끝에 단다. 값이 갈리면 «같은 센서가 지점마다 다른 정확도를 갖는다»는 주장이 되고,
   * 자릿수가 갈리면 대조 줄의 두 숫자가 다른 정밀도로 보인다(**E1**).
   */
  it('유입 수질은 짝이 되는 유출 항목과 사양이 같다', () => {
    for (const [outletCode, inletCode] of Object.entries(INLET_BY_OUTLET_CODE)) {
      const outlet = MEASUREMENT_ITEMS[outletCode as MeasurementItemCode];
      const inlet = MEASUREMENT_ITEMS[inletCode];

      expect(inlet.unit, outletCode).toBe(outlet.unit);
      expect(inlet.unitKo, outletCode).toBe(outlet.unitKo);
      expect(inlet.range, outletCode).toEqual(outlet.range);
      expect(inlet.accuracy, outletCode).toBe(outlet.accuracy);
      expect(inlet.decimals, outletCode).toBe(outlet.decimals);
    }
  });

  /** 짝이 수질 8종 전부를 덮는다 — 하나라도 빠지면 그 항목의 대조 줄이 조용히 사라진다 */
  it('수질 8종 전부에 유입 짝이 있다', () => {
    expect(Object.keys(INLET_BY_OUTLET_CODE).sort()).toEqual([...WATER_QUALITY_CODES].sort());
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
