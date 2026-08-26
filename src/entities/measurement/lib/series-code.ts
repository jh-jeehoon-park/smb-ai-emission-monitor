import type { MeasurementItemCode } from '@/shared/config/measurement';
import { SERIES_CODES } from '../config/constants';
import type { SeriesCode } from '../model/types';

/**
 * 그 항목에 **계열 데이터가 있는가.**
 *
 * 사전(`MEASUREMENT_ITEMS`)에는 계열 없는 항목도 있다 — 진동은 사양이 없고(`[TBD-49]`)
 * 유입·유출은 채널이 없다(`[TBD-52]`). 둘 다 화면이 값 대신 상태를 적는다.
 *
 * 이것을 거치지 않고 `code as SeriesCode`로 캐스팅하면 `MeasurementPoint`를 없는 키로
 * 인덱싱해 `undefined`가 흐른다 — 화면에는 빈 값으로 보여 원인을 찾기 어렵다.
 */
export const isSeriesCode = (code: MeasurementItemCode): code is SeriesCode & MeasurementItemCode =>
  (SERIES_CODES as MeasurementItemCode[]).includes(code);
