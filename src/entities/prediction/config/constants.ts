import { PROVISIONAL_DECIMALS } from '@/shared/config/provisional';

export const FORECAST_TARGET_CODES = ['TOC', 'TN', 'TP'] as const;
export type ForecastTargetCode = (typeof FORECAST_TARGET_CODES)[number];

export interface ForecastTargetProfile {
  code: ForecastTargetCode;
  label: string;
  unit: string;
  decimals: number;
  /**
   * 결정계수. 원문이 값을 준 항목만 갖는다.
   * TOC는 원문에 R²가 없어 null이다 — 지어내면 검증된 성능처럼 읽힌다(E3).
   */
  r2: number | null;
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
 * TN·TP는 AI 추정 대상으로 다룬다(발표자료 p.17). 센서 유무 자체는 원문이 확정하지 않았다(TBD-21).
 * 값의 크기가 항목마다 자릿수 단위로 달라 시연 계열도 항목별 프로파일로 생성한다.
 *
 * 소수 자릿수는 여기서 정하지 않고 PROVISIONAL_DECIMALS에서 가져온다 — 같은 항목의 자릿수가
 * 계측 화면과 예측 화면에서 갈리면 한 값이 화면마다 다르게 반올림된다(E1).
 */
export const FORECAST_TARGETS: Record<ForecastTargetCode, ForecastTargetProfile> = {
  TOC: {
    code: 'TOC',
    label: '총유기탄소',
    unit: 'mg/L',
    decimals: PROVISIONAL_DECIMALS.TOC,
    // 원문은 TN·TP의 R²만 제시한다. TOC 값은 없다.
    r2: null,
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
    decimals: PROVISIONAL_DECIMALS.TN,
    // 사업계획서 p.27 현재 검증 수준. 원문이 0.78~0.89(p.31)·정확도 88.6%(p.67)로도 적어 갈린다(INC-20·21)
    r2: 0.886,
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
    decimals: PROVISIONAL_DECIMALS.TP,
    // 사업계획서 p.27 현재 검증 수준 (INC-20·21)
    r2: 0.782,
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
