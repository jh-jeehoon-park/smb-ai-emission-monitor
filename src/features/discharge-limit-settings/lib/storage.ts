import {
  DISCHARGE_SCALES,
  LIMIT_INPUT_KIND,
  REGION_GRADES,
  type DischargeScale,
  type RegionGrade,
} from '@/shared/config/discharge-limits';
import { MEASUREMENT_ITEMS, type MeasurementItemCode } from '@/shared/config/measurement';

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

/** 사업장의 두 축. 이것이 없으면 위 표에서 어느 시트를 볼지 정할 수 없다 */
export interface SiteClassification {
  regionGrade: RegionGrade | null;
  dischargeScale: DischargeScale | null;
}

export type ClassificationBySite = Record<string, SiteClassification>;

const isRegion = (v: unknown): v is RegionGrade =>
  typeof v === 'string' && (REGION_GRADES as readonly string[]).includes(v);
const isScale = (v: unknown): v is DischargeScale =>
  typeof v === 'string' && (DISCHARGE_SCALES as readonly string[]).includes(v);
const isCode = (v: unknown): v is MeasurementItemCode =>
  typeof v === 'string' && v in MEASUREMENT_ITEMS;

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
    const { regionGrade, dischargeScale } = value as Partial<SiteClassification>;
    out[siteId] = {
      regionGrade: isRegion(regionGrade) ? regionGrade : null,
      dischargeScale: isScale(dischargeScale) ? dischargeScale : null,
    };
  }
  return out;
}
