'use client';

import { SegmentedControl } from '@/shared/ui/segmented-control';
import { CATEGORY_OPTIONS, PERIOD_OPTIONS } from '../config/constants';
import type { MeasurementFilter } from '../model/use-measurement-filter';
import styles from './measurement-filter-bar.module.scss';

export function MeasurementFilterBar({ filter }: { filter: MeasurementFilter }) {
  return (
    <div className={styles.bar}>
      <SegmentedControl
        ariaLabel="계측 항목 범위"
        options={CATEGORY_OPTIONS}
        value={filter.category}
        onChange={filter.setCategory}
      />
      <SegmentedControl
        ariaLabel="조회 기간"
        options={PERIOD_OPTIONS}
        value={filter.period}
        onChange={filter.setPeriod}
      />
    </div>
  );
}
