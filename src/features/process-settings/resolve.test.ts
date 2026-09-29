import { describe, expect, it } from 'vitest';
import { PROCESS_STAGES } from '@/entities/process';
import { isMetaChannel } from '@/entities/measurement';
import { channelStateOf, resolveProcess } from './lib/resolve';
import { migrateLegacy, standardProcess } from './lib/seed';
import {
  parseLegacyStageSettings,
  parseSiteProcesses,
  type SiteProcess,
  type SiteStage,
} from './lib/storage';
import {
  addChannel,
  assignChannel,
  channelRows,
  insertStage,
  moveStage,
  removeChannel,
  removeStage,
  unassignedCount,
  updateStage,
  type EditResult,
} from './lib/edit';

const SITE = 'S-02';

function customStage(id: string, name = '가압부상조'): SiteStage {
  return {
    id,
    origin: 'custom',
    name,
    type: 'physical',
    units: [],
    channels: [],
    equipmentIds: [],
    reuseBranch: false,
  };
}

/** 규칙에 걸리면 그 이유로 실패한다 — 성공을 전제한 검사가 조용히 넘어가지 않게 한다 */
function unwrap(result: EditResult): SiteProcess {
  if (!result.ok) throw new Error(result.reason);
  return result.process;
}

const idsOf = (process: SiteProcess) => process.stages.map((s) => s.id);
const allKeys = (process: SiteProcess) => [
  ...process.stages.flatMap((s) => s.channels.flatMap((c) => (c.key ? [c.key] : []))),
  ...process.excluded.map((x) => x.key),
];

