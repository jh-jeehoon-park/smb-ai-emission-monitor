import { PROVISIONAL_DECIMALS } from '@/shared/config/provisional';

/**
 * 계열이 덮는 시간. **예측 구간이 아니라 관측 구간이다** `[INC-109]`.
 *
 * 회의가 6시간 예측을 내리게 한 뒤에도 패널 제목 네 곳이 `향후 6시간 예측`으로 남아
 * 있었다 — 그리지 않는 예측을 제목이 주장하는 셈이다(E3·X3). 같은 `6`이지만 뜻이
 * 다르므로 `FORECAST_HORIZON_HOURS`를 재사용하지 않는다.
 */
export const SERIES_WINDOW_HOURS = 6;

/** **오염도** 3항목. 경향 카드 3장과 `전체` 3단 차트가 이 목록으로 정해진다(FR-12) */
export const FORECAST_TARGET_CODES = ['TOC', 'TN', 'TP'] as const;
export type ForecastTargetCode = (typeof FORECAST_TARGET_CODES)[number];

/**
 * 예측 계열 코드 — 오염도 3항목 + **유량**.
 *
 * 유량을 `FORECAST_TARGET_CODES`에 넣지 않는 이유: 그 목록은 **오염도**의 정의이고,
 * 경향 카드 3장·`전체` 3단이 그 목록을 그대로 쓴다. 유량은 수량이라 단위(㎥/day)도
 * 자릿수도 다르고, 원문도 "수질·**수량**"으로 나눠 부른다 `[원문 발표 p.11]`.
 */
export const FLOW_FORECAST_CODE = 'flow';
export type ForecastSeriesCode = ForecastTargetCode | typeof FLOW_FORECAST_CODE;

export interface ForecastTargetProfile {
  code: ForecastSeriesCode;
  label: string;
  unit: string;
  decimals: number;
  /**
   * 결정계수. 원문이 값을 준 항목만 갖는다.
   * TOC는 원문에 R²가 없어 null이다 — 지어내면 검증된 성능처럼 읽힌다(E3).
   */
  r2: number | null;
  /**
   * 사인 파형의 위상(rad). **항목마다 벌려 둔다.**
   *
   * 예전에는 `trendOffset`이 경향 판정에 직접 더해져 항목 차이를 만들었다. 판정을 계열
   * 기울기로 옮기면서 그 축이 죽었고, 파형이 인덱스만의 함수라 **세 항목이 같은 구간에서
   * 같은 방향으로** 움직였다 — 카드 3장이 늘 같은 답을 낸다. 위상을 벌려 항목 차이를
   * 파형 자체에 둔다.
   */
  phase: number;
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
    phase: 0,
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
    /* 2π를 셋으로 나눈 값 — 세 항목이 서로 가장 멀어진다 */
    phase: 2.1,
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
    phase: 4.2,
    base: 1.5,
    amplitude: 0.18,
    noise: 0.12,
    rise: 0.6,
    forecastGain: 0.18,
    spreadBase: 0.1,
    spreadStep: 0.05,
  },
};

/**
 * 유량(수량) 예측 `[원문 발표 p.11 그림]` "1~6시간 후 유량 변화 예측" · `[INC-95 판정]`.
 *
 * **R²가 `null`인 이유가 TOC와 다르다.** TOC는 원문이 값을 안 준 것이고, 유량은
 * **성능 목표 자체가 없다** — `[원문 발표 p.26]`의 AI 성능 목표는 "수질 예측 정확도"뿐이다.
 * 어느 쪽이든 지어내지 않는다(E3).
 *
 * 기저값은 계측 유량과 맞춘다 — 같은 사업장의 같은 항목이 화면마다 다른 크기로 보이면
 * 예측선과 실측선이 서로 다른 것을 그리는 셈이 된다.
 */
export const FLOW_FORECAST: ForecastTargetProfile = {
  code: FLOW_FORECAST_CODE,
  label: '유량',
  unit: 'm³/day',
  decimals: PROVISIONAL_DECIMALS.flow,
  r2: null,
  phase: 1.05,
  base: 412,
  amplitude: 58,
  noise: 26,
  rise: 90,
  forecastGain: 24,
  spreadBase: 18,
  spreadStep: 7.5,
};
