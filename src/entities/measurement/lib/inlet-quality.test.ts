import { describe, expect, it } from 'vitest';
import { INLET_BY_OUTLET_CODE, MEASUREMENT_ITEMS } from '@/shared/config/measurement';
import {
  PROVISIONAL_TREATMENT_RETENTION,
  PROVISIONAL_TREATMENT_SIMILAR_PERCENT,
  PROVISIONAL_TREATMENT_STALL_SITES,
} from '@/shared/config/provisional';
import { getMeasurementSeries } from '../api/fixtures';
import { INLET_WATER_SERIES_CODES } from '../config/constants';
import type { MeasurementPoint, SeriesCode } from '../model/types';
import {
  changeRatePercent,
  fillInletQuality,
  isSimilar,
  isTreatmentJudged,
} from './inlet-quality';

/** 유출 항목만 세운 표본. 유입 칸은 `fillInletQuality`가 채운다 */
function outletPoint(values: Partial<Record<SeriesCode, number | null>>): MeasurementPoint {
  const point = { t: '2026-09-10T09:00:00Z' } as MeasurementPoint;
  for (const code of Object.keys(INLET_BY_OUTLET_CODE) as SeriesCode[]) {
    point[code] = values[code] ?? null;
  }
  return point;
}

describe('유입은 유출에서 역산된다', () => {
  /**
   * **처리로 줄어드는 항목은 유입이 더 크다.** 이 방향이 뒤집히면 화면이 «처리했더니 더
   * 나빠졌다»를 상시로 적는다.
   */
  it('제거 대상 항목은 유입이 유출보다 크다', () => {
    const point = outletPoint({ TOC: 12, turbidity: 6 });
    fillInletQuality(point, 'S-01');

    expect(point.inletTOC!).toBeGreaterThan(12);
    expect(point.inletTurbidity!).toBeGreaterThan(6);
  });

  /** 폭기가 DO를 **올린다** — 잔존율이 1보다 커서 유입이 더 낮다 */
  it('폭기로 오르는 항목은 유입이 더 낮다', () => {
    const point = outletPoint({ DO: 6.5 });
    fillInletQuality(point, 'S-01');

    expect(point.inletDO!).toBeLessThan(6.5);
  });

  /**
   * **유출이 결측이면 유입도 결측이다**(E4). 없는 값에서 나누면 두절 구간이 정상 추세로
   * 이어져 보인다 — 이 화면의 주인공이 두 값의 차라 여기가 무너지면 전부 거짓말이 된다.
   */
  it('유출이 결측인 항목은 유입도 결측이다', () => {
    const point = outletPoint({ TOC: 12 });
    fillInletQuality(point, 'S-01');

    expect(point.inletTOC).not.toBeNull();
    expect(point.inletPH).toBeNull();
    expect(point.inletDO).toBeNull();
  });

  /** 표시 자릿수는 짝이 되는 유출 항목을 따른다 — 갈리면 두 숫자가 다른 정밀도로 보인다(E1) */
  it('짝의 자릿수로 반올림된다', () => {
    const point = outletPoint({ TOC: 12.34, pH: 7.216 });
    fillInletQuality(point, 'S-01');

    expect(point.inletTOC).toBe(Number(point.inletTOC!.toFixed(MEASUREMENT_ITEMS.TOC.decimals)));
    expect(point.inletPH).toBe(Number(point.inletPH!.toFixed(MEASUREMENT_ITEMS.pH.decimals)));
  });

  /** 센서 측정 범위를 넘겨 만들지 않는다 — 사양 밖 값은 계측이 아니라 우리 산수의 결과다 */
  it('센서 범위 안으로 자른다', () => {
    const point = outletPoint({ turbidity: 3900 });
    fillInletQuality(point, 'S-01');

    const [, hi] = MEASUREMENT_ITEMS.inletTurbidity.range;
    expect(point.inletTurbidity!).toBeLessThanOrEqual(hi);
  });
});