describe('공정 — 설정이 없을 때', () => {
  /**
   * 비어 있는 것을 «공정이 없다»로 읽으면 처음 들어온 사업장의 공정도가 빈 화면이 된다.
   * 그것은 사실이 아니라 설정 누락이다.
   */
  it('표준 5단계가 순서대로 온다', () => {
    const { stages, isUserSet } = resolveProcess(null, SITE);
    expect(stages.map((s) => s.stage.id)).toEqual(PROCESS_STAGES.map((s) => s.id));
    expect(stages.map((s) => s.stage.order)).toEqual([1, 2, 3, 4, 5]);
    expect(isUserSet).toBe(false);
  });

  /** 씨앗 매핑의 규칙은 하나다 — `*In`은 유입, `*Out`은 방류 */
  it('유입 단계는 유입 채널, 방류 단계는 방류 채널을 갖는다', () => {
    const byId = new Map(standardProcess().stages.map((s) => [s.id, s]));
    const intakeKeys = byId.get('intake')!.channels.map((c) => c.key);
    const advancedKeys = byId.get('advanced')!.channels.map((c) => c.key);

    expect(intakeKeys).toContain('flowIn');
    expect(intakeKeys).toContain('pHIn');
    expect(advancedKeys).toContain('pHOut');
    expect(advancedKeys).toContain('flowOut');
    expect(intakeKeys.some((k) => k?.endsWith('Out'))).toBe(false);
    expect(advancedKeys.some((k) => k?.endsWith('In'))).toBe(false);
  });

  /**
   * 1차 침전의 TOC는 회의가 예로 든 지점인데 **그 자리의 채널이 없다.** 한때 방류구 `TOCOut`을
   * 그 자리 값처럼 보여 줬다 — 채널을 지어내 붙이지 않고 «채널 미지정»으로 둔다.
   */
  it('1차 침전의 TOC는 채널 미지정이고 값을 읽지 않는다', () => {
    const primary = resolveProcess(null, SITE).stages.find((s) => s.stage.id === 'primary')!;
    expect(primary.channels).toEqual([{ key: null, item: 'TOC' }]);
    expect(primary.codes).toHaveLength(0);
    expect(channelStateOf(primary.channels[0]!)).toBe('noChannel');
  });

  /** 한 채널이 두 곳에 걸리면 같은 값을 두 번 센다 */
  it('씨앗에서 한 채널은 한 곳에만 있다', () => {
    const keys = allKeys(standardProcess());
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('씨앗은 부를 때마다 새 값이다 — 한 사업장을 고쳐도 다른 사업장의 기본값이 바뀌지 않는다', () => {
    const a = standardProcess();
    a.stages[0]!.channels.push({ key: 'x', item: 'pH' });
    expect(standardProcess().stages[0]!.channels.some((c) => c.key === 'x')).toBe(false);
  });

  it('다른 사업장에는 영향을 주지 않는다 — 사업장이 첫 축이다', () => {
    const own: SiteProcess = { stages: [customStage('st-a')], excluded: [] };
    expect(resolveProcess({ [SITE]: own }, 'S-09').stages).toHaveLength(PROCESS_STAGES.length);
    expect(resolveProcess({ [SITE]: own }, 'S-09').isUserSet).toBe(false);
    expect(resolveProcess({ [SITE]: own }, SITE).isUserSet).toBe(true);
  });

  /** 사용자가 단계를 다 지운 것은 «설정 없음»이 아니다 — 표준으로 되살리면 조작이 되지 않는다 */
  it('단계를 다 지운 사업장은 빈 공정이다', () => {
    const empty: SiteProcess = { stages: [], excluded: [] };
    expect(resolveProcess({ [SITE]: empty }, SITE).stages).toHaveLength(0);
  });
});

describe('계측 지점의 상태와 등급', () => {
  it('채널 상태 셋을 가른다', () => {
    expect(channelStateOf({ key: null, item: 'TOC' })).toBe('noChannel');
    expect(channelStateOf({ key: 'pHOut', item: 'pH' })).toBe('reading');
    /* 서버는 주지만 화면은 아직 받지 않는다 */
    expect(channelStateOf({ key: 'pHIn', item: 'inletPH' })).toBe('notWired');
    expect(channelStateOf({ key: 'ORP_tank3', item: 'pH' })).toBe('notWired');
  });

  /** `AI 추정`은 우리가 모델을 붙인 자리의 말이다 — 사용자가 만든 단계에 줄 수 없다 */
  it('새 단계는 읽는 채널이 있으면 실측, 없으면 계측 없음이다', () => {
    const withReading: SiteStage = { ...customStage('st-a'), channels: [{ key: 'pHOut', item: 'pH' }] };
    const withoutReading: SiteStage = { ...customStage('st-b'), channels: [{ key: 'pHIn', item: 'inletPH' }] };
    const { stages } = resolveProcess({ [SITE]: { stages: [withReading, withoutReading], excluded: [] } }, SITE);
    expect(stages[0]!.stage.grade).toBe('actual');
    expect(stages[0]!.codes).toEqual(['pH']);
    expect(stages[1]!.stage.grade).toBe('none');
    expect(stages[1]!.codes).toHaveLength(0);
  });

  /** 채널을 다 빼면 더는 실측 지점이 아니다 */
  it('표준 방류 단계에서 채널을 다 빼면 계측 없음이 된다', () => {
    const seed = standardProcess();
    const cleared = updateStage(seed, 'advanced', { channels: [] });
    const advanced = resolveProcess({ [SITE]: cleared }, SITE).stages.find((s) => s.stage.id === 'advanced')!;
    expect(advanced.stage.grade).toBe('none');
  });

  it('재이용 분기는 표시만 넘긴다', () => {
    const seed = standardProcess();
    const marked = updateStage(seed, 'advanced', { reuseBranch: true });
    const stages = resolveProcess({ [SITE]: marked }, SITE).stages;
    expect(stages.find((s) => s.stage.id === 'advanced')!.reuseBranch).toBe(true);
    expect(stages.filter((s) => s.reuseBranch)).toHaveLength(1);
  });
});

describe('옛 설정 옮기기 — 켜고 끄던 표준 단계', () => {
  it('끈 단계는 빠지고 나머지는 순서를 지킨다', () => {
    const migrated = migrateLegacy({ [SITE]: { biological: { enabled: false, codes: [] } } });
    expect(idsOf(migrated[SITE]!)).toEqual(['intake', 'primary', 'secondary', 'advanced']);
  });

  it('설정하지 않은 단계는 씨앗 그대로다', () => {
    const migrated = migrateLegacy({ [SITE]: { biological: { enabled: false, codes: [] } } });
    const seed = standardProcess();
    expect(migrated[SITE]!.stages.find((s) => s.id === 'advanced')).toEqual(
      seed.stages.find((s) => s.id === 'advanced'),
    );
    expect(migrated[SITE]!.excluded).toEqual(seed.excluded);
  });

  /**
   * **채널은 그 단계의 씨앗에 같은 항목이 있을 때만 붙인다.** 다른 단계의 채널을 빌려 오면
   * 한 채널이 두 단계에 걸린다 — 옛 모델의 1차 침전 TOC가 방류구 `TOCOut`을 보던 모양이다.
   */
  it('항목 코드는 그 단계의 채널로만 옮겨지고 없으면 채널 미지정이다', () => {
    const migrated = migrateLegacy({
      [SITE]: {
        primary: { enabled: true, codes: ['TOC'] },
        advanced: { enabled: true, codes: ['pH', 'EC'] },
      },
    });
    const byId = new Map(migrated[SITE]!.stages.map((s) => [s.id, s]));
    expect(byId.get('primary')!.channels).toEqual([{ key: null, item: 'TOC' }]);
    expect(byId.get('advanced')!.channels).toEqual([
      { key: 'pHOut', item: 'pH' },
      { key: 'ECOut', item: 'EC' },
    ]);
    const keys = allKeys(migrated[SITE]!);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('사업장마다 따로 옮긴다', () => {
    const migrated = migrateLegacy({
      [SITE]: { biological: { enabled: false, codes: [] } },
      'S-09': { secondary: { enabled: false, codes: [] } },
    });
    expect(idsOf(migrated[SITE]!)).not.toContain('biological');
    expect(idsOf(migrated['S-09']!)).toContain('biological');
    expect(idsOf(migrated['S-09']!)).not.toContain('secondary');
  });
});

/**
 * 저장값은 사용자가 콘솔에서 고칠 수 있고 옛 판이 남아 있을 수 있다.
 * **모르는 것을 버린다** — 타입 단언으로 넘기면 그 거짓이 공정도까지 흘러가 없는 단계를 그린다.
 */
describe('저장값 검증', () => {
  it('객체가 아니면 null이다 — 파싱 실패는 기본값으로 떨어진다', () => {
    expect(parseSiteProcesses('nope')).toBeNull();
    expect(parseSiteProcesses(null)).toBeNull();
    expect(parseLegacyStageSettings(42)).toBeNull();
  });

  it('이름이 없는 단계와 단계 배열이 없는 사업장을 버린다', () => {
    const parsed = parseSiteProcesses({
      [SITE]: { stages: [{ id: 'a', name: '' }, { id: 'b', name: '부상조' }], excluded: [] },
      'S-09': { stages: 'nope' },
    });
    expect(parsed?.[SITE]?.stages.map((s) => s.id)).toEqual(['b']);
    expect(parsed?.['S-09']).toBeUndefined();
  });

  /** 공정 화면 주소가 id로 단계를 고른다 — 겹치면 어느 단계인지 정해지지 않는다 */
  it('같은 id가 두 번 나오면 뒤엣것을 버린다', () => {
    const parsed = parseSiteProcesses({
      [SITE]: { stages: [{ id: 'a', name: '첫째' }, { id: 'a', name: '둘째' }] },
    });
    expect(parsed?.[SITE]?.stages.map((s) => s.name)).toEqual(['첫째']);
  });

  it('모르는 항목 코드의 지점을 버리고, 망가진 유형·출처는 물리·직접 입력으로 둔다', () => {
    const parsed = parseSiteProcesses({
      [SITE]: {
        stages: [
          {
            id: 'a',
            name: '부상조',
            type: 'magic',
            origin: 'alien',
            channels: [
              { key: 'pHOut', item: 'pH' },
              { key: 'x', item: 'BOD' },
              { key: '  ', item: 'EC' },
            ],
          },
        ],
      },
    });
    const stage = parsed?.[SITE]?.stages[0];
    expect(stage?.type).toBe('physical');
    expect(stage?.origin).toBe('custom');
    expect(stage?.channels).toEqual([
      { key: 'pHOut', item: 'pH' },
      { key: null, item: 'EC' },
    ]);
    expect(stage?.reuseBranch).toBe(false);
  });

  /** 편집 연산이 지키는 «한 채널 한 곳»을 저장값이 어겨도 화면은 두 번 세지 않는다 */
  it('두 곳에 걸린 채널은 뒤엣것을 버리고, 단계에 걸린 채널은 «뺀 채널»에서 빠진다', () => {
    const parsed = parseSiteProcesses({
      [SITE]: {
        stages: [
          { id: 'a', name: '첫째', channels: [{ key: 'pHOut', item: 'pH' }] },
          { id: 'b', name: '둘째', channels: [{ key: 'pHOut', item: 'pH' }, { key: null, item: 'TOC' }] },
        ],
        excluded: [
          { key: 'pHOut', reason: '중복' },
          { key: 'power', reason: '사업장 전체' },
          { key: 'power', reason: '두 번' },
        ],
      },
    });
    const process = parsed![SITE]!;
    expect(process.stages[1]!.channels).toEqual([{ key: null, item: 'TOC' }]);
    expect(process.excluded).toEqual([{ key: 'power', reason: '사업장 전체' }]);
  });

  it('옛 저장값 — 모르는 단계 id와 항목 코드를 버리고, 망가진 켬/끔은 켠 것으로 본다', () => {
    const parsed = parseLegacyStageSettings({
      [SITE]: {
        nope: { enabled: true, codes: [] },
        intake: { enabled: 'yes', codes: ['flow', 'BOD'] },
      },
    });
    expect(parsed?.[SITE]?.nope).toBeUndefined();
    expect(parsed?.[SITE]?.intake).toEqual({ enabled: true, codes: ['flow'] });
  });
});

describe('편집 연산', () => {
  it('원하는 자리에 끼워 넣고, 범위 밖이면 맨 끝이다', () => {
    const seed = standardProcess();
    expect(idsOf(insertStage(seed, customStage('st-a'), 1))[1]).toBe('st-a');
    expect(idsOf(insertStage(seed, customStage('st-b'), 99)).at(-1)).toBe('st-b');
    expect(idsOf(insertStage(seed, customStage('st-c'), -3))[0]).toBe('st-c');
  });

  /** 삭제는 확인창 대신 되돌리기로 받는다 — 뺀 단계와 자리로 제자리에 돌아가야 한다 */
  it('뺀 단계를 되돌리면 원래 자리·원래 값으로 돌아온다', () => {
    const seed = standardProcess();
    const { process: without, removed } = removeStage(seed, 'primary');
    expect(idsOf(without)).not.toContain('primary');
    expect(removed?.index).toBe(1);
    expect(insertStage(without, removed!.stage, removed!.index)).toEqual(seed);
  });

  it('없는 단계를 빼면 아무것도 바뀌지 않는다', () => {
    const seed = standardProcess();
    const { process, removed } = removeStage(seed, 'nope');
    expect(process).toBe(seed);
    expect(removed).toBeNull();
  });

  it('↑↓로 한 칸씩 옮기고, 끝에서 더 밀면 그대로다', () => {
    const seed = standardProcess();
    expect(idsOf(moveStage(seed, 'primary', -1)).slice(0, 2)).toEqual(['primary', 'intake']);
    expect(idsOf(moveStage(seed, 'primary', 1)).slice(1, 3)).toEqual(['biological', 'primary']);
    expect(moveStage(seed, 'intake', -1)).toBe(seed);
    expect(moveStage(seed, 'advanced', 1)).toBe(seed);
  });

  it('이름을 바꿔도 id는 그대로다 — 공정 화면 주소가 id를 쓴다', () => {
    const renamed = updateStage(standardProcess(), 'primary', { name: '가압부상조' });
    const stage = renamed.stages.find((s) => s.id === 'primary');
    expect(stage?.name).toBe('가압부상조');
  });

  /** 한 채널이 두 단계에 걸리면 같은 값이 두 단계의 값으로 보인다 */
  it('손으로 더할 때 이미 있는 채널은 막고, 이유가 어디에 있는지를 말한다', () => {
    const result = addChannel(standardProcess(), 'primary', { key: 'pHOut', item: 'pH' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('방류');
    expect(addChannel(standardProcess(), 'primary', { key: 'power', item: 'power' }).ok).toBe(false);
  });

  it('채널 없는 지점은 몇 번이든 정할 수 있고, 공백 채널 이름은 채널 미지정이다', () => {
    let process = standardProcess();
    process = unwrap(addChannel(process, 'biological', { key: null, item: 'DO' }));
    process = unwrap(addChannel(process, 'biological', { key: '   ', item: 'pH' }));
    process = unwrap(addChannel(process, 'secondary', { key: null, item: 'DO' }));
    expect(process.stages.find((s) => s.id === 'biological')!.channels).toEqual([
      { key: null, item: 'DO' },
      { key: null, item: 'pH' },
    ]);
  });
});

/**
 * **채널 연결 — 선택 한 칸이 전부다** `[사용자 지적 2026-09-29: 공정 구성 UX가 너무 복잡함]`.
 * 연결 · 옮기기 · 사용 안 함 · 해제가 한 연산이고, 어느 순서로 눌러도 한 채널은 한 곳에만 있다.
 */
describe('채널 연결', () => {
  const where = (process: SiteProcess, key: string) => allKeys(process).filter((k) => k === key).length;

  it('다른 단계로 옮기면 원래 자리에서 빠진다 — 한 채널은 한 곳에만', () => {
    const moved = assignChannel(standardProcess(), 'pHOut', { kind: 'stage', stageId: 'primary', item: 'pH' });
    expect(moved.stages.find((s) => s.id === 'primary')!.channels).toContainEqual({ key: 'pHOut', item: 'pH' });
    expect(moved.stages.find((s) => s.id === 'advanced')!.channels.some((c) => c.key === 'pHOut')).toBe(false);
    expect(where(moved, 'pHOut')).toBe(1);
  });

  it('사용 안 함 · 정하지 않음으로 보낼 수 있고, 다시 단계로 돌아온다', () => {
    const seed = standardProcess();
    const unused = assignChannel(seed, 'flowIn', { kind: 'unused' });
    expect(unused.excluded.some((x) => x.key === 'flowIn')).toBe(true);
    expect(where(unused, 'flowIn')).toBe(1);

    const unassigned = assignChannel(unused, 'flowIn', { kind: 'unassigned' });
    expect(where(unassigned, 'flowIn')).toBe(0);

    const back = assignChannel(unassigned, 'flowIn', { kind: 'stage', stageId: 'intake', item: 'inflow' });
    expect(where(back, 'flowIn')).toBe(1);
  });

  /** 씨앗의 이유(«사업장 전체 전력»)가 단계를 오갔다고 사라지면 다시 쓸 수 없다 */
  it('사용 안 함을 다시 고르면 적어 둔 이유가 남는다', () => {
    const seed = standardProcess();
    const again = assignChannel(seed, 'power', { kind: 'unused' });
    expect(again.excluded.find((x) => x.key === 'power')?.reason).toContain('사업장 전체');
  });

  it('없는 단계를 가리키면 아무것도 바꾸지 않는다', () => {
    const seed = standardProcess();
    expect(assignChannel(seed, 'pHOut', { kind: 'stage', stageId: 'nope', item: 'pH' })).toBe(seed);
  });

  it('채널 없이 정한 지점은 건드리지 않는다', () => {
    const moved = assignChannel(standardProcess(), 'TOCOut', { kind: 'stage', stageId: 'primary', item: 'TOC' });
    expect(moved.stages.find((s) => s.id === 'primary')!.channels).toEqual([
      { key: null, item: 'TOC' },
      { key: 'TOCOut', item: 'TOC' },
    ]);
  });
});

/** 채널 표에 줄이 없는 지점(1차 침전 TOC)은 단계 편집에서만 뺀다 */
describe('채널 없이 정한 지점', () => {
  it('그 지점만 빠지고 같은 단계의 채널은 남는다', () => {
    const withBoth = assignChannel(standardProcess(), 'TOCOut', { kind: 'stage', stageId: 'primary', item: 'TOC' });
    const removed = removeChannel(withBoth, 'primary', 0);
    expect(removed.stages.find((s) => s.id === 'primary')!.channels).toEqual([{ key: 'TOCOut', item: 'TOC' }]);
  });
});

describe('채널 연결 표', () => {
  const received = ['pHOut', 'flowOut', 'discharging', 'intervalSeconds', 'newProbe', 'pHIn'];

  /** 받는데 어디에도 없는 채널은 «정하기 전»으로 떠야 한다 — 조용히 버리면 아무도 모른다 */
  it('받는 채널 + 공정에 걸린 채널 + 뺀 채널이 한 줄씩이고 메타 채널은 싣지 않는다', () => {
    const rows = channelRows(standardProcess(), received, isMetaChannel);
    const keys = rows.map((r) => r.key);
    expect(keys.slice(0, 4)).toEqual(['pHOut', 'flowOut', 'newProbe', 'pHIn']);
    expect(keys).not.toContain('discharging');
    expect(keys).toContain('TNOut');
    expect(new Set(keys).size).toBe(keys.length);
    expect(unassignedCount(rows)).toBe(1);
  });

  /** 고를 때마다 정렬하면 방금 만진 줄이 다른 자리로 튄다 */
  it('연결을 바꿔도 줄 순서가 그대로다', () => {
    const before = channelRows(standardProcess(), received, isMetaChannel).map((r) => r.key);
    const changed = assignChannel(standardProcess(), 'pHOut', { kind: 'unassigned' });
    const after = channelRows(changed, received, isMetaChannel).map((r) => r.key);
    expect(after).toEqual(before);
  });

  it('이름으로 항목을 아는 채널만 항목이 고정되고, 모르는 채널은 사용자가 고른다', () => {
    const byKey = new Map(channelRows(standardProcess(), received, isMetaChannel).map((r) => [r.key, r]));
    expect(byKey.get('pHOut')).toMatchObject({ item: 'pH', itemFixed: true });
    expect(byKey.get('pHIn')).toMatchObject({ item: 'inletPH', itemFixed: true });
    expect(byKey.get('newProbe')).toMatchObject({ item: null, itemFixed: false });
  });

  it('단계를 삭제하면 그 채널이 정하기 전으로 돌아온다', () => {
    const { process: without } = removeStage(standardProcess(), 'advanced');
    const rows = channelRows(without, received, isMetaChannel);
    expect(rows.find((r) => r.key === 'pHOut')?.target).toEqual({ kind: 'unassigned' });
  });
});
