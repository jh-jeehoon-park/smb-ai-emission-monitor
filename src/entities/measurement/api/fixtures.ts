import { PROVISIONAL_IDLE_INFLOW_RATIO } from '@/shared/config/provisional';
import { getScenario, siteSeed } from '@/shared/config/demo-scenario';
import { MEASUREMENT_ITEMS } from '@/shared/config/measurement';
import { clamp, createRng, roundTo } from '@/shared/lib/prng';
import {
  EVENT_START_INDEX,
  TIMELINE_POINT_COUNT,
  isMissingAt,
  isTreatmentIdleAt,
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
  /* 유입은 유출보다 조금 많다 — 증발·슬러지 반출로 빠지는 만큼이다 */
  inflow: { mid: 430, swing: 58, period: 91 },
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
  'inflow',
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
    /* 표본마다 한 번만 판정한다 — 항목 루프 안에서 부르면 표본당 11번 불린다 */
    const treatmentIdle = isTreatmentIdleAt(siteId, i);

    for (const code of SERIES_CODES) {
      if (missing) {
        point[code] = null;
        continue;
      }
      /*
       * 방지시설이 멈춘 구간에서는 전류·전력이 0이다.
       *
       * 판정(`isTreatmentIdleAt`)과 그림이 **한 원천에서 나오게** 하는 자리다. 여기서
       * 0으로 만들지 않으면, 이상 탐지 화면은 "미가동"이라 적는데 시계열 차트에는 전류가
       * 정상으로 흐르는 모순이 생긴다. 유량은 그대로 둔다 — 멈춘 채 방류가 이어진 것이
       * 이 구간의 정의다 `[원문 발표 p.13]`.
       */
      if (treatmentIdle && (code === 'current' || code === 'power')) {
        point[code] = 0;
        continue;
      }

      /*
       * **방류 의심 구간에서만 유입·유출이 뒤집힌다** `[사용자 결정 2026-08-25]`.
       *
       * 평상시 유출은 유입보다 조금 적다 — 증발·슬러지 반출로 빠지는 만큼이다(기준선이
       * 430 대 412로 약 4% 차이). 그런데 **방지시설이 멈춘 채 방류가 이어지는 구간**에서는
       * 처리 없이 내보내므로 나간 양이 들어온 양을 넘는다.
       *
       * 그 구간이 `isTreatmentIdleAt`이 정하는 바로 그 구간이라 **이상 탐지 화면의 방류 의심
       * 판정과 같은 곳을 가리킨다** — 두 화면이 서로 다른 말을 하지 않는다(E3). 값을 여기서
       * 만들지 않고 화면마다 따로 계산하면 그 정합이 깨진다.
       */
      if (treatmentIdle && code === 'inflow') {
        const b = BASELINE.flow;
        const wave = Math.sin((i / b.period) * Math.PI * 2) * b.swing;
        point[code] = Math.round((b.mid * offsets.flow + wave) * PROVISIONAL_IDLE_INFLOW_RATIO);
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

