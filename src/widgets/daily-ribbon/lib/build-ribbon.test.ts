import { describe, expect, it } from 'vitest';
import { TIMELINE_POINT_COUNT } from '@/shared/lib/timeline';
import { getAlarmsForView } from '@/entities/alarm';
import { getAnomalySeries } from '@/entities/anomaly';
import { getMeasurementSeries } from '@/entities/measurement';
import { countOnSamples, toRuns, toState, type RibbonRun, type RibbonState } from './build-ribbon';
import { buildRibbon } from './ribbon-rows';

const ribbonFor = (siteId: string) =>
  buildRibbon(
    siteId,
    getMeasurementSeries(siteId),
    getAnomalySeries(siteId),
    getAlarmsForView(siteId),
  );

const sum = (runs: RibbonRun[]) => runs.reduce((acc, run) => acc + run.length, 0);
const states = (runs: RibbonRun[]) => runs.map((run) => run.state);

describe('toRuns — 런렝스', () => {
  it('같은 상태가 이어지면 한 구간으로 묶는다', () => {
    expect(toRuns(['on', 'on', 'on'])).toEqual([{ state: 'on', from: 0, length: 3 }]);
  });

  it('바뀌는 지점에서만 끊는다', () => {
    expect(toRuns(['on', 'off', 'off', 'on'])).toEqual([
      { state: 'on', from: 0, length: 1 },
      { state: 'off', from: 1, length: 2 },
      { state: 'on', from: 3, length: 1 },
    ]);
  });

  it('빈 입력은 빈 구간이다', () => {
    expect(toRuns([])).toEqual([]);
  });
});

describe('toState — 모름을 접지 않는다(E4)', () => {
  it('null은 off가 아니라 unknown이다', () => {
    expect(toState(null)).toBe<RibbonState>('unknown');
    expect(toState(false)).toBe<RibbonState>('off');
    expect(toState(true)).toBe<RibbonState>('on');
  });
});

/**
 * **네 행이 같은 x를 같은 시각으로 써야 한다.** 한 행이라도 표본 수가 다르면
 * 세로로 훑는 순간 서로 다른 시각을 비교하게 되어 이 위젯의 존재 이유가 사라진다.
 */
describe('buildRibbon — 축이 어긋나지 않는다', () => {
  it.each(['S-01', 'S-02', 'S-04', 'S-08', 'S-09', 'S-10'])('%s의 세 행이 하루를 덮는다', (id) => {
    const ribbon = ribbonFor(id);
    expect(sum(ribbon.running)).toBe(TIMELINE_POINT_COUNT);
    expect(sum(ribbon.discharging)).toBe(TIMELINE_POINT_COUNT);
    expect(sum(ribbon.receiving)).toBe(TIMELINE_POINT_COUNT);
    expect(ribbon.scores).toHaveLength(TIMELINE_POINT_COUNT);
  });
});

describe('buildRibbon — 방류 세 상태', () => {
  it('통신 두절 사업장은 전 구간이 모름이다 — 중단이 아니다', () => {
    expect(states(ribbonFor('S-04').discharging)).toEqual(['unknown']);
    expect(states(ribbonFor('S-04').receiving)).toEqual(['unknown']);
  });

  it('배출 없음 사업장은 전 구간이 중단이다 — 모름이 아니다', () => {
    expect(states(ribbonFor('S-08').discharging)).toEqual(['off']);
  });

  it('잠시 끊겼던 사업장은 그 구간만 모름이다', () => {
    const runs = ribbonFor('S-02').discharging;
    expect(states(runs)).toEqual(['on', 'unknown', 'on']);
  });

  it('중단이 마지막에 걸린 사업장은 구간이 끝에서 끊긴다 — 관리자2 S-09', () => {
    const runs = ribbonFor('S-09').discharging;
    expect(states(runs)).toEqual(['on', 'off']);
    expect(runs[1]!.from + runs[1]!.length).toBe(TIMELINE_POINT_COUNT);
  });
});

describe('buildRibbon — 알람 마커', () => {
  it('관리자1(S-02) 알람 2건이 시간축 끝쪽에 놓인다', () => {
    const alarms = ribbonFor('S-02').alarms;
    expect(alarms.map((a) => a.index)).toEqual([285, 284]);
  });

  it('마커가 시간축을 벗어나지 않는다', () => {
    for (const id of ['S-02', 'S-05', 'S-07', 'S-10']) {
      for (const alarm of ribbonFor(id).alarms) {
        expect(alarm.index).toBeGreaterThanOrEqual(0);
        expect(alarm.index).toBeLessThan(TIMELINE_POINT_COUNT);
      }
    }
  });

  it('알람이 없는 사업장은 빈 배열이다 — 0으로 채우지 않는다', () => {
    expect(ribbonFor('S-09').alarms).toEqual([]);
  });
});

describe('buildRibbon — 가동과 방류의 대비', () => {
  /** 상시가동 간헐방류가 그림으로 읽히려면 가동은 이어지고 방류만 끊겨야 한다 */
  it('배출 없음 사업장도 설비는 하루 종일 돈다', () => {
    const ribbon = ribbonFor('S-08');
    expect(states(ribbon.running)).toEqual(['on']);
    expect(states(ribbon.discharging)).toEqual(['off']);
  });
});

describe('countOnSamples — 모름을 0으로 바꿔 적지 않는다(E4)', () => {
  it('하루 내내 모름이면 0이 아니라 null이다', () => {
    expect(countOnSamples(toRuns(['unknown', 'unknown']))).toBeNull();
  });

  it('일부만 모름이면 확인된 수를 돌려준다 — 적게 잡히는 편이 안전하다', () => {
    expect(countOnSamples(toRuns(['on', 'on', 'unknown']))).toBe(2);
  });

  it('전부 꺼짐은 모름이 아니라 0이다 — 배출 없음은 아는 사실이다', () => {
    expect(countOnSamples(toRuns(['off', 'off']))).toBe(0);
  });

  it('통신 두절 사업장의 방류는 null이다', () => {
    expect(countOnSamples(ribbonFor('S-04').discharging)).toBeNull();
  });

  it('배출 없음 사업장의 방류는 0이다 — 두절과 다른 상태다', () => {
    expect(countOnSamples(ribbonFor('S-08').discharging)).toBe(0);
  });
});
