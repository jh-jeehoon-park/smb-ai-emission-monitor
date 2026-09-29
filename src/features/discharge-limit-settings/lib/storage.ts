import type { DischargeRoute } from '@/entities/regulation';
import { DISCHARGE_ROUTES } from '@/entities/regulation';
import {
  DISCHARGE_SCALES,
  LIMIT_INPUT_KIND,
  REGION_GRADES,
  type DischargeScale,
  type RegionGrade,
} from '@/shared/config/discharge-limits';
import { MEASUREMENT_ITEMS, type MeasurementItemCode } from '@/shared/config/measurement';
import { REUSE_STATUSES, type ReuseStatus } from '../config/constants';

/**
 * 사용자가 입력한 기준치. **(지역구분 × 규모 × 항목) → 값**이다.
 *
 * 법령 표가 그 세 축으로 갈리기 때문이다 `[공정자료 p.11]`. 사업장별로 저장하지 않는 이유는
 * 같은 지역·같은 규모면 같은 기준을 받기 때문이다 — 사업장마다 따로 넣게 하면 10번 입력해야
 * 하고 서로 다른 값이 들어갈 수 있다.
 */
export interface LimitEntry {
  /** 하한. `range` 항목(pH)만 값을 갖는다 */
  min: number | null;
  /** 상한 */
  max: number | null;
}

export type LimitSheets = Partial<
  Record<RegionGrade, Partial<Record<DischargeScale, Partial<Record<MeasurementItemCode, LimitEntry>>>>>
>;

/**
 * 사업장의 **규제 관련 사실관계**.
 *
 * 처음에는 두 축뿐이었다(지역구분·배출량 규모) — 기준치표를 고르는 데 그 둘만 필요했기
 * 때문이다. **이름은 그때의 것이고 지금은 사실관계 전체를 담는다**
 * `[사용자 요청 2026-09-28: 설정 재설계 검토]`.
 *
 * **배출량은 구간이 아니라 원시 값이 정본이다.** `dailyWastewaterM3`가 있으면
 * `dischargeScale`은 거기서 파생된다(`scaleFromDailyFlow`) — 구간 경계는 법이 정하는 것이라
 * 바뀔 수 있고, 구간만 저장해 두면 경계가 바뀔 때 **사업장 데이터를 전부 다시 분류해야 한다.**
 * 원시 값을 모르는 동안에는 구간을 직접 고른다(기존 동작 그대로).
 */
export interface SiteClassification {
  regionGrade: RegionGrade | null;
  dischargeScale: DischargeScale | null;
  /** 1일 폐수배출량(㎥). 허가량이 아니라 **실제 배출량**이다 */
  dailyWastewaterM3: number | null;
  /** 하천 직접방류와 공공처리시설 유입은 **적용되는 법이 다르다** `[공정자료 p.11]` */
  dischargeRoute: DischargeRoute | null;
  /**
   * 처리수 일부를 제조공정에 재이용하는가 `[사용자 결정 2026-09-29: 재이용 (가)]`. `null`은 **모름**이다 —
   * «없음»으로 두면 확인하지 않은 사업장이 재이용이 없다고 주장하게 된다.
   */
  reuse: ReuseStatus | null;
  /** 재이용량 일평균(㎥/일). 일부 재이용일 때만 뜻이 있다. 모르면 `null` */
  reuseDailyM3: number | null;
}

export type ClassificationBySite = Record<string, SiteClassification>;

/** 아무것도 모르는 사업장 — 모든 축이 `null`이다. 한 곳에 두어 필드가 늘 때 빠뜨리지 않게 한다 */
export const EMPTY_CLASSIFICATION: SiteClassification = {
  regionGrade: null,
  dischargeScale: null,
  dailyWastewaterM3: null,
  dischargeRoute: null,
  reuse: null,
  reuseDailyM3: null,
};

const isRegion = (v: unknown): v is RegionGrade =>
  typeof v === 'string' && (REGION_GRADES as readonly string[]).includes(v);
const isScale = (v: unknown): v is DischargeScale =>
  typeof v === 'string' && (DISCHARGE_SCALES as readonly string[]).includes(v);
const isCode = (v: unknown): v is MeasurementItemCode =>
  typeof v === 'string' && v in MEASUREMENT_ITEMS;
const isRoute = (v: unknown): v is DischargeRoute =>
  typeof v === 'string' && (DISCHARGE_ROUTES as readonly string[]).includes(v);
const isReuse = (v: unknown): v is ReuseStatus =>
  typeof v === 'string' && (REUSE_STATUSES as readonly string[]).includes(v);
/** 0 이상의 유한수만 받는다 — 음수 배출량·재이용량은 없는 값이다 */
const nonNegative = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;

/** 배출량이 있으면 구간은 거기서 나온다 — 저장된 구간이 옛 값이어도 원시 값이 이긴다 */
function scaleOf(flow: number | null, stored: unknown): DischargeScale | null {
  if (flow !== null) return scaleFromDailyFlow(flow);
  return isScale(stored) ? stored : null;
}

