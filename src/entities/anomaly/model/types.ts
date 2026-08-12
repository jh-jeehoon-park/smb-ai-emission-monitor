import type { StatusLevel } from '@/shared/config/provisional';

export interface AnomalyPoint {
  t: string;
  /** 이상 점수 0~100 정규화 (사업계획서 p.64). 결측 구간은 null */
  score: number | null;
}

/** AutoEncoder의 주요 기여 변수 — Feature Attribution 기반 (사업계획서 p.64) */
export interface Contribution {
  label: string;
  /** 기여 비율 0~1 */
  weight: number;
  direction: 'up' | 'down';
}

export interface AnomalySummary {
  /** 통신 두절이면 산출값이 없다. 0이 아니라 null이다(E4) */
  score: number | null;
  level: StatusLevel | null;
  online: boolean;
  /** AI 산출 시각 — 값과 함께 반드시 노출한다(E3) */
  computedAtIso: string;
  /** 산출 대상 기간 (E3) */
  windowLabel: string;
  modelLabel: string;
  contributions: Contribution[];
}
