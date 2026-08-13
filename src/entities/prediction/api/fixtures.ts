import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { getScenario, siteSeed } from '@/shared/config/demo-scenario';
import { FORECAST_HORIZON_HOURS } from '@/shared/config/measurement';
import { createRng, roundTo } from '@/shared/lib/prng';
import { TIMELINE_POINT_COUNT, isMissingAt, timelineIsoAt } from '@/shared/lib/timeline';
import {
  FORECAST_TARGETS,
  FORECAST_TARGET_CODES,
  type ForecastTargetCode,
  type ForecastTargetProfile,
} from '../config/constants';
import type { ForecastPoint, ForecastSummary, Trend, TrendEstimate } from '../model/types';

/** 실측 구간은 최근 6시간만 보여준다 — 예측 지평과 대칭이라 읽기 쉽다 */
const ACTUAL_TAIL_POINTS = 72;
const FORECAST_STEP_MINUTES = 30;
const FORECAST_POINTS = (FORECAST_HORIZON_HOURS * 60) / FORECAST_STEP_MINUTES;

/** 항목마다 rng 계열을 벌려 세 항목이 똑같은 모양으로 겹치지 않게 한다 */
const SEED_OFFSET: Record<ForecastTargetCode, number> = { TOC: 90210, TN: 90211, TP: 90212 };

function buildPoints(
  siteId: string,
  profile: ForecastTargetProfile,
  intensity: number,
): ForecastPoint[] {
  const rng = createRng(siteSeed(siteId, SEED_OFFSET[profile.code]));
  const points: ForecastPoint[] = [];
  const startIndex = TIMELINE_POINT_COUNT - ACTUAL_TAIL_POINTS;
  const { decimals } = profile;
  let lastActual = profile.base;

  for (let i = startIndex; i < TIMELINE_POINT_COUNT; i += 1) {
    if (isMissingAt(siteId, i)) {
      points.push({ t: timelineIsoAt(i), actual: null, forecast: null, lower: null, upper: null });
      continue;
    }
    const progress = Math.max(0, (i - (TIMELINE_POINT_COUNT - 36)) / 36) * intensity;
    const value =
      profile.base +
      Math.sin(i / 17) * profile.amplitude +
      (rng() - 0.5) * profile.noise +
      progress * profile.rise;
    lastActual = roundTo(value, decimals);
    points.push({
      t: timelineIsoAt(i),
      actual: lastActual,
      forecast: null,
      lower: null,
      upper: null,
    });
  }

  // 예측선이 실측선과 이어져 보이도록 마지막 실측 지점을 예측 시작점으로도 둔다.
  const joinPoint = points[points.length - 1];
  if (joinPoint && joinPoint.actual !== null) {
    joinPoint.forecast = lastActual;
    joinPoint.lower = lastActual;
    joinPoint.upper = lastActual;
  }

  const nowMs = new Date(DEMO_NOW_ISO).getTime();
  for (let k = 1; k <= FORECAST_POINTS; k += 1) {
    const t = new Date(nowMs + k * FORECAST_STEP_MINUTES * 60_000).toISOString().slice(0, 19) + 'Z';
    // 상승 추세가 완만해지며 수렴하는 형태. 불확실성은 시간에 비례해 벌어진다.
    const forecast = roundTo(
      lastActual +
        Math.log1p(k) * profile.forecastGain * intensity +
        (rng() - 0.5) * profile.noise * 0.4,
      decimals,
    );
    const spread = roundTo(profile.spreadBase + k * profile.spreadStep, decimals);
    points.push({
      t,
      actual: null,
      forecast,
      lower: roundTo(forecast - spread, decimals),
      upper: roundTo(forecast + spread, decimals),
    });
  }

  return points;
}

function trendOf(intensity: number, offset: number): Trend {
  const v = intensity + offset;
  if (v > 0.45) return 'rising';
  if (v < 0.12) return 'falling';
  return 'steady';
}

function lastForecastOf(points: ForecastPoint[]): number {
  return [...points].reverse().find((p) => p.forecast !== null)?.forecast ?? 0;
}

/**
 * 같은 사업장의 세 항목을 여러 번 만들지 않도록 붙잡아 둔다.
 * 시드가 고정이라 몇 번을 불러도 같은 값이 나오며, 캐시는 그 계산만 아낀다.
 */
const seriesCache = new Map<string, Record<ForecastTargetCode, ForecastPoint[]>>();

function allSeries(siteId: string, intensity: number): Record<ForecastTargetCode, ForecastPoint[]> {
  const cached = seriesCache.get(siteId);
  if (cached) return cached;

  const built = {
    TOC: buildPoints(siteId, FORECAST_TARGETS.TOC, intensity),
    TN: buildPoints(siteId, FORECAST_TARGETS.TN, intensity),
    TP: buildPoints(siteId, FORECAST_TARGETS.TP, intensity),
  };
  seriesCache.set(siteId, built);
  return built;
}

/**
 * 경향 요약은 어느 항목을 보고 있든 세 항목을 함께 보여준다(FR-12).
 * 값은 각 항목의 예측 마지막 지점에서 가져오므로 차트와 표가 어긋나지 않는다.
 */
function buildTrends(
  series: Record<ForecastTargetCode, ForecastPoint[]>,
  intensity: number,
): TrendEstimate[] {
  return FORECAST_TARGET_CODES.map((code) => {
    const profile = FORECAST_TARGETS[code];
    return {
      label: profile.label,
      code,
      trend: trendOf(intensity, profile.trendOffset),
      value: roundTo(lastForecastOf(series[code]), profile.decimals),
      unit: profile.unit,
      decimals: profile.decimals,
      r2: profile.r2,
    };
  });
}

export function getForecast(siteId: string, target: ForecastTargetCode = 'TOC'): ForecastSummary {
  const scenario = getScenario(siteId);
  const intensity = scenario.eventRise / 74;
  const profile = FORECAST_TARGETS[target];
  const series = allSeries(siteId, intensity);

  return {
    targetLabel: `${profile.code} ${profile.label}`,
    unit: profile.unit,
    decimals: profile.decimals,
    horizonHours: FORECAST_HORIZON_HOURS,
    online: scenario.online,
    computedAtIso: scenario.online ? DEMO_NOW_ISO : '2026-08-11T13:35:00Z',
    inputWindowLabel: '과거 24시간 다변량 시계열',
    modelLabel: 'LSTM + Attention',
    points: series[target],
    trends: buildTrends(series, intensity),
  };
}
