import { PROVISIONAL_DECIMALS, PROVISIONAL_DISPLAY_DECIMALS } from '@/shared/config/provisional';
import type { AnalysisItemCode, AnalysisSource } from '../model/types';

/**
 * 회차 대조표에 싣는 항목 순서.
 *
 * **AI 추정 대상 3종을 앞에, 실측만 있는 2종을 뒤에** 둔다 — 대조가 가능한 것과 아닌 것이
 * 섞이면 `—`가 오류처럼 보인다.
 */
export const ANALYSIS_ITEM_CODES: readonly AnalysisItemCode[] = ['TOC', 'TN', 'TP', 'SS', 'COD'];

/** 항목별 표기. 자릿수는 계측 설정에서 가져오고, 없는 항목만 여기서 정한다(E1) */
export const ANALYSIS_ITEMS: Record<
  AnalysisItemCode,
  { label: string; unit: string; decimals: number }
> = {
  TOC: { label: '총유기탄소', unit: 'mg/L', decimals: PROVISIONAL_DECIMALS.TOC },
  TN: { label: '총질소', unit: 'mg/L', decimals: PROVISIONAL_DECIMALS.TN },
  TP: { label: '총인', unit: 'mg/L', decimals: PROVISIONAL_DECIMALS.TP },
  /* SS·COD는 계측 항목이 아니라 `PROVISIONAL_DECIMALS`가 아닌 표시 자릿수를 쓴다 */
  SS: { label: '부유물질', unit: 'mg/L', decimals: PROVISIONAL_DISPLAY_DECIMALS.analysisSS },
  COD: {
    label: '화학적산소요구량',
    unit: 'mg/L',
    decimals: PROVISIONAL_DISPLAY_DECIMALS.analysisCOD,
  },
};

/** AI 추정 대상이 아닌 항목과 그 이유. 화면이 이 문장을 그대로 보여 준다 */
export const NOT_ESTIMATED_REASON: Partial<Record<AnalysisItemCode, string>> = {
  SS: '계측·추정 대상이 아니다 — 탁도는 물리 지표일 뿐 SS가 아니다 [공정자료 p.5·19]',
  COD: 'TOC로 대체되어 현재 폐지된 기준이다 [공정자료 p.12·16]',
};

export const ANALYSIS_SOURCE_LABELS: Record<AnalysisSource, string> = {
  lab: '위탁 실험실 수분석',
  analyzer: 'TN/TP 분석기',
};

/**
 * 원천별 주기 표기.
 *
 * **월 2회는 법정 주기가 아니라 본 과제의 검증 계획이다** `[원문 p.38]`. 법정 자가측정은
 * 월 1회~분기 1회다 `[공정자료 p.13]` — 둘을 같은 것으로 적으면 규제 요건을 잘못 전한다.
 */
export const ANALYSIS_SOURCE_CYCLES: Record<AnalysisSource, string> = {
  lab: '월 2회 (본 과제 검증 계획) [원문 p.38]',
  analyzer: '연속 측정 · 대표 실증사업장 1개소 [원문 발표 p.17]',
};

/**
 * 분석기를 설치한 대표 실증사업장.
 *
 * 원문은 **"대표 실증사업장 1개소"** 라고만 하고 어느 곳인지 정하지 않았다 `[원문 발표 p.17]`.
 * 실증 데이터가 있는 사업장(진유원 = 식품)에 대응시킨 **시연 선택**이며, 확정되면 이 값만 바꾼다.
 */
export const ANALYZER_SITE_ID = 'S-03';

/**
 * 항목별 기저값.
 *
 * **`entities/prediction`을 직접 참조하지 않는다** — slice끼리의 수평 import는 금지다(FSD §8).
 * 대신 같은 값을 여기에 두고, 두 곳이 어긋나면 테스트가 잡는다(`water-analysis.test.ts`).
 *
 * TOC·TN·TP는 예측 계열과 같아야 한다. 다르면 대조표의 오차가 두 시연 값의 우연한 차이를
 * 보여 주게 되고, 검증 화면이 보여야 할 **대조 방법**이 묻힌다.
 * SS·COD는 AI 추정 대상이 아니라 기준 계열이 없다 — 실증 성적서 값의 크기를 그대로 쓴다
 * `[데이터셋 Non_TMS_sites/05]`.
 */
export const ANALYSIS_BASE: Record<AnalysisItemCode, number> = {
  TOC: 25.5,
  TN: 16,
  TP: 1.5,
  SS: 5.2,
  COD: 9.1,
};

/** 회차 수 — 6개월 이상 성능 평가 `[원문 p.38]` × 월 2회 */
export const LAB_ROUND_COUNT = 12;

/** 한 회차의 시료 수. 성적서가 9:45~16:45 매시 8건이었다 `[데이터셋 Non_TMS_sites/05]` */
export const SAMPLES_PER_ROUND = 8;
export const FIRST_SAMPLE_HOUR = 9;
export const SAMPLE_MINUTE = 45;
