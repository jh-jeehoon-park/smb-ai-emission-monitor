import { MEASUREMENT_ITEMS, type MeasurementItemCode } from '@/shared/config/measurement';
import { INLET_CHANNEL_ITEMS, readableSeriesOf } from '@/entities/measurement';
import type { SiteProcess, SiteStage, StageChannel } from './storage';

/**
 * 공정을 고치는 연산 — **전부 순수 함수다.** 저장소도 React도 모르고 새 값을 돌려준다.
 *
 * 화면이 배열을 직접 주무르면 «한 채널은 한 단계에만»처럼 지켜야 할 규칙이 조작마다 흩어진다.
 * 여기 모으면 규칙이 한 곳에 있고 검사가 그것을 잠근다.
 */

/** 규칙에 걸려 고치지 못했을 때 그 이유 — `boolean`과 섞지 않는다(검증 반환 규약) */
export type EditResult = { ok: true; process: SiteProcess } | { ok: false; reason: string };

/** `index` 자리에 끼워 넣는다. 범위 밖이면 맨 끝이다 */
export function insertStage(process: SiteProcess, stage: SiteStage, index: number): SiteProcess {
  const at = Math.max(0, Math.min(index, process.stages.length));
  return { ...process, stages: [...process.stages.slice(0, at), stage, ...process.stages.slice(at)] };
}

/**
 * 단계를 뺀다. 뺀 단계와 자리를 함께 돌려준다 — **되돌리기**가 그 둘로 제자리에 다시 넣는다.
 * 그 단계에 걸렸던 채널은 함께 사라져 «연결 안 함»으로 돌아간다(채널 자체는 서버에 남는다).
 */
export function removeStage(
  process: SiteProcess,
  stageId: string,
): { process: SiteProcess; removed: { stage: SiteStage; index: number } | null } {
  const index = process.stages.findIndex((s) => s.id === stageId);
  if (index < 0) return { process, removed: null };
  return {
    process: { ...process, stages: process.stages.filter((s) => s.id !== stageId) },
    removed: { stage: process.stages[index]!, index },
  };
}

/** 한 칸 위(-1)·아래(+1)로. 끝에서 더 밀면 그대로다 */
export function moveStage(process: SiteProcess, stageId: string, delta: -1 | 1): SiteProcess {
  const from = process.stages.findIndex((s) => s.id === stageId);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= process.stages.length) return process;
  const stages = [...process.stages];
  [stages[from], stages[to]] = [stages[to]!, stages[from]!];
  return { ...process, stages };
}

export function updateStage(
  process: SiteProcess,
  stageId: string,
  patch: Partial<Omit<SiteStage, 'id' | 'origin'>>,
): SiteProcess {
  return {
    ...process,
    stages: process.stages.map((s) => (s.id === stageId ? { ...s, ...patch } : s)),
  };
}

/** 이 채널이 지금 어디에 쓰이고 있는가 — 단계 이름 또는 «사용 안 함» */
export function channelOwner(process: SiteProcess, key: string): string | null {
  const stage = process.stages.find((s) => s.channels.some((c) => c.key === key));
  if (stage) return stage.name;
  if (process.excluded.some((x) => x.key === key)) return '사용 안 함';
  return null;
}

/**
 * 목록에 없는 채널을 손으로 더한다 — 서버에 닿지 않아 알려진 목록에 없는 채널을 걸 때.
 *
 * **한 채널은 한 곳에만 건다.** 두 단계에 걸면 같은 값이 두 단계의 값으로 보이고 합계·비교가
 * 같은 값을 두 번 센다 — 옛 모델이 1차 침전의 TOC로 방류구 채널을 보여 준 것이 그 모양이었다.
 */
export function addChannel(process: SiteProcess, stageId: string, channel: StageChannel): EditResult {
  const key = channel.key?.trim() || null;
  if (key) {
    const owner = channelOwner(process, key);
    if (owner) return { ok: false, reason: `「${key}」은(는) 이미 ${owner}에 있습니다` };
  }
  return {
    ok: true,
    process: {
      ...process,
      stages: process.stages.map((s) =>
        s.id === stageId ? { ...s, channels: [...s.channels, { key, item: channel.item }] } : s,
      ),
    },
  };
}

/** 단계의 `index`번째 계측 지점을 뺀다 — 채널 없이 정한 지점(`key: null`)을 지울 때 쓴다 */
export function removeChannel(process: SiteProcess, stageId: string, index: number): SiteProcess {
  return {
    ...process,
    stages: process.stages.map((s) =>
      s.id === stageId ? { ...s, channels: s.channels.filter((_, i) => i !== index) } : s,
    ),
  };
}

