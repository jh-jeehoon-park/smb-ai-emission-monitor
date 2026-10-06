import type { MeasurementItemCode } from '@/shared/config/measurement';
import type { StatusLevel } from '@/shared/config/provisional';

export interface AnomalyPoint {
  t: string;
  /** 이상 점수 0~100 정규화 (사업계획서 p.64). 결측 구간은 null */
  score: number | null;
}

/** AutoEncoder의 주요 기여 변수 — Feature Attribution 기반 (사업계획서 p.64) */
export interface Contribution {
  /**
   * 어느 계측 항목인가 `[사용자 요청 2026-09-08]`.
   *
   * **라벨만 있으면 실측을 붙일 수 없다.** 화면이 기여도 옆에 그 시각의 계측값을 적으려면
   * 항목을 찾아야 하는데, 라벨은 `'TOC 총유기탄소'`·`'전류(폭기 블로워)'`·`'탁도'`처럼
   * 제각각이라 문자열로 맞추면 **조용히 어긋난다** — 라벨 한 글자만 바뀌어도 값이 사라진다.
   *
   * `MeasurementItemCode`는 `shared/config`에 있어 **entities 간 참조가 아니다**(FSD §8).
   */
  code: MeasurementItemCode;
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
