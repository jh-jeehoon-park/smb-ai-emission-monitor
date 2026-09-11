import { describe, expect, it } from 'vitest';
import { findIdleDischargeRuns } from '@/entities/anomaly';
import { SITE_SCENARIOS } from '@/shared/config/demo-scenario';
import { TIMELINE_POINT_COUNT, isMissingAt } from '@/shared/lib/timeline';
import { buildRunBands, type Band } from './run-bands';

const SITES = SITE_SCENARIOS.map((s) => s.id);
/** 의심 구간이 실제로 있는 사업장. 없으면 그 검사가 빈 배열을 검사하게 된다 */
const SUSPECT_SITE = SITES.find((id) => findIdleDischargeRuns(id).length > 0)!;
/** 전 구간 두절인 사업장 */
const DARK_SITE = SITES.find(
  (id) => isMissingAt(id, 0) && isMissingAt(id, TIMELINE_POINT_COUNT - 1),
)!;

const ordered = (bands: Band[]) =>
  bands.every((b, i) => b.fromPct < b.toPct && (i === 0 || bands[i - 1]!.toPct <= b.fromPct));

describe('가동 ↔ 방류 두 줄', () => {
  it('모든 구간이 0~100 안에서 순서대로 놓인다', () => {
    for (const id of SITES) {
      const bands = buildRunBands(id);
      for (const key of ['running', 'discharging', 'missing', 'suspect'] as const) {
        for (const b of bands[key]) {
          expect(b.fromPct, `${id} ${key}`).toBeGreaterThanOrEqual(0);
          expect(b.toPct, `${id} ${key}`).toBeLessThanOrEqual(100);
        }
        expect(ordered(bands[key]), `${id} ${key}`).toBe(true);
      }
    }
  });

  /**
   * **모르는 시간을 이어 붙이지 않는다.** 두절 앞뒤의 가동을 한 구간으로 이으면
   * «그 사이에도 돌고 있었다»가 되어 버린다(E4).
   */
  it('두절 구간과 가동 구간이 겹치지 않는다', () => {
    for (const id of SITES) {
      const { running, missing } = buildRunBands(id);
      for (const m of missing) {
        for (const r of running) {
          expect(r.fromPct >= m.toPct || r.toPct <= m.fromPct, `${id}`).toBe(true);
        }
      }
    }
  });

  /**
   * **의심 구간은 `/anomaly`와 같은 함수에서 온다.** 각자 세면 같은 사업장의 같은 시각을
   * 두 화면이 다르게 판정한다 — 이 검사가 그 통일을 잠근다.
   */
  it('의심 구간 수가 이상 탐지 화면과 같다', () => {
    for (const id of SITES) {
      expect(buildRunBands(id).suspect).toHaveLength(findIdleDischargeRuns(id).length);
    }
  });

  /** 한 표본짜리 구간도 폭을 가져야 한다 — 끝 표본을 포함하지 않으면 폭이 0이 된다 */
  it('의심 구간이 폭을 갖는다', () => {
    const { suspect } = buildRunBands(SUSPECT_SITE);
    expect(suspect.length).toBeGreaterThan(0);
    expect(suspect.every((b) => b.toPct > b.fromPct)).toBe(true);
  });

  /**
   * 전 구간 결측이면 의심 **0건**이 아니라 **모름**이다. 0건으로 적으면 통신이 끊긴
   * 사업장이 깨끗한 사업장으로 둔갑한다(E4).
   */
  it('전 구간 두절이면 판정 불가로 적는다', () => {
    const bands = buildRunBands(DARK_SITE);
    expect(bands.judgeable).toBe(false);
    expect(bands.running).toHaveLength(0);
    expect(bands.discharging).toHaveLength(0);
    expect(bands.missing.length).toBeGreaterThan(0);
  });

  it('수신되는 사업장은 판정할 수 있다', () => {
    const alive = SITES.filter((id) => id !== DARK_SITE);
    expect(alive.every((id) => buildRunBands(id).judgeable)).toBe(true);
  });
});
