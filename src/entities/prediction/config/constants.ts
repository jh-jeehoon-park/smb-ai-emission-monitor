export const FORECAST_TARGET_CODES = ['TOC', 'TN', 'TP'] as const;
export type ForecastTargetCode = (typeof FORECAST_TARGET_CODES)[number];

export interface ForecastTargetProfile {
  code: ForecastTargetCode;
  label: string;
  unit: string;
  decimals: number;
  /** 결정계수. 사업계획서 p.31 검증 수준 */
  r2: number;
  /** 경향 판정에 쓰는 항목별 보정 — 항목마다 반응 속도가 다르다 */
  trendOffset: number;
  base: number;
  amplitude: number;
  noise: number;
  /** 이상 상황 구간에서 실측이 밀려 올라가는 폭 */
  rise: number;
  /** 예측 구간의 상승 이득 */
  forecastGain: number;
  /** 신뢰구간 시작 폭과 시간당 증가분 */
  spreadBase: number;
  spreadStep: number;
}

/**
 * TN·TP는 직접 계측 센서가 없어 AI 추정 대상이다(발표자료 p.17).
 * 값의 크기가 항목마다 자릿수 단위로 달라 시연 계열도 항목별 프로파일로 생성한다.
 */
export const FORECAST_TARGETS: Record<ForecastTargetCode, ForecastTargetProfile> = {
  TOC: {
    code: 'TOC',
    label: '총유기탄소',
    unit: 'mg/L',
    decimals: 1,
    r2: 0.88,
    trendOffset: 0.1,
    base: 25.5,
    amplitude: 2.4,
    noise: 1.6,
    rise: 16,
    forecastGain: 4.1,
    spreadBase: 1.4,
    spreadStep: 0.72,
  },
  TN: {
    code: 'TN',
    label: '총질소',
    unit: 'mg/L',
    decimals: 1,
    r2: 0.86,
    trendOffset: 0.05,
    base: 16,
    amplitude: 1.5,
    noise: 0.9,
    rise: 8,
    forecastGain: 2,
    spreadBase: 0.9,
    spreadStep: 0.4,
  },
  TP: {
    code: 'TP',
    label: '총인',
    unit: 'mg/L',
    decimals: 2,
    r2: 0.78,
    trendOffset: -0.15,
    base: 1.5,
    amplitude: 0.18,
    noise: 0.12,
    rise: 0.6,
    forecastGain: 0.18,
    spreadBase: 0.1,
    spreadStep: 0.05,
  },
};
