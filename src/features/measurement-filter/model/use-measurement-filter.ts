'use client';

import { useQueryState } from '@/shared/lib/use-query-state';
import {
  EQUIPMENT_SERIES_CODES,
  WATER_SERIES_CODES,
  type SeriesCode,
} from '@/entities/measurement';
import {
  CATEGORY_QUERY_KEY,
  DEFAULT_CATEGORY,
  DEFAULT_PERIOD,
  PERIOD_HOURS,
  PERIOD_QUERY_KEY,
  SERIES_CATEGORIES,
  type PeriodHours,
  type SeriesCategory,
} from '../config/constants';

const CODES_BY_CATEGORY: Record<SeriesCategory, SeriesCode[]> = {
  water: WATER_SERIES_CODES,
  equipment: EQUIPMENT_SERIES_CODES,
  all: [...WATER_SERIES_CODES, ...EQUIPMENT_SERIES_CODES],
};

export interface MeasurementFilter {
  period: PeriodHours;
  setPeriod: (next: PeriodHours) => void;
  hours: number;
  category: SeriesCategory;
  setCategory: (next: SeriesCategory) => void;
  codes: SeriesCode[];
}

export function useMeasurementFilter(): MeasurementFilter {
  const [period, setPeriod] = useQueryState(PERIOD_QUERY_KEY, PERIOD_HOURS, DEFAULT_PERIOD);
  const [category, setCategory] = useQueryState(
    CATEGORY_QUERY_KEY,
    SERIES_CATEGORIES,
    DEFAULT_CATEGORY,
  );

  return {
    period,
    setPeriod,
    hours: Number(period),
    category,
    setCategory,
    codes: CODES_BY_CATEGORY[category],
  };
}
