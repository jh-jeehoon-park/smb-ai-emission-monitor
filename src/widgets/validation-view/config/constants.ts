import type { AnalysisItemCode } from '@/entities/water-analysis';

/** 어느 회차를 보고 있는지 URL에 남긴다 — 링크로 그대로 공유된다 */
export const ROUND_QUERY_KEY = 'round';

/**
 * 지표 계산에 쓰는 항목.
 *
 * **AI 추정 대상 3종만이다.** SS·COD를 넣으면 추정값이 없는 쌍이 생겨 R²가 그 항목 수만큼
 * 흔들린다 — 원문이 말한 것도 "오염도 추정 정확도"다 `[원문 p.38]`.
 */
export const METRIC_ITEM_CODES: readonly AnalysisItemCode[] = ['TOC', 'TN', 'TP'];
