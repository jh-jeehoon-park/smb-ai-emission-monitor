import { getScenario, siteSeed } from '@/shared/config/demo-scenario';
import { MEASUREMENT_ITEMS } from '@/shared/config/measurement';
import { clamp, createRng, roundTo } from '@/shared/lib/prng';
import {
  EVENT_START_INDEX,
  TIMELINE_POINT_COUNT,
  isMissingAt,
  timelineIsoAt,
} from '@/shared/lib/timeline';
import type { MeasurementPoint, SeriesCode } from '../model/types';

const BASELINE: Record<SeriesCode, { mid: number; swing: number; period: number }> = {
  pH: { mid: 7.15, swing: 0.32, period: 61 },
  EC: { mid: 1840, swing: 210, period: 83 },
  turbidity: { mid: 34, swing: 11, period: 47 },
  DO: { mid: 5.4, swing: 1.1, period: 71 },
  temperature: { mid: 24.6, swing: 1.4, period: 149 },
  chromaticity: { mid: 128, swing: 34, period: 59 },
  NO3N: { mid: 11.8, swing: 2.6, period: 67 },
  TOC: { mid: 26.5, swing: 5.2, period: 53 },
  current: { mid: 118, swing: 16, period: 43 },
  power: { mid: 41, swing: 6.5, period: 43 },
  flow: { mid: 412, swing: 58, period: 91 },
};

const SERIES_CODES: SeriesCode[] = [
  'pH',
  'EC',
  'turbidity',
  'DO',
  'temperature',
  'chromaticity',
  'NO3N',
  'TOC',
  'current',
  'power',
  'flow',
];

/**
 * 유기물 부하가 오르면 미생물 산소 소비가 늘어 DO가 떨어진다는 원문의 인과(사업계획서 p.24)를
 * 이상 점수 상승과 같은 구간에 심는다. 상승 폭은 사업장 시나리오의 eventRise를 따르므로
 * 조용한 사업장은 계측도 조용하다 — 점수만 낮고 그래프는 요동치면 화면이 모순된다.
 */
function eventFactor(index: number, code: SeriesCode, intensity: number): number {
  if (index < EVENT_START_INDEX) return 0;
  const progress = ((index - EVENT_START_INDEX) / 36) * intensity;
  if (code === 'TOC') return progress * 16;
  if (code === 'DO') return -progress * 2.1;
  if (code === 'turbidity') return progress * 9;
  if (code === 'EC') return progress * 180;
  if (code === 'current') return progress * 22;
  if (code === 'power') return progress * 7;
  return 0;
}

export function getMeasurementSeries(siteId: string): MeasurementPoint[] {
  const scenario = getScenario(siteId);
  const rng = createRng(siteSeed(siteId, 731104));
  const intensity = scenario.eventRise / 74;
  // 사업장마다 기저 수질이 조금씩 다르다. 모두 같은 값이면 사업장을 바꾼 티가 안 난다.
  const offsetRng = createRng(siteSeed(siteId, 4242));
  const offsets = Object.fromEntries(
    SERIES_CODES.map((code) => [code, 1 + (offsetRng() - 0.5) * 0.24]),
  ) as Record<SeriesCode, number>;

  return Array.from({ length: TIMELINE_POINT_COUNT }, (_, i) => {
    const point = { t: timelineIsoAt(i) } as MeasurementPoint;
    const missing = isMissingAt(siteId, i);

    for (const code of SERIES_CODES) {
      if (missing) {
        point[code] = null;
        continue;
      }
      const b = BASELINE[code];
      const mid = b.mid * offsets[code];
      const wave = Math.sin((i / b.period) * Math.PI * 2) * b.swing;
      const noise = (rng() - 0.5) * b.swing * 0.45;
      const raw = mid + wave + noise + eventFactor(i, code, intensity);
      const [lo, hi] = MEASUREMENT_ITEMS[code].range;
      point[code] = roundTo(clamp(raw, lo, hi), MEASUREMENT_ITEMS[code].decimals);
    }

    return point;
  });
}

