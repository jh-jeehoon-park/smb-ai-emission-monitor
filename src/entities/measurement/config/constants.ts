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

export const EQUIPMENT_SERIES_CODES: SeriesCode[] = ['current', 'power', 'flow'];

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
