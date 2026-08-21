import {
  DISCHARGE_LIMITS,
  type DischargeLimitTable,
} from '@/shared/config/discharge-limits';
import type { MeasurementItemCode } from '@/shared/config/measurement';
import type { Reading } from '@/entities/measurement';
import { LIMIT_ZONE_RATIO } from '../config/constants';

export interface LimitZone {
  /** y축 범위. 기준이 화면 밖으로 나가면 기준에 얼마나 가까운지가 읽히지 않는다 */
  domain: [number, number];
  /** **한쪽만 있을 수 있다.** TOC·TN·TP는 상한만 받는다(`LIMIT_INPUT_KIND`) */
  min: number | null;
  max: number | null;
}

/**
 * 기준에 맞춘 y축 범위.
 *
 * **y축을 데이터가 아니라 기준에 맞춘다.** `dataMin~dataMax`로 두면 값이 기준 한가운데
 * 있어도 선이 위아래로 가득 차 위태로워 보이고, 기준에 가까운 사업장과 구분되지 않는다.
 * 기준을 축에 넣으면 같은 항목의 모든 사업장이 같은 눈금을 써서 서로 비교된다.
 *
 * 기준을 넘은 값이 있으면 그 값까지 축을 넓힌다 — 넘은 부분이 잘리면 초과를 못 본다.
 *
 * **한쪽만 있는 기준도 받는다.** 예전에는 `min`·`max`를 둘 다 요구해서, 사용자가 TOC 상한을
 * 넣어도 이 함수가 `null`을 돌려주고 화면은 계속 미확정으로 적었다. 그때 여백은 기준 폭에
 * 비례했는데 한쪽만 있으면 폭이 0이므로 **기준값 자체에 비례**한 여백을 쓴다 — 어느 쪽이든
 * 데이터에 의존하지 않아 같은 항목의 모든 사업장이 같은 눈금을 쓴다는 성질이 유지된다.
 */
export function limitZone(
  code: MeasurementItemCode,
  values: readonly Reading[],
  table: DischargeLimitTable = DISCHARGE_LIMITS,
): LimitZone | null {
  const limit = table[code];
  if (!limit || limit.unavailableReason !== null) return null;
  if (limit.min === null && limit.max === null) return null;

  /* 한쪽만 있으면 그 값이 위아래 앵커를 겸한다 */
  const lowAnchor = limit.min ?? limit.max!;
  const highAnchor = limit.max ?? limit.min!;

  const numbers = values.filter((v): v is number => v !== null);
  const span = highAnchor - lowAnchor;
  const pad = (span || Math.abs(highAnchor)) * LIMIT_ZONE_RATIO;
  const low = Math.min(lowAnchor, ...numbers) - pad;
  const high = Math.max(highAnchor, ...numbers) + pad;

  return { domain: [low, high], min: limit.min, max: limit.max };
}
