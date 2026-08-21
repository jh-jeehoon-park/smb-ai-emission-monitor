import { describe, expect, it } from 'vitest';
import { ALL_PROCESS_STAGES, PROCESS_STAGES } from '@/entities/process';
import { resolveProcess } from './lib/resolve';
import { parseStageSettings } from './lib/storage';

const SITE = 'S-02';

describe('공정 구성 — 설정이 없을 때', () => {
  /**
   * 비어 있는 것을 "아무 단계도 없다"로 읽으면 처음 들어온 사업장의 공정도가 빈 화면이 된다.
   * 회의가 정한 방향은 **표준이 기본이고 사용자가 덜어내는 것**이다 `[회의 2026-08-20]`.
   */
  it('표준 5단계가 전부 켜진다', () => {
    const { stages, disabled, isUserSet } = resolveProcess(null, SITE);
    expect(stages.map((s) => s.stage.id)).toEqual(PROCESS_STAGES.map((s) => s.id));
    expect(disabled).toHaveLength(0);
    expect(isUserSet).toBe(false);
  });

  /**
   * 회의가 공정별 모니터링을 요구하며 예시를 줬다 — 유입에 유량, 1차 침전에 TOC
   * `[회의 2026-08-20]`. 그것을 기본값으로 쓰지 않으면 요구한 화면이 빈 상태로만 보인다.
   */
  it('회의가 예시로 든 단계는 기본값을 갖는다', () => {
    const byId = new Map(
      resolveProcess(null, SITE).stages.map((s) => [s.stage.id, s.codes]),
    );
    expect(byId.get('intake')).toContain('flow');
    expect(byId.get('primary')).toContain('TOC');
    /* 방류구는 계측 사양의 수질 8종 + 방류 유량이다 */
    expect(byId.get('advanced')).toContain('pH');
    expect(byId.get('advanced')!.length).toBeGreaterThan(5);
  });

  /** 근거가 없는 단계는 비운다 — 지어내면 없는 계측을 주장한다(TBD-42·TBD-53) */
  it('근거가 없는 단계는 비어 있다', () => {
    const byId = new Map(
      resolveProcess(null, SITE).stages.map((s) => [s.stage.id, s.codes]),
    );
    expect(byId.get('biological')).toHaveLength(0);
    expect(byId.get('secondary')).toHaveLength(0);
  });

  /** 플러스 알파 단계의 목록이 오면 기본으로 꺼져 있어야 한다 — 없는 공정을 그리지 않는다 */
  it('플러스 알파 단계는 기본으로 꺼진다', () => {
    const optional = ALL_PROCESS_STAGES.filter((s) => s.optional);
    const { stages } = resolveProcess(null, SITE);
    for (const stage of optional) {
      expect(stages.some((s) => s.stage.id === stage.id)).toBe(false);
    }
  });
});

describe('공정 구성 — 사용자가 설정했을 때', () => {
  const settings = {
    [SITE]: {
      biological: { enabled: false, codes: [] },
      intake: { enabled: true, codes: ['flow' as const, 'current' as const] },
    },
  };

  it('끈 단계는 목록에서 빠지고 꺼진 쪽에 담긴다', () => {
    const { stages, disabled } = resolveProcess(settings, SITE);
    expect(stages.some((s) => s.stage.id === 'biological')).toBe(false);
    expect(disabled.map((s) => s.id)).toContain('biological');
  });

  /** 조용히 빼면 누락으로 보인다 — 화면이 "몇 개를 껐다"를 적을 수 있어야 한다 */
  it('켠 것과 끈 것을 합치면 최대 공정이 된다', () => {
    const { stages, disabled } = resolveProcess(settings, SITE);
    expect(stages.length + disabled.length).toBe(ALL_PROCESS_STAGES.length);
  });

  it('설정한 단계는 그 항목을 갖는다', () => {
    const intake = resolveProcess(settings, SITE).stages.find((s) => s.stage.id === 'intake');
    expect(intake?.codes).toEqual(['flow', 'current']);
  });

  it('설정하지 않은 단계는 표준 그대로 켜지고 기본값을 갖는다', () => {
    const advanced = resolveProcess(settings, SITE).stages.find(
      (s) => s.stage.id === 'advanced',
    );
    expect(advanced).toBeDefined();
    expect(advanced?.codes).toContain('pH');
  });

  /**
   * **사용자가 비운 것과 설정하지 않은 것은 다르다.** 다 지운 단계에 기본값을 되돌리면
   * 사용자가 끈 것이 살아나 조작이 되지 않는다.
   */
  it('항목을 다 지운 단계는 기본값으로 되돌아가지 않는다', () => {
    const cleared = { [SITE]: { advanced: { enabled: true, codes: [] } } };
    const advanced = resolveProcess(cleared, SITE).stages.find(
      (s) => s.stage.id === 'advanced',
    );
    expect(advanced?.codes).toHaveLength(0);
  });

  it('다른 사업장에는 영향을 주지 않는다 — 사업장이 첫 축이다', () => {
    expect(resolveProcess(settings, 'S-09').stages).toHaveLength(PROCESS_STAGES.length);
    expect(resolveProcess(settings, 'S-09').isUserSet).toBe(false);
  });
});

/**
 * 저장값은 사용자가 콘솔에서 고칠 수 있고 옛 판이 남아 있을 수 있다.
 * **모르는 것을 버린다** — 타입 단언으로 넘기면 그 거짓이 공정도까지 흘러가 없는 단계를 그린다.
 */
describe('저장값 검증', () => {
  it('모르는 단계 id를 버린다', () => {
    const parsed = parseStageSettings({ [SITE]: { nope: { enabled: true, codes: [] } } });
    expect(parsed?.[SITE]).toBeUndefined();
  });

  it('모르는 항목 코드를 버린다', () => {
    const parsed = parseStageSettings({
      [SITE]: { intake: { enabled: true, codes: ['flow', 'BOD'] } },
    });
    expect(parsed?.[SITE]?.intake?.codes).toEqual(['flow']);
  });

  /** 끄면 그 단계가 화면에서 사라져 없는 공정이 된다 — 망가진 값은 켜 두는 쪽이 안전하다 */
  it('enabled가 망가졌으면 켠 것으로 본다', () => {
    const parsed = parseStageSettings({ [SITE]: { intake: { enabled: 'yes', codes: [] } } });
    expect(parsed?.[SITE]?.intake?.enabled).toBe(true);
  });

  it('객체가 아니면 null이다 — 파싱 실패는 기본값으로 떨어진다', () => {
    expect(parseStageSettings('nope')).toBeNull();
    expect(parseStageSettings(null)).toBeNull();
  });
});
