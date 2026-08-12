export const PERIOD_QUERY_KEY = 'hours';
export const CATEGORY_QUERY_KEY = 'cat';

/** 축적 구간 24시간(사업계획서 p.65) 안에서 나눠 본다 */
export const PERIOD_HOURS = ['6', '12', '24'] as const;
export type PeriodHours = (typeof PERIOD_HOURS)[number];
export const DEFAULT_PERIOD: PeriodHours = '24';

export const PERIOD_OPTIONS = PERIOD_HOURS.map((hours) => ({
  value: hours,
  label: `${hours}시간`,
}));

export const SERIES_CATEGORIES = ['water', 'equipment', 'all'] as const;
export type SeriesCategory = (typeof SERIES_CATEGORIES)[number];
export const DEFAULT_CATEGORY: SeriesCategory = 'water';

export const CATEGORY_OPTIONS: { value: SeriesCategory; label: string }[] = [
  { value: 'water', label: '수질 8종' },
  { value: 'equipment', label: '설비 3종' },
  { value: 'all', label: '전체 11종' },
];
