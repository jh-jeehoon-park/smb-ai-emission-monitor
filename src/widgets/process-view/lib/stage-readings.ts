import type { MeasurementItemCode } from '@/shared/config/measurement';
import { getMeasurementSeries, summarizeSeries, type SeriesCode } from '@/entities/measurement';
import type { ResolvedStage } from '@/features/process-settings';

export interface StageReading {
  code: SeriesCode;
  /** 마지막 표본. **`null`은 결측**이며 0으로 채우지 않는다(E4) */
  latest: number | null;
}

/**
 * 그 단계에서 재는 항목의 **지금 값**.
 *
 * 회의가 요구한 것이 이것이다 — "각 공정도에 따른 데이터가 표출되는 모니터링"
 * `[회의 2026-08-20]`. HMI가 공정마다 그 지점의 값을 띄우는 것처럼 단계 노드에 값을 적는다.
 *
 * **단계별 계열이 따로 없다.** 계측 fixture는 사업장 단위 단일 계열이고(`getMeasurementSeries`),
 * 단계별 지점 데이터는 실증 데이터셋에도 없다 — 프로브를 단계마다 붙인다는 것이 회의 결과이지
 * 그 값이 우리에게 있는 것은 아니다. 그래서 **같은 계열에서 그 항목만 꺼내 보인다.** 없는
 * 지점 데이터를 만들어 단계마다 다른 값을 그리면 그것이 곧 지어낸 계측이 된다(E3).
 *
 * 진동은 여기 오지 않는다 — 설정 화면이 계열 항목만 고르게 한다(`[TBD-49]`로 단위가 없다).
 */
export function stageReadings(siteId: string, stage: ResolvedStage): StageReading[] {
  if (stage.codes.length === 0) return [];

  const points = getMeasurementSeries(siteId);
  return stage.codes.map((code) => ({
    code: code as SeriesCode,
    latest: summarizeSeries(points, code as SeriesCode).latest,
  }));
}

/** 설정된 항목이 하나도 없는 단계인가. 화면이 이유를 적을지 정하는 데 쓴다 */
export const hasNoCodes = (stage: ResolvedStage): boolean => stage.codes.length === 0;

/** 계측 항목 코드가 계열로 그릴 수 있는 것인가 — 설정 저장값이 옛 판일 때를 막는다 */
export const isSeriesCode = (code: MeasurementItemCode): code is SeriesCode & MeasurementItemCode =>
  code !== 'vibration' && code !== 'TN' && code !== 'TP';
