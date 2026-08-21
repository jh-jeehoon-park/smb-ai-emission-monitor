import type { MeasurementItemCode } from '@/shared/config/measurement';
import { ALL_PROCESS_STAGES, type ProcessStage } from '@/entities/process';
import type { StageSetting, StageSettingsBySite } from './storage';

/** 그 사업장에서 살아 있는 단계 하나 */
export interface ResolvedStage {
  stage: ProcessStage;
  /** 이 단계에서 재는 항목. 비어 있으면 계측 지점이 아니다 */
  codes: MeasurementItemCode[];
}

export interface ResolvedProcess {
  /** 켜진 단계만, 순서대로 */
  stages: ResolvedStage[];
  /** 꺼 둔 단계. 화면이 "몇 개를 뺐다"를 적는 데 쓴다 — 조용히 빼면 누락으로 보인다 */
  disabled: ProcessStage[];
  /** 사용자가 한 번이라도 설정했는가. 화면이 출처를 다르게 적는 데 쓴다 */
  isUserSet: boolean;
}

/**
 * 저장된 설정을 최대 공정 위에 얹는다.
 *
 * **설정이 없으면 표준 5단계가 전부 켜진 상태다.** 비어 있는 것을 "아무 단계도 없다"로 읽으면
 * 처음 들어온 사업장의 공정도가 빈 화면이 된다 — 표준이 기본이고 사용자가 덜어내는 방향이다
 * `[회의 2026-08-20: 최대치의 공정이 있다고 가정하며 필요한 공정만 활성화]`.
 *
 * **계측 항목은 단계의 기본값에서 시작한다.** 회의가 공정별 모니터링을 요구하며 예시를 함께
 * 줬다 — 유입에 유량, 1차 침전에 TOC `[회의 2026-08-20]`. 그것과 이미 근거가 있는 계측 지점
 * (유입펌프 전류·방류구 프로브)이 `stage.defaultCodes`에 있다. 근거가 없는 단계는 비어 있고
 * 화면이 그 사실을 적는다(`[TBD-53]`).
 *
 * **사용자가 비운 것과 설정하지 않은 것을 가른다.** 설정이 있으면 그 값을 그대로 쓴다 —
 * 항목을 다 지운 단계에 기본값을 되돌리면 사용자가 끈 것이 살아나 조작이 되지 않는다.
 *
 * **순수 함수다.** localStorage도 React도 모른다 — 그래야 테스트가 쉽고 서버에서도 돈다.
 */
export function resolveProcess(
  settings: StageSettingsBySite | null,
  siteId: string,
): ResolvedProcess {
  const perStage = settings?.[siteId];

  const stages: ResolvedStage[] = [];
  const disabled: ProcessStage[] = [];

  for (const stage of ALL_PROCESS_STAGES) {
    const setting: StageSetting | undefined = perStage?.[stage.id];
    /* 설정에 없는 단계는 **표준이면 켜고 플러스 알파면 끈다** — 없는 공정을 그리지 않는다 */
    const enabled = setting ? setting.enabled : !stage.optional;

    /* 설정이 있으면 그 값이 정본이다. 없을 때만 단계의 기본값을 쓴다 */
    if (enabled) stages.push({ stage, codes: setting ? setting.codes : stage.defaultCodes });
    else disabled.push(stage);
  }

  return {
    stages,
    disabled,
    isUserSet: Boolean(perStage && Object.keys(perStage).length > 0),
  };
}
