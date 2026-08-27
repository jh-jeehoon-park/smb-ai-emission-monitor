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
  inflow: Reading;
  flow: Reading;
}

/** 실제로 계측되는 항목만. TN·TP는 센서가 없어 여기 들어가지 않는다(AI 추정 대상) */
export type SeriesCode = Exclude<keyof MeasurementPoint, 't'>;

/**
 * 계열이 어디서 왔는가.
 *
 * **셋을 가른다.** `pending`은 아직 모르는 것이고 `fallback`은 확인된 미도달이다 — 둘을 같게
 * 적으면 확인 전에 "서버 미연결"이라고 단정하게 된다. 결측을 0으로 그리지 않는 것과 같은
 * 이유다(E4).
 */
export type TelemetryStatus = 'pending' | 'live' | 'fallback';

