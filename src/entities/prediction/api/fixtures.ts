import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { COLLECTION_INTERVAL_MINUTES } from '@/shared/config/measurement';
import { getScenario, siteSeed } from '@/shared/config/demo-scenario';
import { createRng, roundTo } from '@/shared/lib/prng';
import { TIMELINE_POINT_COUNT, isMissingAt, timelineIsoAt } from '@/shared/lib/timeline';
import {
  FLOW_FORECAST,
  FLOW_FORECAST_CODE,
  FORECAST_TARGETS,
  FORECAST_TARGET_CODES,
  SERIES_WINDOW_HOURS,
  type ForecastSeriesCode,
  type ForecastTargetCode,
  type ForecastTargetProfile,
} from '../config/constants';
import type {
  ForecastPoint,
  ForecastSummary,
  SeriesOrigin,
  Trend,
  TrendEstimate,
} from '../model/types';

/**
 * 경향을 가르는 기울기 문턱 — **그 항목 진폭에 대한 비율**이다.
 *
 * 절대값으로 두면 항목마다 규모가 달라(TOC 25 · TP 1.5 mg/L) 한 항목은 늘 `상승`,
 * 다른 항목은 늘 `유지`가 된다. 진폭으로 나누면 같은 문턱이 세 항목에 다 통한다.
 *
 * 값 자체는 `[설계]`다 — 원문이 경향 판정 기준을 주지 않았고(`[INC-05]`) 이것은 표시
 * 등급이라 법정 판정값이 아니다. 진폭의 반이면 눈으로도 기울기가 보인다.
 */
const TREND_SLOPE_RATIO = 0.5;

/** 보여 주는 구간. 예측 구간이 사라졌으므로 이 창이 곧 차트 전체다 */
const ACTUAL_TAIL_POINTS = (SERIES_WINDOW_HOURS * 60) / COLLECTION_INTERVAL_MINUTES;

/**
 * 계열의 값이 계측인가 추정인가.
 *
 * TN·TP는 센서가 없어 소프트 센싱으로 낸다 `[원문 발표 p.17]` — 회의가 그 사실을 화면에
 * 적으라고 정리했다 `[회의 2026-08-20]`. TOC·유량은 계측 사양에 있다 `[원문 p.55]`.
 */
const SERIES_ORIGIN: Record<ForecastSeriesCode, SeriesOrigin> = {
  TOC: 'measured',
  TN: 'softSensed',
  TP: 'softSensed',
  flow: 'measured',
};

/** 항목마다 rng 계열을 벌려 세 항목이 똑같은 모양으로 겹치지 않게 한다 */
const SEED_OFFSET: Record<ForecastSeriesCode, number> = {
  TOC: 90210,
  TN: 90211,
  TP: 90212,
  flow: 90213,
};

/**
 * 최근 6시간 계열.
 *
 * **예측 구간을 만들지 않는다** `[INC-109]` `[TBD-52]`. 6시간 예측의 대상 항목이 정해지지
 * 않았고 신뢰구간의 신뢰수준도 원문에 없다 — 없는 데이터로 곡선을 그리면 산출된 예측처럼
 * 읽힌다(E3).
 */
function buildPoints(
  siteId: string,
  profile: ForecastTargetProfile,
  intensity: number,
): ForecastPoint[] {
  const rng = createRng(siteSeed(siteId, SEED_OFFSET[profile.code]));
  const points: ForecastPoint[] = [];
  const startIndex = TIMELINE_POINT_COUNT - ACTUAL_TAIL_POINTS;
  const { decimals } = profile;

  for (let i = startIndex; i < TIMELINE_POINT_COUNT; i += 1) {
    if (isMissingAt(siteId, i)) {
      points.push({ t: timelineIsoAt(i), value: null });
      continue;
    }
    const progress = Math.max(0, (i - (TIMELINE_POINT_COUNT - 36)) / 36) * intensity;
    const value =
      profile.base +
      Math.sin(i / 17 + profile.phase) * profile.amplitude +
      (rng() - 0.5) * profile.noise +
      progress * profile.rise;
    points.push({ t: timelineIsoAt(i), value: roundTo(value, decimals) });
  }

  return points;
}

/**
 * 계열이 오르는가 내리는가 — **계열에서 낸다.**
 *
 * 예전에는 시나리오 세기(`intensity + trendOffset`)로만 정했다. 값과 무관해서 차트가
 * 내려가는데 카드가 `상승`이라 말할 수 있었고, 통신이 두절돼 값이 없어도 화살표가 찍혔다.
 *
 * 앞뒤 절반의 평균 차이를 본다 — 첫 점과 끝 점만 비교하면 잡음 한 점이 방향을 뒤집는다.
 * **표본이 모자라거나 없으면 `null`**이다. `steady`를 돌려주면 "변화가 없다"는 사실
 * 주장이 되어 없는 판정을 만든다(E4).
 */
