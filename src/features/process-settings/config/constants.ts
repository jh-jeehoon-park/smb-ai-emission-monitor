import { STORAGE_KEYS } from '@/shared/config/storage';

export const PROCESS_STAGES_STORAGE_KEY = STORAGE_KEYS.processStages;

/**
 * 단계에 계측 항목이 하나도 없을 때 화면이 적는 말.
 *
 * **빈 칸으로 두지 않는다.** 프로브가 단계마다 붙는다는 것은 회의가 정했는데 어느 단계에서
 * 어떤 항목을 재는지는 아직 없다 `[TBD-53]` — 비워 두면 "재지 않는 단계"로 읽히고,
 * 지어내면 없는 계측을 주장한다. 무엇을 해야 하는지를 적는다.
 */
export const NO_STAGE_CODES_REASON =
  '이 단계의 계측 항목이 설정되지 않았습니다 — 사업장 설정에서 고르면 값을 표시합니다 [TBD-53]';
