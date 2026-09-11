import { describe, expect, it } from 'vitest';
import { COLLECTION_INTERVAL_MINUTES } from '@/shared/config/measurement';
import { SITE_SCENARIOS } from '@/shared/config/demo-scenario';
import { getMeasurementSeries } from '../api/fixtures';
import type { MeasurementPoint, Reading } from '../model/types';
import { dailyDischargeVolume } from './discharge-volume';

function point(t: string, flow: Reading): MeasurementPoint {
  return {
    t,
    pH: null,
    EC: null,
    turbidity: null,
    DO: null,
    temperature: null,
    chromaticity: null,
    NO3N: null,
    TOC: null,
    current: null,
    power: null,
    inflow: null,
    flow,
    level: null,
    TN: null,
    TP: null,
    /* 유입 수질 8종 — 이 테스트와 무관하다. 타입이 요구하므로 자리만 둔다 */
    inletPH: null,
    inletEC: null,
    inletTurbidity: null,
    inletDO: null,
    inletTemperature: null,
    inletChromaticity: null,
    inletNO3N: null,
    inletTOC: null,
  };
}

/** 한 표본이 담는 양 — 유량이 `m³/day`라 수집 주기만큼의 몫이다 */
const PER_SAMPLE = COLLECTION_INTERVAL_MINUTES / (24 * 60);

describe('금일 누적 배출량', () => {
  it('유량(m³/day)을 수집 주기만큼 잘라 더한다', () => {
    const result = dailyDischargeVolume([
      point('2026-08-21T00:00:00Z', 1440),
      point('2026-08-21T00:05:00Z', 1440),
    ]);
    expect(result.volumeM3).toBeCloseTo(1440 * PER_SAMPLE * 2, 9);
    expect(result.counted).toBe(2);
  });

  /**
   * **어제가 섞이면 `금일`이 아니다.** 시연 시간축은 마지막 표본에서 뒤로 24시간이라
   * 자정을 넘어간다 — 자르지 않으면 이 화면이 이름과 다른 값을 낸다.
   */
  it('자정 이전 표본은 세지 않는다', () => {
    const result = dailyDischargeVolume([
      point('2026-08-20T23:55:00Z', 1440),
      point('2026-08-21T00:00:00Z', 1440),
    ]);
    expect(result.counted).toBe(1);
    expect(result.volumeM3).toBeCloseTo(1440 * PER_SAMPLE, 9);
    expect(result.fromIso).toBe('2026-08-21T00:00:00Z');
  });

  /** 결측을 0으로 세면 "그동안 안 내보냈다"는 사실 주장이 된다(E4) */
  it('결측은 빼고 몇 개를 뺐는지 남긴다', () => {
    const result = dailyDischargeVolume([
      point('2026-08-21T00:00:00Z', 1440),
      point('2026-08-21T00:05:00Z', null),
      point('2026-08-21T00:10:00Z', null),
    ]);
    expect(result.counted).toBe(1);
    expect(result.missing).toBe(2);
    expect(result.volumeM3).toBeCloseTo(1440 * PER_SAMPLE, 9);
  });

  /** **`0 m³`과 `모름`은 다르다.** 전자는 안 내보낸 것이고 후자는 확인되지 않은 것이다 */
  it('셀 표본이 하나도 없으면 0이 아니라 모름이다', () => {
    const result = dailyDischargeVolume([point('2026-08-21T00:00:00Z', null)]);
    expect(result.volumeM3).toBeNull();
    expect(result.missing).toBe(1);
    expect(dailyDischargeVolume([]).volumeM3).toBeNull();
  });

  /** 유량 0은 **수신된 값**이다 — 방류하지 않은 시간이지 결측이 아니다 */
  it('유량 0인 표본은 결측이 아니라 센 표본이다', () => {
    const result = dailyDischargeVolume([point('2026-08-21T00:00:00Z', 0)]);
    expect(result.volumeM3).toBe(0);
    expect(result.counted).toBe(1);
    expect(result.missing).toBe(0);
  });

  describe('시연 데이터', () => {
    it('두절 사업장은 값을 내지 않는다', () => {
      const offline = SITE_SCENARIOS.find((s) => !s.online)!;
      expect(dailyDischargeVolume(getMeasurementSeries(offline.id)).volumeM3).toBeNull();
    });

    /**
     * 하루 종일 방류하지 않은 사업장(`S-08`)은 **`0 m³`이고 모름이 아니다** — 값을 받았고
     * 그 값이 0이다. 이 구분이 화면에서 `0 m³`과 `수신 없음`을 가른다.
     */
    it('하루 종일 방류하지 않은 사업장은 0이고 모름이 아니다', () => {
      const result = dailyDischargeVolume(getMeasurementSeries('S-08'));
      expect(result.volumeM3).toBe(0);
      expect(result.counted).toBeGreaterThan(0);
    });

    it('방류하는 사업장은 양수이고 하루 유량 상한 안에 든다', () => {
      const result = dailyDischargeVolume(getMeasurementSeries('S-02'));
      expect(result.volumeM3!).toBeGreaterThan(0);
      /* 유량 상한이 1,000 m³/day라 하루치가 그것을 넘을 수 없다 */
      expect(result.volumeM3!).toBeLessThan(1000);
    });
  });
});
