import { describe, expect, it } from 'vitest';
import { SITE_SCENARIOS } from '@/shared/config/demo-scenario';
import { getMeasurementSeries } from '../api/fixtures';
import type { MeasurementPoint } from '../model/types';
import { energyGap, energyIntensity } from './energy';

function point(power: number | null, flow: number | null): MeasurementPoint {
  return {
    t: '2026-08-21T14:20:00Z',
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
    inflow: null,
    flow,
    level: null,
    TN: null,
    TP: null,
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

  /**
   * **방류가 없으면 값도 없다.** 이 지표는 전력을 **내보낸 물의 양**으로 나눈다 — 하루 종일
   * 방류하지 않은 사업장에는 나눌 값이 없다(`S-08` 시흥 도금 B라인이 그 시나리오다).
   *
   * 한때 이 경우가 **값을 냈다.** fixture가 방류 여부와 무관하게 유량을 흘려서, 리본은
   * `방류 중단`이라 적는데 효율은 멀쩡히 계산됐다 — 두 화면이 다른 말을 했다. 유량을 방류
   * 여부에 맞추자 이 자리가 드러났다 `[사용자 결정 2026-08-28]`.
   */
  it('실증 사업장 값이 소규모 산업 폐수 처리의 상식 범위에 든다', () => {
    for (const scenario of SITE_SCENARIOS) {
      const series = getMeasurementSeries(scenario.id);
      const value = energyIntensity(series);
      const discharged = series.some((p) => p.flow !== null && p.flow > 0);

      if (!scenario.online || !discharged) {
        expect(value).toBeNull();
        continue;
      }
      expect(value).not.toBeNull();
      expect(value!).toBeGreaterThan(0.3);
      expect(value!).toBeLessThan(6);
    }
  });

  /** 그 시나리오가 실제로 하나는 있어야 이 검사가 헛돌지 않는다 */
  it('하루 종일 방류하지 않은 사업장이 시연 데이터에 있다', () => {
    const idle = SITE_SCENARIOS.filter((s) => {
      if (!s.online) return false;
      return getMeasurementSeries(s.id).every((p) => p.flow === 0);
    });
    expect(idle.map((s) => s.id)).toEqual(['S-08']);
  });
});

/**
 * **한 `null`이 두 사정을 덮고 있었다.**
 *
 * 화면은 값이 없으면 `계측값이 없어 산출 불가`라고만 적었는데, **하루 종일 방류하지 않은
 * 사업장은 계측값을 받았고 그 값이 0이다** — 나눌 배출량이 없어 값이 안 나오는 것이지 못
 * 받은 것이 아니다. 받은 0을 못 받은 것으로 적는 것은 결측을 0으로 그리는 것과 같은 종류의
 * 거짓말이다(**E4**). 유량을 방류 여부에 맞추면서 드러났고 검토에서 잡았다.
 */
describe('값이 없는 이유', () => {
  it('표본이 하나도 없으면 계측이 없는 것이다', () => {
    expect(energyGap([point(null, null)])).toBe('noSamples');
    expect(energyGap([])).toBe('noSamples');
  });

  it('유량을 받았는데 전부 0이면 방류가 없는 것이다', () => {
    expect(energyGap([point(40, 0), point(40, 0)])).toBe('noDischarge');
  });

  it('값이 나오면 이유가 없다', () => {
    expect(energyGap([point(40, 480)])).toBeNull();
  });

  it('시연 데이터의 두 사정이 서로 다른 이유를 낸다', () => {
    const offline = SITE_SCENARIOS.find((s) => !s.online)!;
    expect(energyGap(getMeasurementSeries(offline.id))).toBe('noSamples');
    expect(energyGap(getMeasurementSeries('S-08'))).toBe('noDischarge');
  });
});
