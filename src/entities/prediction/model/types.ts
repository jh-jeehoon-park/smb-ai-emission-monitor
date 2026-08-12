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
  code: string;
  trend: Trend;
  /** 추정값. 직접 계측이 아니라 AI 추정이다 */
  value: number;
  unit: string;
  /** 결정계수. 사업계획서 p.31 검증 수준 */
  r2: number;
}

export interface ForecastSummary {
  targetLabel: string;
  unit: string;
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
