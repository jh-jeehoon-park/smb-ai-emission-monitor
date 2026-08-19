import { roundTo } from '@/shared/lib/prng';
import { ANALYSIS_ITEMS, ANALYSIS_ITEM_CODES, NOT_ESTIMATED_REASON } from '../config/constants';
import type {
  AnalysisItemCode,
  AnalysisRound,
  ComparisonRow,
  ValidationMetrics,
} from '../model/types';

/** 회차의 항목별 실측 평균. 표본이 없으면 `null` */
export function measuredMean(round: AnalysisRound, code: AnalysisItemCode): number | null {
  const values = round.samples
    .map((s) => s.values[code])
    .filter((v): v is number => v !== undefined);
  if (values.length === 0) return null;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return roundTo(mean, ANALYSIS_ITEMS[code].decimals);
}

/**
 * 회차 대조표.
 *
 * **AI 추정이 없는 항목을 빼지 않는다.** SS·COD 행이 사라지면 법정 점검 5항목 중 우리가
 * 못 보는 항목이 있다는 사실이 화면에서 없어진다 `[공정자료 p.5·19]`. 대신 그 자리에
 * **왜 없는지**를 적는다.
 */
export function buildComparison(
  round: AnalysisRound,
  estimatedOf: (code: AnalysisItemCode) => number | null,
): ComparisonRow[] {
  return ANALYSIS_ITEM_CODES.map((code) => {
    const measured = measuredMean(round, code);
    const reason = NOT_ESTIMATED_REASON[code] ?? null;
    const estimated = reason === null ? estimatedOf(code) : null;

    return {
      code,
      measured,
      estimated,
      error:
        measured === null || estimated === null
          ? null
          : roundTo(estimated - measured, ANALYSIS_ITEMS[code].decimals),
      unavailableReason: reason,
    };
  });
}

/**
 * 검증 지표 — 원문이 지정한 R²·MAE `[원문 p.38]`.
 *
 * **표본이 2개 미만이면 `null`이다.** 한 점으로는 결정계수를 정의할 수 없는데도 `1`이나 `0`을
 * 내면 검증된 성능처럼 읽힌다(E3). 분모가 0인 경우(실측이 전부 같은 값)도 마찬가지다.
 */
export function computeMetrics(pairs: { measured: number; estimated: number }[]): ValidationMetrics {
  const sampleCount = pairs.length;
  if (sampleCount < 2) return { r2: null, mae: null, sampleCount };

  const mae = pairs.reduce((acc, p) => acc + Math.abs(p.estimated - p.measured), 0) / sampleCount;
  const mean = pairs.reduce((acc, p) => acc + p.measured, 0) / sampleCount;

  const totalSquares = pairs.reduce((acc, p) => acc + (p.measured - mean) ** 2, 0);
  const residualSquares = pairs.reduce((acc, p) => acc + (p.measured - p.estimated) ** 2, 0);

  return {
    r2: totalSquares === 0 ? null : 1 - residualSquares / totalSquares,
    mae,
    sampleCount,
  };
}
