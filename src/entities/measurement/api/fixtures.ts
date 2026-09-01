import { PROVISIONAL_IDLE_INFLOW_RATIO } from '@/shared/config/provisional';
import { getScenario, siteSeed } from '@/shared/config/demo-scenario';
import { MEASUREMENT_ITEMS } from '@/shared/config/measurement';
import { clamp, createRng, roundTo } from '@/shared/lib/prng';
import {
  EVENT_LENGTH_SAMPLES,
  EVENT_START_INDEX,
  TIMELINE_POINT_COUNT,
  isDischargingAt,
  isMissingAt,
  isTreatmentIdleAt,
  minutesToSamples,
  timelineIsoAt,
} from '@/shared/lib/timeline';
import type { MeasurementPoint, SeriesCode } from '../model/types';

/** 주기는 **분**이다. 표본 수로 적으면 수집 주기를 좁힐 때 파형이 그만큼 빨라진다 */
const BASELINE: Record<SeriesCode, { mid: number; swing: number; periodMinutes: number }> = {
  pH: { mid: 7.15, swing: 0.32, periodMinutes: 305 },
  EC: { mid: 1840, swing: 210, periodMinutes: 415 },
  turbidity: { mid: 34, swing: 11, periodMinutes: 235 },
  DO: { mid: 5.4, swing: 1.1, periodMinutes: 355 },
  temperature: { mid: 24.6, swing: 1.4, periodMinutes: 745 },
  chromaticity: { mid: 128, swing: 34, periodMinutes: 295 },
  NO3N: { mid: 11.8, swing: 2.6, periodMinutes: 335 },
  TOC: { mid: 26.5, swing: 5.2, periodMinutes: 265 },
  current: { mid: 118, swing: 16, periodMinutes: 215 },
  power: { mid: 41, swing: 6.5, periodMinutes: 215 },
  /* 유입은 유출보다 조금 많다 — 증발·슬러지 반출로 빠지는 만큼이다 */
  inflow: { mid: 430, swing: 58, periodMinutes: 455 },
  flow: { mid: 412, swing: 58, periodMinutes: 455 },
  /*
   * 수위는 **파도로 만들지 않는다** — 아래 `fillLevel`이 방류 여부를 보고 채우고 비운다.
   * 여기 값은 그 계산의 출발점(중간 수위)이고 `swing`·`periodMinutes`는 쓰이지 않는다
   * (`swing: 0`이라 파도 항이 0이 된다). `SeriesCode` 전부를 요구하는 `Record`라 자리는 있어야 한다.
   */
  level: { mid: 1.4, swing: 0, periodMinutes: 1 },
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
 * **방류 수조 수위는 방류 여부가 정한다** `[사용자 요청 2026-08-28]`.
 *
 * 방류하면 빠지고 멈추면 찬다 — 멈춰도 처리수는 계속 들어오기 때문이다. 그래서 이 계열은
 * 파도가 아니라 **앞 표본에서 이어진다**: 방류 여부가 목표 수위를 정하고 현재 값이 거기로
 * 수렴한다. 항목 루프 안에서는 앞 표본을 볼 수 없어 두 번째 패스로 뺐다.
 *
 * **`isDischargingAt`을 그대로 읽는다** — 리본·리포트가 보는 것과 같은 원천이라, 화면이
 * `방류 중단`이라 적는 구간에서 수위가 오르는 것이 눈으로 맞는다(E3).
 *
 * 목표 수위와 수렴 속도는 **시연 거동**이라 여기 둔다(`BASELINE`과 같은 층). 단위·만수위는
 * 표기 사양이라 `provisional.ts`가 갖는다 `[TBD-57]`.
 */
const LEVEL_TARGET_RATIO = { discharging: 0.4, held: 0.85 } as const;
/** 표본마다 목표까지의 6%를 좁힌다 — 5분 간격에서 한 시간이면 절반쯤 간다 */
const LEVEL_APPROACH = 0.06;
/**
 * **목표 자체가 천천히 숨 쉰다.**
 *
 * 목표를 고정값으로 두었더니 방류 구간이 없는 사업장(10곳 중 7곳)에서 수위가 `1.20`에
 * 수렴한 뒤 **완전한 직선**이 됐다 — 계측값이 아니라 설정값처럼 읽힌다. 실제 수조는 제어
 * 목표 근처에서 유입 변동을 따라 오르내린다.
 *
 * 진폭은 만수위의 5%(±0.15m), 주기는 표본 37개(약 3시간)다. 상태가 바뀌는 폭(0.4↔0.85,
 * 1.35m)보다 한참 작아 **방류 여부가 만드는 변화를 덮지 않는다** — 그것이 이 계열이
 * 말해야 하는 것이다.
 */
const LEVEL_BREATH = { amplitude: 0.05, period: 37 } as const;

/**
 * 유기물 부하가 오르면 미생물 산소 소비가 늘어 DO가 떨어진다는 원문의 인과(사업계획서 p.24)를
 * 이상 점수 상승과 같은 구간에 심는다. 상승 폭은 사업장 시나리오의 eventRise를 따르므로
 * 조용한 사업장은 계측도 조용하다 — 점수만 낮고 그래프는 요동치면 화면이 모순된다.
 */
function eventFactor(index: number, code: SeriesCode, intensity: number): number {
  if (index < EVENT_START_INDEX) return 0;
  const progress = ((index - EVENT_START_INDEX) / EVENT_LENGTH_SAMPLES) * intensity;
  if (code === 'TOC') return progress * 16;
  if (code === 'DO') return -progress * 2.1;
  if (code === 'turbidity') return progress * 9;
  if (code === 'EC') return progress * 180;
  if (code === 'current') return progress * 22;
  if (code === 'power') return progress * 7;
  return 0;
}

const seriesCache = new Map<string, MeasurementPoint[]>();

/**
 * 시드가 고정이라 몇 번을 불러도 같은 값이 나온다. 캐시는 그 계산만 아낀다.
 *
 * **한 렌더에서 사업장 수만큼 불리는 자리가 있다** — 관내 감독 표와 통합 관제가 사업장마다
 * 계열을 만든다. 표본 수는 수집 주기에 반비례해 늘어나므로 주기를 좁힐수록 이 비용이 커진다.
 *
 * 돌려주는 배열을 **호출부가 고치지 않는다**(모두 `slice`·전개로 복사해 쓴다).
 */
export function getMeasurementSeries(siteId: string): MeasurementPoint[] {
  const cached = seriesCache.get(siteId);
  if (cached) return cached;

  const built = buildSeries(siteId);
  seriesCache.set(siteId, built);
  return built;
}

function buildSeries(siteId: string): MeasurementPoint[] {
  const scenario = getScenario(siteId);
  const rng = createRng(siteSeed(siteId, 731104));
  const intensity = scenario.eventRise / 74;
  // 사업장마다 기저 수질이 조금씩 다르다. 모두 같은 값이면 사업장을 바꾼 티가 안 난다.
  const offsetRng = createRng(siteSeed(siteId, 4242));
  const offsets = Object.fromEntries(
    SERIES_CODES.map((code) => [code, 1 + (offsetRng() - 0.5) * 0.24]),
  ) as Record<SeriesCode, number>;

  const points = Array.from({ length: TIMELINE_POINT_COUNT }, (_, i) => {
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
      /*
       * **방류하지 않는 구간의 유출 유량은 0이다** `[사용자 결정 2026-08-28]`.
       *
       * 위 전류·전력과 같은 이유다 — 판정과 그림이 한 원천에서 나와야 한다. 이것이 없으면
       * 일간 운전 리본은 `방류 중단`이라 적는데 유량 계열은 412 언저리로 계속 흘렀고,
       * **금일 누적 배출량이 방류하지 않은 시간까지 더하게 된다.**
       *
       * 유입은 0으로 만들지 않는다 — 방류를 멈춰도 폐수는 들어온다. 그 차이가 아래
       * 수위 계열이 차오르는 근거다.
       */
      if (code === 'flow' && isDischargingAt(siteId, i) === false) {
        point[code] = 0;
        continue;
      }

      if (treatmentIdle && code === 'inflow') {
        const b = BASELINE.flow;
        const wave = Math.sin((i / minutesToSamples(b.periodMinutes)) * Math.PI * 2) * b.swing;
        point[code] = Math.round((b.mid * offsets.flow + wave) * PROVISIONAL_IDLE_INFLOW_RATIO);
        continue;
      }

      const b = BASELINE[code];
      const mid = b.mid * offsets[code];
      const wave = Math.sin((i / minutesToSamples(b.periodMinutes)) * Math.PI * 2) * b.swing;
      const noise = (rng() - 0.5) * b.swing * 0.45;
      const raw = mid + wave + noise + eventFactor(i, code, intensity);
      const [lo, hi] = MEASUREMENT_ITEMS[code].range;
      point[code] = roundTo(clamp(raw, lo, hi), MEASUREMENT_ITEMS[code].decimals);
    }

    return point;
  });

  return fillLevel(points, siteId);
}

