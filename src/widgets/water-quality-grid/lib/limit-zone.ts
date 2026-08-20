import { DISCHARGE_LIMITS } from '@/shared/config/discharge-limits';
import type { MeasurementItemCode } from '@/shared/config/measurement';
import type { Reading } from '@/entities/measurement';
import { LIMIT_ZONE_RATIO } from '../config/constants';

export interface LimitZone {
  /** y축 범위. 기준이 화면 밖으로 나가면 기준에 얼마나 가까운지가 읽히지 않는다 */
  domain: [number, number];
  min: number;
  max: number;
}

/**
 * 기준에 맞춘 y축 범위.
 *
 * **y축을 데이터가 아니라 기준에 맞춘다.** `dataMin~dataMax`로 두면 값이 기준 한가운데
 * 있어도 선이 위아래로 가득 차 위태로워 보이고, 기준에 가까운 사업장과 구분되지 않는다.
 * 기준을 축에 넣으면 같은 항목의 모든 사업장이 같은 눈금을 써서 서로 비교된다.
 *
 * 기준을 넘은 값이 있으면 그 값까지 축을 넓힌다 — 넘은 부분이 잘리면 초과를 못 본다.
 */
export function limitZone(code: MeasurementItemCode, values: readonly Reading[]): LimitZone | null {
  const limit = DISCHARGE_LIMITS[code];
  if (!limit || limit.min === null || limit.max === null) return null;

  const numbers = values.filter((v): v is number => v !== null);
  const pad = (limit.max - limit.min) * LIMIT_ZONE_RATIO;
  const low = Math.min(limit.min, ...numbers) - pad;
  const high = Math.max(limit.max, ...numbers) + pad;

  return { domain: [low, high], min: limit.min, max: limit.max };
}
