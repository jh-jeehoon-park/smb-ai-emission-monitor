import { WATER_QUALITY_CODES, type MeasurementItemCode } from '@/shared/config/measurement';
import { PROCESS_STAGES, type ProcessStage } from '@/entities/process';
import { INLET_CHANNEL_ITEMS } from '@/entities/measurement';
import type {
  ExcludedChannel,
  LegacyStageSettingsBySite,
  SiteProcess,
  SiteProcessBySite,
  SiteStage,
  StageChannel,
} from './storage';

/**
 * 표준 단계마다 **어느 ECP 채널이 그 자리인가** — 씨앗 매핑.
 *
 * 채널 이름은 지금 계측 서버가 보내는 것이다(`docs/integration/README.md` §8). 규칙은 하나다:
 * **`*In`은 유입, `*Out`은 방류.** 그 밖에 자리가 정해진 채널은 전류(유입펌프 — 유입 단계의
 * 설비 `EQ-02`)와 수위(방류수조)뿐이다.
 *
 * **1차 침전의 TOC는 채널이 없다.** 회의가 «1차 침전에는 TOC 얼마»를 예로 들었지만 그 자리의
 * ECP 채널은 없다 — 한때 방류구의 `TOCOut`을 그 자리 값처럼 보여 줬다. 채널을 지어내 붙이지
 * 않고 `key: null`로 둔다(«지점은 정했으나 채널 미지정»).
 */
const SEED_CHANNELS: Record<string, StageChannel[]> = {
  intake: [
    { key: 'flowIn', item: 'inflow' },
    { key: 'current', item: 'current' },
    ...INLET_CHANNEL_ITEMS.map((c) => ({ key: c.key, item: c.inlet as MeasurementItemCode })),
  ],
  primary: [{ key: null, item: 'TOC' }],
  biological: [],
  secondary: [],
  advanced: [
    ...WATER_QUALITY_CODES.map((code) => ({ key: `${code}Out`, item: code })),
    { key: 'flowOut', item: 'flow' },
    { key: 'level', item: 'level' },
  ],
};

/**
 * **공정에 걸지 않는 채널의 씨앗.** 조용히 버리면 「미매핑」으로 떠 설정이 덜 된 것처럼 보이고,
 * 매핑하면 없는 뜻을 붙인다 — 그래서 이유를 적어 뺀다.
 */
const SEED_EXCLUDED: ExcludedChannel[] = [
  { key: 'power', reason: '사업장 전체 전력 — 공정 단계가 아니라 사업장 단위 값이다' },
  { key: 'TNOut', reason: 'AI 예측 대상 — 서버에 채널이 있어도 계측 계열로 올리지 않는다' },
  { key: 'TPOut', reason: 'AI 예측 대상 — 서버에 채널이 있어도 계측 계열로 올리지 않는다' },
];

function fromStandard(stage: ProcessStage): SiteStage {
  return {
    id: stage.id,
    origin: 'standard',
    name: stage.name,
    type: stage.type,
    units: [...stage.units],
    channels: (SEED_CHANNELS[stage.id] ?? []).map((c) => ({ ...c })),
    equipmentIds: [...stage.equipmentIds],
    reuseBranch: false,
  };
}

/**
 * **설정이 없는 사업장의 공정** — 표준 5단계 + 씨앗 매핑.
 *
 * 비어 있음을 «공정이 없다»로 읽지 않는다 — 처음 들어온 사업장의 공정도가 통째로 비면 그것은
 * 사실이 아니라 설정 누락이다. 시연 10개소가 이 값으로 그려진다.
 */
export function standardProcess(): SiteProcess {
  return {
    stages: PROCESS_STAGES.map(fromStandard),
    excluded: SEED_EXCLUDED.map((x) => ({ ...x })),
  };
}

/**
 * **옛 저장값을 새 모양으로 옮긴다** — 켜고 끄던 설정(2026-08-20 ~ 2026-09-28)을 잃지 않는다.
 *
 * 꺼 둔 표준 단계는 빠지고, 고른 항목 코드는 계측 지점이 된다. 채널은 **그 단계의 씨앗에 같은
 * 항목이 있을 때만** 붙인다 — 다른 단계의 채널을 빌려 오면 한 채널이 두 단계에 걸려 같은 값을
 * 두 번 센다(옛 모델이 실제로 그랬다: 1차 침전의 TOC가 방류구 `TOCOut`을 보고 있었다).
 * 씨앗에 없으면 `key: null`(채널 미지정)이다.
 */
export function migrateLegacy(legacy: LegacyStageSettingsBySite): SiteProcessBySite {
  const out: SiteProcessBySite = {};

  for (const [siteId, perStage] of Object.entries(legacy)) {
    const seed = standardProcess();
    const stages: SiteStage[] = [];

    for (const stage of seed.stages) {
      const setting = perStage[stage.id];
      if (setting && !setting.enabled) continue;
      if (!setting) {
        stages.push(stage);
        continue;
      }
      const channels = setting.codes.map((code): StageChannel => ({
        key: stage.channels.find((c) => c.item === code)?.key ?? null,
        item: code,
      }));
      stages.push({ ...stage, channels });
    }

    out[siteId] = { stages, excluded: seed.excluded };
  }
  return out;
}
