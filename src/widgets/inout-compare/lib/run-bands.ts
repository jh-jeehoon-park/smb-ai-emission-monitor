import { roundTo } from '@/shared/lib/prng';
import {
  TIMELINE_POINT_COUNT,
  isDischargingAt,
  isMissingAt,
  isTreatmentIdleAt,
} from '@/shared/lib/timeline';
import { findIdleDischargeRuns } from '@/entities/anomaly';

/** 24시간 축 위의 한 구간. 폭은 비율이라 축척과 무관하다 */
export interface Band {
  fromPct: number;
  toPct: number;
}

export interface RunBands {
  /** 방지시설이 돌던 구간 */
  running: Band[];
  /** 물이 나가던 구간 */
  discharging: Band[];
  /** 둘 다 모르는 구간 — 통신 두절 */
  missing: Band[];
  /**
   * **방류 중인데 방지시설이 멈춘 구간.** 두 줄이 어긋난 자리가 이 화면의 알맹이다
   * `[원문 발표 p.13]`.
   *
   * `/anomaly`와 **같은 함수**(`findIdleDischargeRuns`)에서 온다 — 각자 세면 같은 사업장의
   * 같은 시각을 두 화면이 다르게 판정한다. 최소 지속 시간도 그쪽 임시값을 그대로 따른다.
   */
  suspect: Band[];
  /**
   * 판정할 수 있는 사업장인가. 전 구간이 결측이면 의심 **0건**이 아니라 **모름**이다 —
   * 0건으로 적으면 통신이 끊긴 사업장이 깨끗한 사업장으로 둔갑한다(E4).
   */
  judgeable: boolean;
}

const pct = (index: number) => roundTo((index / TIMELINE_POINT_COUNT) * 100, 3);

/**
 * 술어가 참인 구간을 모은다.
 *
 * **`null`에서 끊는다.** 모르는 시간을 이어 붙이면 없는 사실을 만든다 — 두절 앞뒤의 가동을
 * 한 구간으로 이으면 «그 사이에도 돌고 있었다»가 되어 버린다(E4).
 */
function collect(predicate: (index: number) => boolean): Band[] {
  const bands: Band[] = [];
  let start: number | null = null;

  for (let i = 0; i < TIMELINE_POINT_COUNT; i += 1) {
    if (predicate(i)) {
      if (start === null) start = i;
      continue;
    }
    if (start !== null) {
      bands.push({ fromPct: pct(start), toPct: pct(i) });
      start = null;
    }
  }
  /* 창 끝까지 이어진 구간은 루프가 닫아 주지 않는다 — 지금도 돌고 있는 사업장이 그 경우다 */
  if (start !== null) bands.push({ fromPct: pct(start), toPct: pct(TIMELINE_POINT_COUNT) });

  return bands;
}

/**
 * 가동 ↔ 방류 두 줄.
 *
 * **`/anomaly`와 같은 원천을 쓴다** — 시연 시나리오(`isTreatmentIdleAt`·`isDischargingAt`)다.
 * 계측 서버에 `current`·`discharging` 채널이 실제로 있지만(2026-09-10 실측), 그쪽으로 옮기는
 * 것은 이 화면만의 결정일 수 없다: 두 화면이 다른 원천을 보면 같은 시각을 다르게 판정한다.
 * 원천 통일은 별건으로 남는다.
 */
export function buildRunBands(siteId: string): RunBands {
  return {
    running: collect((i) => isTreatmentIdleAt(siteId, i) === false),
    discharging: collect((i) => isDischargingAt(siteId, i) === true),
    missing: collect((i) => isMissingAt(siteId, i)),
    suspect: findIdleDischargeRuns(siteId).map((run) => ({
      fromPct: pct(run.from),
      /* 구간은 끝 표본을 포함한다 — `to`까지 칠해야 한 표본짜리 구간이 폭 0이 되지 않는다 */
      toPct: pct(run.to + 1),
    })),
    judgeable: hasAnyKnownSample(siteId),
  };
}

function hasAnyKnownSample(siteId: string): boolean {
  for (let i = 0; i < TIMELINE_POINT_COUNT; i += 1) {
    if (!isMissingAt(siteId, i)) return true;
  }
  return false;
}