/**
 * 1일 폐수배출량(㎥) → 규모 구간 `[공정자료 p.11]`.
 *
 * **경계값은 위 구간에 넣는다** — 정확히 2,000㎥면 `2,000㎥ 이상`이다. 법령 표기가
 * `2,000㎥ 이상`이라 그 낱말이 이미 경계를 포함한다.
 */
export function scaleFromDailyFlow(m3: number): DischargeScale {
  if (m3 >= 2000) return '2,000㎥ 이상';
  if (m3 >= 700) return '700~2,000㎥';
  if (m3 >= 200) return '200~700㎥';
  return '200㎥ 미만';
}

/**
 * 한 항목의 값이 쓸 수 있는가.
 *
 * **구조만 본다.** 법정 값의 옳고 그름은 판단하지 않는다(`README` §3.1) — 우리가 "이 값은
 * 법에 안 맞습니다"라고 말할 근거가 없다. 대신 **화면이 깨지는 입력**을 막는다: 뒤집힌 범위,
 * 센서 측정 범위 밖의 값, 숫자가 아닌 것.
 */
export function validEntry(code: MeasurementItemCode, entry: LimitEntry): boolean {
  const { min, max } = entry;
  const kind = LIMIT_INPUT_KIND[code];
  if (!kind) return false;

  /*
   * `range`는 둘 다 있어야 하고, `max`형은 상한이 있어야 하며 하한을 갖지 않는다.
   *
   * **상한이 없는 `max`형을 막는 것이 요점이다.** 값이 하나도 없는 기준을 저장하면
   * `resolveLimitTable`이 그것을 "판정 가능"으로 표시하고, `isOverLimit`은 비교할 경계가
   * 없어 **모든 값에 `false`(기준 안)를 돌려준다** — 기준을 모르는 항목이 안전한 항목으로
   * 둔갑한다. 테스트가 실제로 이 경로를 잡았다.
   */
  if (kind === 'range' && (min === null || max === null)) return false;
  if (kind === 'max' && (max === null || min !== null)) return false;

  const item = MEASUREMENT_ITEMS[code];
  const [low, high] = item.range;
  for (const value of [min, max]) {
    if (value === null) continue;
    if (!Number.isFinite(value)) return false;
    /* 측정 범위 밖의 기준은 센서가 절대 도달하지 못한다 — 초과가 영원히 안 뜨거나 늘 뜬다 */
    if (value < low || value > high) return false;
  }
  if (min !== null && max !== null && min >= max) return false;
  return true;
}

/**
 * 저장값을 걸러 낸다. **모르는 키는 버린다** — 옛 판이나 손으로 고친 값이 섞여도 화면이
 * 그것을 근거로 초과를 판정하면 안 된다.
 */
export function parseSheets(raw: unknown): LimitSheets | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const out: LimitSheets = {};

  for (const [region, byScale] of Object.entries(raw)) {
    if (!isRegion(region) || typeof byScale !== 'object' || byScale === null) continue;
    for (const [scale, byCode] of Object.entries(byScale)) {
      if (!isScale(scale) || typeof byCode !== 'object' || byCode === null) continue;
      for (const [code, entry] of Object.entries(byCode)) {
        if (!isCode(code) || typeof entry !== 'object' || entry === null) continue;
        const candidate: LimitEntry = {
          min: typeof (entry as LimitEntry).min === 'number' ? (entry as LimitEntry).min : null,
          max: typeof (entry as LimitEntry).max === 'number' ? (entry as LimitEntry).max : null,
        };
        if (!validEntry(code, candidate)) continue;
        out[region] ??= {};
        out[region]![scale] ??= {};
        out[region]![scale]![code] = candidate;
      }
    }
  }
  return out;
}

export function parseClassification(raw: unknown): ClassificationBySite | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const out: ClassificationBySite = {};

  for (const [siteId, value] of Object.entries(raw)) {
    if (typeof siteId !== 'string' || typeof value !== 'object' || value === null) continue;
    const { regionGrade, dischargeScale, dailyWastewaterM3, dischargeRoute, reuse, reuseDailyM3 } =
      value as Partial<SiteClassification>;
    const flow = nonNegative(dailyWastewaterM3);
    const reuseStatus = isReuse(reuse) ? reuse : null;
    out[siteId] = {
      regionGrade: isRegion(regionGrade) ? regionGrade : null,
      dischargeScale: scaleOf(flow, dischargeScale),
      dailyWastewaterM3: flow,
      dischargeRoute: isRoute(dischargeRoute) ? dischargeRoute : null,
      reuse: reuseStatus,
      /* 재이용이 없거나 모르면 양도 없다 — 남은 숫자가 «일부 재이용»처럼 읽힌다 */
      reuseDailyM3: reuseStatus === 'partial' ? nonNegative(reuseDailyM3) : null,
    };
  }
  return out;
}
