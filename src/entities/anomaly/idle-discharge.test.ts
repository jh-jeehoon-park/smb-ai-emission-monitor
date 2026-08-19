import { describe, expect, it } from 'vitest';
import { SITE_SCENARIOS } from '@/shared/config/demo-scenario';
import { PROVISIONAL_IDLE_DISCHARGE_MIN_SAMPLES } from '@/shared/config/provisional';
import {
  TIMELINE_POINT_COUNT,
  isDischargingAt,
  isMissingAt,
  isTreatmentIdleAt,
} from '@/shared/lib/timeline';
import { getMeasurementSeries } from '@/entities/measurement';
import { canJudgeIdleDischarge, findIdleDischargeRuns } from './lib/idle-discharge';

/** 구간을 심어 둔 사업장 — 시연이 의미 있으려면 최소 1개소는 잡혀야 한다 */
const SEEDED = SITE_SCENARIOS.filter((s) => s.idleDischargeWindow !== null).map((s) => s.id);

describe('방지시설 미가동 방류 의심 — 구간 탐지', () => {
  it('구간을 심어 둔 사업장이 있다', () => {
    expect(SEEDED.length).toBeGreaterThan(0);
  });

  it('심어 둔 사업장에서 의심 구간이 잡힌다', () => {
    expect(findIdleDischargeRuns('S-02').length).toBeGreaterThan(0);
  });

  it('심지 않은 사업장은 0건이다', () => {
    const clean = SITE_SCENARIOS.find((s) => s.online && s.idleDischargeWindow === null)!;
    expect(findIdleDischargeRuns(clean.id)).toEqual([]);
  });

  it('짧은 구간은 임계값 미만이면 잡지 않는다', () => {
    const long = findIdleDischargeRuns('S-02', 1).length;
    const strict = findIdleDischargeRuns('S-02', TIMELINE_POINT_COUNT).length;
    expect(long).toBeGreaterThan(0);
    expect(strict).toBe(0);
  });

  it('기본 임계값은 임시값에서 온다 — 화면이 숫자를 따로 갖지 않는다', () => {
    expect(findIdleDischargeRuns('S-02')).toEqual(
      findIdleDischargeRuns('S-02', PROVISIONAL_IDLE_DISCHARGE_MIN_SAMPLES),
    );
  });
});

/**
 * **모르는 시간을 의심으로도, 무혐의로도 적지 않는다.**
 * 통신이 끊긴 사업장이 "의심 0건"으로 나오면 깨끗한 사업장으로 둔갑한다(E4).
 */
describe('결측 처리(E4)', () => {
  it('전 구간 두절 사업장은 판정 자체가 불가능하다', () => {
    expect(canJudgeIdleDischarge('S-04')).toBe(false);
    expect(findIdleDischargeRuns('S-04')).toEqual([]);
  });

  it('수신되는 사업장은 판정할 수 있다', () => {
    expect(canJudgeIdleDischarge('S-02')).toBe(true);
  });

  it('두절 구간과 겹친 표본은 의심으로 세지 않는다', () => {
    // S-06은 두절 구간과 일부러 겹쳐 두었다
    for (const run of findIdleDischargeRuns('S-06', 1)) {
      for (let i = run.from; i <= run.to; i += 1) {
        expect(isMissingAt('S-06', i)).toBe(false);
      }
    }
  });

  it('구간 안의 모든 표본이 방류 중이면서 미가동이다', () => {
    for (const run of findIdleDischargeRuns('S-02')) {
      for (let i = run.from; i <= run.to; i += 1) {
        expect(isDischargingAt('S-02', i)).toBe(true);
        expect(isTreatmentIdleAt('S-02', i)).toBe(true);
      }
    }
  });
});

/**
 * 판정과 화면이 **한 원천에서 나와야 한다.** 계측 fixture가 전류를 그대로 흘리면
 * 이상 탐지 화면은 "미가동"이라 적는데 시계열 차트에는 전류가 도는 모순이 생긴다.
 */
describe('계측값과 판정이 어긋나지 않는다', () => {
  const points = getMeasurementSeries('S-02');

  it('의심 구간의 전류·전력이 0이다', () => {
    for (const run of findIdleDischargeRuns('S-02')) {
      for (let i = run.from; i <= run.to; i += 1) {
        expect(points[i]!.current).toBe(0);
        expect(points[i]!.power).toBe(0);
      }
    }
  });

  it('그 구간에도 유량은 흐른다 — 멈춘 채 방류가 이어진 것이 정의다', () => {
    for (const run of findIdleDischargeRuns('S-02')) {
      expect(points[run.from]!.flow).not.toBe(0);
      expect(points[run.from]!.flow).not.toBeNull();
    }
  });

  it('구간 밖에서는 전류가 돈다', () => {
    const runs = findIdleDischargeRuns('S-02');
    const inRun = (i: number) => runs.some((r) => i >= r.from && i <= r.to);
    const outside = points.filter((p, i) => !inRun(i) && p.current !== null);
    expect(outside.every((p) => p.current! > 0)).toBe(true);
  });
});