/**
 * 수위를 채운다 — **앞 표본에서 이어지는 유일한 계열**이다.
 *
 * 결측 표본은 `null`로 두되 **직전 값을 기억한다** — 통신이 돌아왔을 때 수조가 처음부터
 * 다시 차오르면 두절이 물을 비운 것처럼 읽힌다. 못 본 동안에도 수조는 그대로 있었다.
 */
function fillLevel(points: MeasurementPoint[], siteId: string): MeasurementPoint[] {
  const [, full] = MEASUREMENT_ITEMS.level.range;
  const decimals = MEASUREMENT_ITEMS.level.decimals;
  let value = BASELINE.level.mid;

  return points.map((point, i) => {
    const discharging = isDischargingAt(siteId, i);

    /*
     * **두절 구간에서는 값을 움직이지 않는다.**
     *
     * 방류 여부를 모르는 시간이라 수조가 찼는지 빠졌는지도 모른다 — 어느 쪽으로든 굴리면
     * 복구 뒤의 값이 **우리가 지어낸 가정** 위에 서게 된다. 못 본 동안의 변화는 시연
     * 데이터가 만들 것이 아니다(E4). 값을 그대로 들고 있다가 수신이 돌아오면 거기서 잇는다.
     */
    if (discharging === null) return { ...point, level: null };

    const base = discharging ? LEVEL_TARGET_RATIO.discharging : LEVEL_TARGET_RATIO.held;
    const breath = Math.sin((i / LEVEL_BREATH.period) * Math.PI * 2) * LEVEL_BREATH.amplitude;
    value += (full * (base + breath) - value) * LEVEL_APPROACH;

    return { ...point, level: roundTo(value, decimals) };
  });
}