describe('정체를 심은 사업장', () => {
  const stalled = PROVISIONAL_TREATMENT_STALL_SITES[0]!;

  /** 시연에서 알람이 실제로 뜨게 하는 자리다 — 뜨지 않으면 만들어 둔 판정이 보이지 않는다 */
  it('판정 대상 항목이 유입과 유사해진다', () => {
    const point = outletPoint({ TOC: 12 });
    fillInletQuality(point, stalled);

    expect(isSimilar(changeRatePercent(point.inletTOC, 12))).toBe(true);
  });

  /**
   * **판정하지 않는 항목까지 밀지 않는다.** pH·EC·수온이 함께 붙으면 «처리가 안 됐다»와
   * 무관한 줄이 근거처럼 늘어서 화면이 무엇을 보고 그렇게 적었는지 흐려진다.
   */
  it('판정하지 않는 항목은 그대로다', () => {
    const normal = outletPoint({ pH: 7.2 });
    const stalledPoint = outletPoint({ pH: 7.2 });
    fillInletQuality(normal, 'S-01');
    fillInletQuality(stalledPoint, stalled);

    expect(stalledPoint.inletPH).toBe(normal.inletPH);
  });
});

describe('변화율과 유사 판정', () => {
  /** 한쪽이라도 모르면 모른다 — 0으로 두면 «변화 없음»이라는 재 보지 않은 주장이 된다(E4) */
  it('한쪽이 결측이면 null이다', () => {
    expect(changeRatePercent(null, 10)).toBeNull();
    expect(changeRatePercent(10, null)).toBeNull();
  });

  /** 유입이 0이면 나눌 수 없다. `Infinity`를 흘리면 화면이 그것을 %로 찍는다 */
  it('유입이 0이면 null이다', () => {
    expect(changeRatePercent(0, 10)).toBeNull();
  });

  /** 부호를 접지 않는다 — 폭기가 올린 DO와 처리가 줄인 TOC가 같아 보이면 안 된다 */
  it('오른 것과 줄어든 것의 부호가 다르다', () => {
    expect(changeRatePercent(10, 5)).toBe(-50);
    expect(changeRatePercent(10, 15)).toBe(50);
  });

  it('임계 미만이 유사다', () => {
    const under = PROVISIONAL_TREATMENT_SIMILAR_PERCENT - 1;
    expect(isSimilar(under)).toBe(true);
    expect(isSimilar(-under)).toBe(true);
    expect(isSimilar(PROVISIONAL_TREATMENT_SIMILAR_PERCENT)).toBe(false);
  });

  /** 모르는 것은 유사가 아니다 — 결측을 유사로 세면 두절 사업장이 전부 처리 미흡이 된다 */
  it('결측은 유사가 아니다', () => {
    expect(isSimilar(null)).toBe(false);
  });

  /**
   * **판정 대상은 다섯이다** `[TBD-59]`. 수온은 공정이 바꾸려는 값이 아니고, EC는 응집제로
   * 오를 수도 있어 방향이 없으며, pH는 유입이 이미 중성이면 같은 것이 정상이다.
   */
  it('판정 대상과 아닌 것이 갈린다', () => {
    const judged = Object.keys(PROVISIONAL_TREATMENT_RETENTION).filter((code) =>
      isTreatmentJudged(code as SeriesCode),
    );

    expect(judged.sort()).toEqual(['DO', 'NO3N', 'TOC', 'chromaticity', 'turbidity']);
    expect(isTreatmentJudged('temperature')).toBe(false);
    expect(isTreatmentJudged('EC')).toBe(false);
    expect(isTreatmentJudged('pH')).toBe(false);
  });
});

describe('fixture 계열에 유입이 실려 온다', () => {
  /** 계열이 통째로 비면 화면의 왼쪽 열이 사라지는데, 타입은 그것을 잡지 못한다 */
  it('유입 8종이 값을 갖는다', () => {
    const points = getMeasurementSeries('S-01');
    for (const code of INLET_WATER_SERIES_CODES) {
      expect(points.some((p) => p[code] !== null), code).toBe(true);
    }
  });

  /** 전 구간 두절 사업장은 유입도 전 구간 결측이다 — 한쪽만 값이 있으면 그쪽이 지어낸 것이다 */
  it('두절 사업장은 유입도 비어 있다', () => {
    const dark = getMeasurementSeries('S-08');
    const outletKnown = dark.some((p) => p.TOC !== null);
    const inletKnown = dark.some((p) => p.inletTOC !== null);

    expect(inletKnown).toBe(outletKnown);
  });
});
