import { COLLECTION_INTERVAL_MINUTES, HISTORY_WINDOW_HOURS } from '@/shared/config/measurement';
import type { SeriesCode } from '../model/types';

/**
 * 시계열이 실제로 존재하는 항목만. TN·TP는 센서가 없어 계측 시계열이 없고
 * AI 추정(Soft Sensing) 대상이라 예측 화면에서 다룬다.
 */
export const WATER_SERIES_CODES: SeriesCode[] = [
  'pH',
  'DO',
  'EC',
  'turbidity',
  'TOC',
  'NO3N',
  'temperature',
  'chromaticity',
];

export const EQUIPMENT_SERIES_CODES: SeriesCode[] = ['current', 'power', 'inflow', 'flow'];

/**
 * 계열이 실제로 있는 항목 전부. **긍정 목록이다.**
 *
 * 한때 `code !== 'vibration' && code !== 'TN' && code !== 'TP'`처럼 부정 목록이었는데,
 * 계열 없는 항목을 새로 등재하면(`inflow`·`outflow`) 그 술어가 **참을 돌려주어**
 * `MeasurementPoint`를 없는 키로 인덱싱하고 `undefined`가 조용히 흐른다. 긍정 목록은
 * 새 항목이 기본적으로 제외되므로 같은 실수가 되풀이되지 않는다.
 */
/**
 * 배출 데이터에만 있는 계열 — 지금은 **수위 하나**다 `[사용자 요청 2026-08-28]`.
 *
 * **`EQUIPMENT_SERIES_CODES`에 넣지 않는다.** 그 배열이 시계열 화면의 `설비`·`전체` 필터를
 * 만들므로, 넣으면 요청하지 않은 화면이 함께 바뀐다(**A2**). 계열은 여기서 갖고, 계열의
 * 존재만 아래 `SERIES_CODES`에 합류시킨다 — `isSeriesCode`와 fixture 생성 루프가 그것을 읽는다.
 *
 * 같은 대분류의 유량 2종(`FLOW_SERIES_CODES`)이 여기 없는 것은 그쪽이 **이미 설비 필터에
 * 실려 있어서**다. 대분류를 코드에서 다시 그리는 배열이 아니라, **아직 자리가 없는 것**을
 * 담는 배열이다.
 */
export const DISCHARGE_SERIES_CODES: SeriesCode[] = ['level'];

export const SERIES_CODES: SeriesCode[] = [
  ...WATER_SERIES_CODES,
  ...EQUIPMENT_SERIES_CODES,
  ...DISCHARGE_SERIES_CODES,
];

/**
 * 유량 2종 — **들어온 양과 나간 양**. 화면은 여기에 **차**(유입−유출) 칸을 하나 더 붙인다.
 *
 * 나란히 두는 것이 목적이다 — 그 차이가 방류 의심의 단서다(`[TBD-46]`). 증발·슬러지로
 * 설명되는 범위를 벗어나면(유출 > 유입) 처리 없이 내보낸 정황이 된다.
 */
export const FLOW_SERIES_CODES: SeriesCode[] = ['inflow', 'flow'];

/**
 * 집계 단위.
 *
 * **일·월이 없다.** 시연 데이터의 축적 구간이 24시간이다 `[원문 p.65]` — 일 단위로 묶으면
 * 한 행뿐이고 월은 만들 수가 없다. 없는 기간을 지어내면 리포트가 관측이 아니라 창작이 된다
 * (비용 절감 현황의 월별 추이를 빈 상태로 둔 것과 같은 이유다).
 *
 * 서버가 생겨 이력이 쌓이면 여기에 `'1d'`·`'1mo'`를 더한다 — 표와 CSV는 그대로 돈다.
 */
export const BUCKET_UNITS = ['raw', '1h'] as const;
export type BucketUnit = (typeof BUCKET_UNITS)[number];
export const DEFAULT_BUCKET: BucketUnit = '1h';

export const BUCKET_MINUTES: Record<BucketUnit, number> = {
  raw: COLLECTION_INTERVAL_MINUTES,
  '1h': 60,
};

export const BUCKET_OPTIONS: { value: BucketUnit; label: string }[] = [
  { value: 'raw', label: `${COLLECTION_INTERVAL_MINUTES}분` },
  { value: '1h', label: '1시간' },
];

/**
 * 구간마다 어느 통계를 보일지.
 *
 * **한 번에 하나만 보인다.** 11항목 × 3통계 = 33열은 표가 아니라 벽이다 — 센서 리포트는
 * 보통 구간을 행으로 두고 통계 하나를 고르게 한다.
 */
export const BUCKET_STATS = ['avg', 'min', 'max'] as const;
export type BucketStat = (typeof BUCKET_STATS)[number];
export const DEFAULT_STAT: BucketStat = 'avg';

export const STAT_OPTIONS: { value: BucketStat; label: string }[] = [
  { value: 'avg', label: '평균' },
  { value: 'min', label: '최소' },
  { value: 'max', label: '최대' },
];

export const STAT_LABELS: Record<BucketStat, string> = {
  avg: '평균',
  min: '최소',
  max: '최대',
};

/** 축적 구간을 화면이 근거로 적는다 — 왜 일·월 집계가 없는지 말할 때 쓴다 */
export const WINDOW_HOURS = HISTORY_WINDOW_HOURS;
