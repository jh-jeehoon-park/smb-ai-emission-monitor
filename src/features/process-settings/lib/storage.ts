import { MEASUREMENT_ITEMS, type MeasurementItemCode } from '@/shared/config/measurement';
import { STAGE_IDS, TREATMENT_TYPES, type TreatmentType } from '@/entities/process';

/**
 * **공정 단계 한 칸의 계측 지점** — ECP가 보내는 채널 하나를 «이 단계의 이 항목»에 건다
 * `[사용자 결정 2026-09-29: ECP로 들어오는 데이터 정보들과 공정을 mapping 해야 한다]`.
 *
 * `key`가 `null`이면 **지점은 정했으나 채널이 아직 없다** — «1차 침전에는 TOC»처럼 회의가
 * 계측을 요구했지만 그 자리의 ECP 채널이 없는 경우다. 채널을 지어내 붙이지 않고 비워 둔다.
 */
export interface StageChannel {
  key: string | null;
  item: MeasurementItemCode;
}

/**
 * 그 사업장의 공정 단계 한 칸.
 *
 * **표준 5단계에서 켜고 끄던 모델을 걷었다** `[사용자 요청 2026-09-29: 공정은 5개로 국한되지
 * 않음 · 사업장별로 단계가 다르다]`. 현장조사 5개소의 공정 흐름이 단계 수·이름·순서까지 전부
 * 달랐다(진선식품 혐기→무산소→폭기 · 대호특수강 pH조정→반응·응집→…→파샬플룸). 켜고 끄기로는
 * 없는 단계를 만들 수도, 순서를 바꿀 수도 없다.
 */
export interface SiteStage {
  /** 그 사업장 안에서 고정. 이름을 바꿔도 유지된다 — 공정 화면 주소(`?stage=`)가 이 값이다 */
  id: string;
  /** 어디서 왔는가 — 표준 5단계 · 단위공정 목록 · 직접 입력 */
  origin: 'standard' | 'catalog' | 'custom';
  name: string;
  type: TreatmentType;
  units: string[];
  channels: StageChannel[];
  /** 이 단계에 놓인 설비. 설비 대장이 생기면 그쪽이 갖는다 */
  equipmentIds: string[];
  /**
   * **여기서 재이용으로 갈라지는가** `[사용자 결정 2026-09-29: 재이용 (가)]`. 처리수 일부가 방류되지
   * 않고 제조공정으로 되돌아가는 자리다(대호특수강: 발생 389.1 = 방류 191.6 + 재이용 197.5㎥/일).
   * 공정도를 갈래로 그리지 않고 **표시만** 한다.
   */
  reuseBranch: boolean;
}

/** 공정에 걸지 않는 채널과 그 이유 — 조용히 버리지 않고 «일부러 뺐다»를 남긴다 */
export interface ExcludedChannel {
  key: string;
  reason: string;
}

export interface SiteProcess {
  stages: SiteStage[];
  excluded: ExcludedChannel[];
}

export type SiteProcessBySite = Record<string, SiteProcess>;

const isCode = (v: unknown): v is MeasurementItemCode =>
  typeof v === 'string' && v in MEASUREMENT_ITEMS;
const isType = (v: unknown): v is TreatmentType =>
  typeof v === 'string' && (TREATMENT_TYPES as readonly string[]).includes(v);
const isOrigin = (v: unknown): v is SiteStage['origin'] =>
  v === 'standard' || v === 'catalog' || v === 'custom';
const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : [];

function parseChannel(raw: unknown): StageChannel | null {
  if (!raw || typeof raw !== 'object') return null;
  const { key, item } = raw as { key?: unknown; item?: unknown };
  if (!isCode(item)) return null;
  return { key: typeof key === 'string' && key.trim() !== '' ? key.trim() : null, item };
}

function parseStage(raw: unknown): SiteStage | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || r.id === '' || typeof r.name !== 'string' || r.name.trim() === '') {
    return null;
  }
  return {
    id: r.id,
    origin: isOrigin(r.origin) ? r.origin : 'custom',
    name: r.name.trim(),
    /* 유형이 망가졌으면 물리로 둔다 — 단계를 버리면 사용자가 만든 공정이 사라진다 */
    type: isType(r.type) ? r.type : 'physical',
    units: strings(r.units),
    channels: Array.isArray(r.channels)
      ? r.channels.map(parseChannel).filter((c): c is StageChannel => c !== null)
      : [],
    equipmentIds: strings(r.equipmentIds),
    reuseBranch: r.reuseBranch === true,
  };
}

/**
 * 저장값을 믿지 않는다. 모양이 틀린 칸은 버리고, **같은 id가 두 번 나오면 뒤엣것을 버린다** —
 * 공정 화면 주소가 id로 단계를 고르므로 겹치면 어느 단계인지 정해지지 않는다.
 *
 * **한 채널이 두 곳에 걸려 있으면 뒤엣것을 버린다** — 편집 연산(`addChannel`)이 지키는 규칙을
 * 저장값이 어겨도 화면이 같은 값을 두 번 세지 않게 한다. 단계에 걸린 채널이 «뺀 채널»에도
 * 있으면 단계 쪽이 이긴다.
 */
export function parseSiteProcesses(raw: unknown): SiteProcessBySite | null {
  if (!raw || typeof raw !== 'object') return null;

  const out: SiteProcessBySite = {};
  for (const [siteId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue;
    const { stages, excluded } = value as { stages?: unknown; excluded?: unknown };
    if (!Array.isArray(stages)) continue;

    const seenIds = new Set<string>();
    const usedKeys = new Set<string>();
    const parsed: SiteStage[] = [];
    for (const stage of stages.map(parseStage)) {
      if (!stage || seenIds.has(stage.id)) continue;
      seenIds.add(stage.id);
      const channels = stage.channels.filter((c) => c.key === null || !usedKeys.has(c.key));
      for (const c of channels) if (c.key) usedKeys.add(c.key);
      parsed.push({ ...stage, channels });
    }

    const parsedExcluded: ExcludedChannel[] = [];
    for (const x of Array.isArray(excluded) ? excluded : []) {
      const { key, reason } = (x ?? {}) as { key?: unknown; reason?: unknown };
      if (typeof key !== 'string' || key === '' || usedKeys.has(key)) continue;
      usedKeys.add(key);
      parsedExcluded.push({ key, reason: typeof reason === 'string' ? reason : '' });
    }

    out[siteId] = { stages: parsed, excluded: parsedExcluded };
  }
  return out;
}

/**
 * **옛 저장 모양** — 표준 단계 id마다 «켬/끔 + 항목 코드» `[2026-08-20 ~ 2026-09-28]`.
 * 이전(`migrateLegacy`)에서만 읽는다.
 */
export interface LegacyStageSetting {
  enabled: boolean;
  codes: MeasurementItemCode[];
}
export type LegacyStageSettingsBySite = Record<string, Record<string, LegacyStageSetting>>;

const isStageId = (v: unknown): v is string =>
  typeof v === 'string' && (STAGE_IDS as readonly string[]).includes(v);

export function parseLegacyStageSettings(raw: unknown): LegacyStageSettingsBySite | null {
  if (!raw || typeof raw !== 'object') return null;

  const out: LegacyStageSettingsBySite = {};
  for (const [siteId, stages] of Object.entries(raw as Record<string, unknown>)) {
    if (!stages || typeof stages !== 'object') continue;

    const perStage: Record<string, LegacyStageSetting> = {};
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
