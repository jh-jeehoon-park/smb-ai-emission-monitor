/**
 * 검증 원천. **둘이며 성격이 다르다.**
 *
 * - `lab` 위탁 실험실 수분석 — 시료를 채취해 표준분석법으로 분석한다 `[공정자료 p.13]`.
 *   본 과제의 검증 계획은 **월 2회** `[원문 p.38]`이며, 이는 법정 자가측정 주기
 *   (월 1회~분기 1회 `[공정자료 p.13]`)와 **다른 것**이다.
 * - `analyzer` TN/TP 분석기 — **대표 실증사업장 1개소에만** 설치한다 `[원문 발표 p.17]`.
 *
 * 둘을 한 이름으로 묶으면 "모든 사업장에 분석기가 있다"로 읽힌다.
 */
export type AnalysisSource = 'lab' | 'analyzer';

/**
 * 수분석 항목.
 *
 * `TOC`·`TN`·`TP`는 AI 추정 대상이라 대조할 수 있다. **`SS`는 우리 계측에도 추정에도 없고**
 * (탁도는 물리 지표일 뿐 SS가 아니다), `COD`는 TOC로 대체되어 현재 폐지됐다
 * `[공정자료 p.12·16]`. 둘은 실측만 싣고 AI 열을 비운다 — 빼 버리면 법정 점검 5항목 중
 * 우리가 못 보는 항목이 있다는 사실이 화면에서 사라진다 `[공정자료 p.5·19]`.
 */
export type AnalysisItemCode = 'TOC' | 'TN' | 'TP' | 'SS' | 'COD';

/** 한 회차의 시료 하나 — 성적서는 시각별로 채취한다 `[데이터셋 Non_TMS_sites/05]` */
export interface AnalysisSample {
  timeIso: string;
  /** 접수번호. 성적서가 시료마다 매긴다 */
  receiptNo: string;
  values: Partial<Record<AnalysisItemCode, number>>;
}

export interface AnalysisRound {
  id: string;
  siteId: string;
  source: AnalysisSource;
  /** 발급번호 */
  issueNo: string;
  /** 접수일 */
  receivedIso: string;
  /** 시험기간 표기 — 성적서가 그대로 싣는다 */
  testPeriodLabel: string;
  /** 분석 기관 */
  lab: string;
  samples: AnalysisSample[];
}

/** 항목별 대조 결과. AI 추정이 없는 항목은 `estimated`가 `null`이다 */
export interface ComparisonRow {
  code: AnalysisItemCode;
  /** 회차 평균 실측값 */
  measured: number | null;
  /** 같은 시각 AI 추정 평균 */
  estimated: number | null;
  /** 실측 대비 오차. 한쪽이라도 없으면 `null` */
  error: number | null;
  /** AI 추정 대상이 아닌 이유. 대조 가능하면 `null` */
  unavailableReason: string | null;
}

/** 검증 지표 — 원문이 지정한 두 가지 `[원문 p.38]` */
export interface ValidationMetrics {
  /** 결정계수. 표본이 모자라면 `null` — 지어내지 않는다 */
  r2: number | null;
  /** 평균절대오차 */
  mae: number | null;
  /** 계산에 쓴 표본 수. 값과 함께 다녀야 신뢰도를 읽을 수 있다(E3) */
  sampleCount: number;
}