/** 채널 하나가 갈 곳 — 한 단계 · 사용 안 함 · 아직 정하지 않음 */
export type ChannelTarget =
  | { kind: 'stage'; stageId: string; item: MeasurementItemCode }
  | { kind: 'unused' }
  | { kind: 'unassigned' };

/**
 * **채널 하나를 한 곳으로 옮긴다** — 연결 · 다른 단계로 옮기기 · 사용 안 함 · 연결 해제가 전부 이것이다.
 *
 * 먼저 모든 자리에서 그 채널을 걷고 새 자리 하나에만 둔다 — 그래서 «한 채널은 한 곳에만»이
 * 조작 순서와 무관하게 지켜진다. 없는 단계를 가리키면 아무것도 바꾸지 않는다.
 */
export function assignChannel(process: SiteProcess, key: string, target: ChannelTarget): SiteProcess {
  if (target.kind === 'stage' && !process.stages.some((s) => s.id === target.stageId)) return process;

  const previousReason = process.excluded.find((x) => x.key === key)?.reason ?? '';
  const stages = process.stages.map((s) => {
    const kept = s.channels.filter((c) => c.key !== key);
    if (target.kind === 'stage' && s.id === target.stageId) {
      return { ...s, channels: [...kept, { key, item: target.item }] };
    }
    return kept.length === s.channels.length ? s : { ...s, channels: kept };
  });
  const excluded = process.excluded.filter((x) => x.key !== key);
  if (target.kind === 'unused') excluded.push({ key, reason: previousReason });

  return { stages, excluded };
}

/** 채널 이름으로 짐작한 항목 — 아는 채널이면 그 항목, 모르면 `null`(사용자가 고른다) */
export function guessItem(key: string): MeasurementItemCode | null {
  const readable = readableSeriesOf(key);
  if (readable && readable in MEASUREMENT_ITEMS) return readable as MeasurementItemCode;
  const inlet = INLET_CHANNEL_ITEMS.find((c) => c.key === key);
  return inlet ? (inlet.inlet as MeasurementItemCode) : null;
}

/** 채널 연결 표의 한 줄 */
export interface ChannelRow {
  key: string;
  target: ChannelTarget;
  /** 연결돼 있으면 그 항목, 아니면 이름으로 짐작한 항목. 모르면 `null` */
  item: MeasurementItemCode | null;
  /** 채널 이름만으로 항목이 정해지는가 — 아니면 사용자가 고른다 */
  itemFixed: boolean;
  /** «사용 안 함»의 이유 — 비어 있을 수 있다 */
  reason: string;
}

/**
 * **채널 연결 표** — 받는 채널 전부 + 받는 목록에 없지만 공정에 걸려 있거나 빼 둔 채널.
 *
 * **순서는 받는 목록 그대로다.** 고를 때마다 정렬하면 방금 만진 줄이 다른 자리로 튀어 손이
 * 따라가지 못한다. 목록 밖 채널은 뒤에 붙는다. 메타 채널(방류 플래그·수집 주기)은 계측값이
 * 아니라 싣지 않는다.
 */
export function channelRows(
  process: SiteProcess,
  receivedKeys: readonly string[],
  isMeta: (key: string) => boolean,
): ChannelRow[] {
  const mapped = process.stages.flatMap((s) =>
    s.channels.flatMap((c) => (c.key ? [{ key: c.key, stageId: s.id, item: c.item }] : [])),
  );
  const keys = [
    ...receivedKeys.filter((key) => !isMeta(key)),
    ...mapped.map((m) => m.key),
    ...process.excluded.map((x) => x.key),
  ];

  return [...new Set(keys)].map((key): ChannelRow => {
    const guessed = guessItem(key);
    const itemFixed = guessed !== null;
    const onStage = mapped.find((m) => m.key === key);
    if (onStage) {
      return {
        key,
        target: { kind: 'stage', stageId: onStage.stageId, item: onStage.item },
        item: onStage.item,
        itemFixed,
        reason: '',
      };
    }
    const unused = process.excluded.find((x) => x.key === key);
    if (unused) return { key, target: { kind: 'unused' }, item: guessed, itemFixed, reason: unused.reason };
    return { key, target: { kind: 'unassigned' }, item: guessed, itemFixed, reason: '' };
  });
}

/** 아직 어디로 갈지 정하지 않은 채널 수 — 조용히 버리지 않도록 화면이 세어 보인다 */
export function unassignedCount(rows: readonly ChannelRow[]): number {
  return rows.filter((row) => row.target.kind === 'unassigned').length;
}
