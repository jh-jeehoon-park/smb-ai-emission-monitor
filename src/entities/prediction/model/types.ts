import type { ForecastSeriesCode, ForecastTargetCode } from '../config/constants';

/** 발표자료 p.17의 경향성 3분류. 사업계획서 p.65는 '상승/하강/안정'으로 표기가 다르다(INC-05) */
export type Trend = 'rising' | 'steady' | 'falling';

export const TREND_LABELS: Record<Trend, string> = {
  rising: '상승',
  steady: '유지',
  falling: '하락',
};

export interface ForecastPoint {
  t: string;
  /** 실측 구간에만 값이 있다. 예측 구간은 null */
  actual: number | null;
  /** 예측 구간에만 값이 있다 */
  forecast: number | null;
  /** 신뢰구간 하한/상한. 신뢰수준은 원문에 없다 */
  lower: number | null;
  upper: number | null;
}

export interface TrendEstimate {
  label: string;
  /** 넓은 string이면 소비처가 단언으로 되좁혀야 한다(R2). 생성 출처가 유니온이므로 여기서 좁힌다 */
  code: ForecastTargetCode;
  trend: Trend;
  /**
   * 추정값. 직접 계측이 아니라 AI 추정이다.
   *
   * **통신 두절이면 `null`** — 산출이 중단됐다. 0을 채우면 "0 mg/L로 추정했다"가 되고,
   * 소비처가 `online` 플래그를 잊으면 그 0이 그대로 화면에 나온다(E4).
   */
  value: number | null;
  unit: string;
  /** 표시 소수 자릿수. 값과 함께 다녀야 카드가 항목 프로파일을 되찾아 오지 않는다(E1) */
  decimals: number;
  /** 결정계수. 원문이 TN·TP만 제시해(p.27) TOC는 null이다 */
  r2: number | null;
}

export interface ForecastSummary {
  /**
   * 계열 코드. 소비처가 `targetLabel`을 잘라 코드를 되찾지 않게 함께 싣는다.
   * 오염도 3항목에 **유량**이 더해진다 `[INC-95 판정]` — 경향 카드(`trends`)는 오염도 전용이라
   * 좁은 `ForecastTargetCode`를 그대로 쓴다.
   */
  code: ForecastSeriesCode;
  targetLabel: string;
  unit: string;
  /** 표시 소수 자릿수. 값과 함께 다녀야 차트·표·툴팁이 같은 자릿수로 반올림한다(E1) */
  decimals: number;
  horizonHours: number;
  /** 통신 두절이면 예측도 산출되지 않는다 */
  online: boolean;
  /** AI 산출 시각 — 값과 함께 노출한다(E3) */
  computedAtIso: string;
  /** 산출 대상 기간 (E3) */
  inputWindowLabel: string;
  modelLabel: string;
  points: ForecastPoint[];
  trends: TrendEstimate[];
}
