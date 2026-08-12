/** 결측·통신두절은 null이다. 0으로 채우지 않는다(E4). */
export type Reading = number | null;

export interface MeasurementPoint {
  t: string;
  pH: Reading;
  EC: Reading;
  turbidity: Reading;
  DO: Reading;
  temperature: Reading;
  chromaticity: Reading;
  NO3N: Reading;
  TOC: Reading;
  current: Reading;
  power: Reading;
  flow: Reading;
}

/** 실제로 계측되는 항목만. TN·TP는 센서가 없어 여기 들어가지 않는다(AI 추정 대상) */
export type SeriesCode = Exclude<keyof MeasurementPoint, 't'>;

