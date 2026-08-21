import { MEASUREMENT_ITEMS, type MeasurementItemCode } from '@/shared/config/measurement';
import { STAGE_IDS } from '@/entities/process';

/**
 * 한 단계의 설정.
 *
 * 사업장마다 공정이 달라 최대 공정을 두고 필요한 단계만 켠다 `[회의 2026-08-20]`.
 * 켠 단계에는 **어떤 항목을 재는지**도 함께 고른다 — 회의가 "각 공정도에 따른 데이터가
 * 표출되는 모니터링"을 요구했고 프로브가 단계마다 붙는다는 것까지 정했으나, 어느 단계에서
 * 어떤 항목을 재는지는 주지 않았다 `[TBD-53]`. 그래서 **기본값을 채우지 않고** 받는다.
 */
export interface StageSetting {
  enabled: boolean;
  /** 이 단계에 붙은 프로브가 재는 항목. 비어 있으면 계측 지점이 아니다 */
  codes: MeasurementItemCode[];
}

/** 사업장 → 단계 → 설정. 사업장별로 다르므로 사업장이 첫 축이다 */
export type StageSettingsBySite = Record<string, Record<string, StageSetting>>;

const isStageId = (v: unknown): v is string =>
  typeof v === 'string' && (STAGE_IDS as readonly string[]).includes(v);

const isCode = (v: unknown): v is MeasurementItemCode =>
  typeof v === 'string' && v in MEASUREMENT_ITEMS;

/**
 * 저장값을 **믿을 수 있게 만든다.**
 *
 * 사용자가 콘솔에서 고칠 수 있고 옛 판이 남아 있을 수 있다. 모르는 단계 id·항목 코드는
 * 조용히 버린다 — 타입 단언으로 넘기면 그 거짓이 공정도까지 흘러가 없는 단계를 그린다.
 */
export function parseStageSettings(raw: unknown): StageSettingsBySite | null {
  if (!raw || typeof raw !== 'object') return null;

  const out: StageSettingsBySite = {};
  for (const [siteId, stages] of Object.entries(raw as Record<string, unknown>)) {
    if (!stages || typeof stages !== 'object') continue;

    const perStage: Record<string, StageSetting> = {};
    for (const [stageId, setting] of Object.entries(stages as Record<string, unknown>)) {
      if (!isStageId(stageId) || !setting || typeof setting !== 'object') continue;
      const { enabled, codes } = setting as { enabled?: unknown; codes?: unknown };
      perStage[stageId] = {
        /* 저장값이 망가졌으면 **켜 둔다** — 끄면 그 단계가 화면에서 사라져 없는 공정이 된다 */
        enabled: typeof enabled === 'boolean' ? enabled : true,
        codes: Array.isArray(codes) ? codes.filter(isCode) : [],
      };
    }
    if (Object.keys(perStage).length > 0) out[siteId] = perStage;
  }
  return out;
}
