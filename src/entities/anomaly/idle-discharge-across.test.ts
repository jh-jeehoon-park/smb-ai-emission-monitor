import { describe, expect, it } from 'vitest';
import { GOV_MUNICIPALITY } from '@/entities/user';
import { sitesIn } from '@/entities/site';
import {
  canJudgeIdleDischarge,
  findIdleDischargeRuns,
  idleDischargeAcross,
  tallyIdleDischarge,
} from './index';

const ANDONG_IDS = sitesIn(GOV_MUNICIPALITY).map((site) => site.id);

/**
 * **두절을 0으로 세지 않는다**(**E4**).
 *
 * 단일 사업장 화면은 두절일 때 *"판정할 수 없습니다 … 의심 0건이 아닙니다"* 라고 적는다.
 * 여러 곳을 합치는 자리에서는 그 위험이 훨씬 크다 — 두절 한 곳이 정상 한 곳에 섞여
 * 사라지고, 감독자가 `0`을 보고 *"관내가 깨끗하다"* 로 읽으면 그 판단은 거짓 근거 위에 선다.
 */
describe('관내 방류 의심 집계', () => {
  it('두절 사업장은 0이 아니라 판정 불가다', () => {
    const verdicts = idleDischargeAcross(ANDONG_IDS);
    const offline = verdicts.find((v) => v.siteId === 'S-04')!;

    expect(canJudgeIdleDischarge('S-04')).toBe(false);
    expect(offline.runs).toBeNull();
    expect(offline.runs).not.toBe(0);
  });

  it('판정 불가를 의심 개소에 더하지 않는다', () => {
    const tally = tallyIdleDischarge(idleDischargeAcross(ANDONG_IDS));

    expect(tally.unjudged).toBe(1);
    expect(tally.suspected + tally.unjudged).toBeLessThanOrEqual(ANDONG_IDS.length);
  });

  it('두 수를 함께 낸다 — 어느 쪽도 다른 쪽을 삼키지 않는다', () => {
    const tally = tallyIdleDischarge([
      { siteId: 'A', runs: 0 },
      { siteId: 'B', runs: null },
      { siteId: 'C', runs: 2 },
    ]);

    expect(tally).toEqual({ suspected: 1, unjudged: 1, runs: 2 });
  });

  /** 두 화면이 같은 구간을 다르게 세면 어느 쪽이 맞는지 알 방법이 없다 */
  it('단일 사업장 화면과 같은 수를 센다', () => {
    for (const { siteId, runs } of idleDischargeAcross(ANDONG_IDS)) {
      if (runs === null) continue;
      expect(runs).toBe(findIdleDischargeRuns(siteId).length);
    }
  });

  it('빈 목록은 빈 집계다', () => {
    expect(tallyIdleDischarge(idleDischargeAcross([]))).toEqual({
      suspected: 0,
      unjudged: 0,
      runs: 0,
    });
  });
});
