import { describe, expect, it } from 'vitest';
import { SITE_SCENARIOS } from '@/shared/config/demo-scenario';
import { getMeasurementSeries } from '../api/fixtures';
import type { MeasurementPoint } from '../model/types';
import { energyIntensity } from './energy';

function point(power: number | null, flow: number | null): MeasurementPoint {
  return {
    t: '2026-08-11T14:20:00Z',
    pH: null,
    EC: null,
    turbidity: null,
    DO: null,
    temperature: null,
    chromaticity: null,
    NO3N: null,
    TOC: null,
    current: null,
    power,
    flow,
  };
}

describe('energyIntensity', () => {
  it('평균 전력 × 24 ÷ 평균 유량으로 kWh/m³를 낸다', () => {
    // 40kW를 하루 돌리면 960kWh, 480m³를 처리하면 2.0 kWh/m³
    expect(energyIntensity([point(40, 480)])).toBeCloseTo(2.0, 6);
  });

  it('창 길이와 무관하다 — 순간값의 평균만 쓴다', () => {
    const short = energyIntensity([point(40, 480), point(40, 480)]);
    const long = energyIntensity(Array.from({ length: 100 }, () => point(40, 480)));
    expect(short).toBeCloseTo(long!, 9);
  });

  it('전력만 결측인 구간을 0으로 채우면 효율이 절반으로 좋아 보인다(E4)', () => {
    // 전력은 안 들어왔지만 유량은 들어온 구간. 이때가 0 대체의 위험이 드러나는 자리다
    const withGap = energyIntensity([point(40, 480), point(null, 480)]);
    const withZero = energyIntensity([point(40, 480), point(0, 480)]);

    expect(withGap).toBeCloseTo(2.0, 6);
    expect(withZero).toBeCloseTo(1.0, 6);
  });

  it('전력·유량의 결측 구간이 서로 달라도 각자 있는 표본으로만 평균 낸다', () => {
    expect(energyIntensity([point(40, null), point(null, 480)])).toBeCloseTo(2.0, 6);
  });

  it('전 구간 결측이면 값을 만들지 않는다', () => {
    expect(energyIntensity([point(null, null)])).toBeNull();
    expect(energyIntensity([])).toBeNull();
  });

  it('유량이 0이면 나눌 수 없으므로 값을 내지 않는다', () => {
    expect(energyIntensity([point(40, 0)])).toBeNull();
  });

  it('실증 사업장 값이 소규모 산업 폐수 처리의 상식 범위에 든다', () => {
    for (const scenario of SITE_SCENARIOS) {
      const value = energyIntensity(getMeasurementSeries(scenario.id));
      if (!scenario.online) {
        expect(value).toBeNull();
        continue;
      }
      expect(value).not.toBeNull();
      expect(value!).toBeGreaterThan(0.3);
      expect(value!).toBeLessThan(6);
    }
  });
});