function trendOf(points: ForecastPoint[], amplitude: number): Trend | null {
  const values = points.map((p) => p.value).filter((v): v is number => v !== null);
  if (values.length < 4) return null;

  const half = Math.floor(values.length / 2);
  const mean = (xs: number[]) => xs.reduce((acc, v) => acc + v, 0) / xs.length;
  const delta = mean(values.slice(half)) - mean(values.slice(0, half));

  const threshold = amplitude * TREND_SLOPE_RATIO;
  if (delta > threshold) return 'rising';
  if (delta < -threshold) return 'falling';
  return 'steady';
}

/** 값이 없으면 **0이 아니라 모름**이다 — 0은 "0 mg/L로 추정했다"는 뜻이 된다(E4) */
function lastValueOf(points: ForecastPoint[]): number | null {
  return [...points].reverse().find((p) => p.value !== null)?.value ?? null;
}

/**
 * 같은 사업장의 세 항목을 여러 번 만들지 않도록 붙잡아 둔다.
 * 시드가 고정이라 몇 번을 불러도 같은 값이 나오며, 캐시는 그 계산만 아낀다.
 */
const seriesCache = new Map<string, Record<ForecastTargetCode, ForecastPoint[]>>();

function allSeries(
  siteId: string,
  intensity: number,
): Record<ForecastTargetCode, ForecastPoint[]> {
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
 * 값은 각 항목의 **마지막 표본**에서 가져오므로 차트와 카드가 어긋나지 않는다.
 *
 * **경향은 계열에서 낸다.** 여기가 계열을 손에 든 유일한 지점이라 위젯이 다시 가져올
 * 이유가 없고, 두 곳에서 계산하면 차트와 카드가 갈린다.
 *
 * **기준 대비 판정은 여기서 하지 않는다.** 기준표는 사업장 설정에서 오므로 entity가
 * 알 수 없다 — 위젯이 `isOverLimit`으로 낸다.
 */
function buildTrends(
  series: Record<ForecastTargetCode, ForecastPoint[]>,
): TrendEstimate[] {
  return FORECAST_TARGET_CODES.map((code) => {
    const profile = FORECAST_TARGETS[code];
    const points = series[code];
    const last = lastValueOf(points);
    const value = last === null ? null : roundTo(last, profile.decimals);

    return {
      label: profile.label,
      code,
      trend: trendOf(points, profile.amplitude),
      origin: SERIES_ORIGIN[code],
      value,
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
    code: profile.code,
    targetLabel: `${profile.code} ${profile.label}`,
    unit: profile.unit,
    decimals: profile.decimals,
    origin: SERIES_ORIGIN[profile.code],
    online: scenario.online,
    computedAtIso: scenario.online ? DEMO_NOW_ISO : '2026-08-21T13:35:00Z',
    inputWindowLabel: '과거 24시간 다변량 시계열',
    modelLabel: 'LSTM + Attention',
    points: series[target],
    trends: buildTrends(series),
  };
}

/**
 * 유량(수량) 예측 `[INC-95 판정 2026-08-19]`.
 *
 * 오염도와 **같은 규약**을 쓴다 — 같은 창, 같은 결측 처리. 다른 것은 항목 프로파일
 * 하나뿐이다. 경향 카드는 오염도 3항목의 것이므로 그대로 싣는다(FR-12).
 */
export function getFlowForecast(siteId: string): ForecastSummary {
  const scenario = getScenario(siteId);
  const intensity = scenario.eventRise / 74;
  const points = buildPoints(siteId, FLOW_FORECAST, intensity);

  return {
    code: FLOW_FORECAST_CODE,
    targetLabel: `${FLOW_FORECAST.label}(수량)`,
    unit: FLOW_FORECAST.unit,
    decimals: FLOW_FORECAST.decimals,
    origin: SERIES_ORIGIN[FLOW_FORECAST_CODE],
    online: scenario.online,
    computedAtIso: scenario.online ? DEMO_NOW_ISO : '2026-08-21T13:35:00Z',
    inputWindowLabel: '과거 24시간 다변량 시계열',
    modelLabel: 'LSTM + Attention',
    points,
    trends: buildTrends(allSeries(siteId, intensity)),
  };
}
