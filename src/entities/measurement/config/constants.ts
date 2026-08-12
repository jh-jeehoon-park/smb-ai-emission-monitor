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
