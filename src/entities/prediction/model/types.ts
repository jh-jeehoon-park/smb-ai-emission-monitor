import type { ForecastSeriesCode, ForecastTargetCode } from '../config/constants';

/** 발표자료 p.17의 경향성 3분류. 사업계획서 p.65는 '상승/하강/안정'으로 표기가 다르다(INC-05) */
export type Trend = 'rising' | 'steady' | 'falling';

export const TREND_LABELS: Record<Trend, string> = {
  rising: '상승',
  steady: '유지',
  falling: '하락',
};

/**
 * 계열의 한 점.
 *
 * **예측값과 신뢰구간이 없다** `[회의 2026-08-20]` `[INC-109]`. TN·TP로 6시간을 예측하는 것이
 * 아니라 TN·TP는 소프트 센싱으로 **지금 값을 추정**하는 항목이고, 6시간 예측은 실제로 재는
 * 항목으로 이야기해야 한다는 정리다. 그 대상이 아직 정해지지 않아(`[TBD-52]`) 예측 구간을
 * 그리지 않는다 — 없는 데이터를 곡선으로 그리면 산출된 예측처럼 읽힌다(E3).
 */
export interface ForecastPoint {
  t: string;
  /** 그 시각의 값. **`null`은 결측**이며 0으로 채우지 않는다(E4) */
  value: number | null;
}

/**
 * 계열의 값이 어디서 왔는가. 화면이 실측과 추정을 같은 선으로 그리면 안 된다(E3).
 *
 * `measured` 직접 계측 — TOC·유량 `[원문 p.55]`
 * `softSensed` 소프트 센싱 추정 — TN·TP는 센서가 없다 `[원문 발표 p.17]` `[회의 2026-08-20]`
 */
export type SeriesOrigin = 'measured' | 'softSensed';

export const SERIES_ORIGIN_LABELS: Record<SeriesOrigin, string> = {
  measured: '직접 계측',
  softSensed: '소프트 센싱 추정',
};

export interface TrendEstimate {
  label: string;
  /** 넓은 string이면 소비처가 단언으로 되좁혀야 한다(R2). 생성 출처가 유니온이므로 여기서 좁힌다 */
  code: ForecastTargetCode;
  /**
   * 계열이 오르는가 내리는가.
   *
   * **`null`은 판정하지 않았다는 뜻이다** — 통신이 두절되면 기울기를 낼 표본이 없다.
   * 예전에는 시나리오 세기로만 정해서 두절된 사업장에도 `상승` 화살표가 찍혔고, 차트가
   * 내려가는데 카드가 `상승`이라 말하는 일이 있었다.
   */
  trend: Trend | null;
  /** 값이 계측인지 추정인지. 카드가 그것을 적어야 추정값이 계측처럼 읽히지 않는다(E3) */
  origin: SeriesOrigin;
  /**
   * 추정값.
   *
   * **화면은 이 숫자를 농도로 보이지 않는다** `[회의 2026-08-20]` — 소프트 센싱으로는 절대값의
   * 정확도를 맞추기 어렵다는 판단이라 **기준 대비 높다/낮다**만 낸다. 값은 그 비교에 쓴다.
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
  /** 계열의 값이 계측인지 소프트 센싱 추정인지 */
  origin: SeriesOrigin;
  /** 통신 두절이면 추정도 산출되지 않는다 */
  online: boolean;
  /** AI 산출 시각 — 값과 함께 노출한다(E3) */
  computedAtIso: string;
  /** 산출 대상 기간 (E3) */
  inputWindowLabel: string;
  modelLabel: string;
  points: ForecastPoint[];
  trends: TrendEstimate[];
}
