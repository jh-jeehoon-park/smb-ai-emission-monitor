import { describe, expect, it } from 'vitest';
import { TIMELINE_POINT_COUNT, minutesToSamples, timelineIndexAt } from '@/shared/lib/timeline';
import { getAlarmsForView } from '@/entities/alarm';
import { getAnomalySeries } from '@/entities/anomaly';
import { countOnSamples, toRuns, toState, type RibbonRun, type RibbonState } from './build-ribbon';
import { buildRibbon } from './ribbon-rows';

const ribbonFor = (siteId: string) =>
  buildRibbon(siteId, getAnomalySeries(siteId), getAlarmsForView(siteId));

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
 * **모든 축이 하루를 남김없이 덮어야 한다.** 표본 수가 다르면 같은 x가 서로 다른 시각을
 * 가리켜 두절 빗금이 실제 두절과 다른 자리에 그려진다.
 */
describe('buildRibbon — 축이 어긋나지 않는다', () => {
  it.each(['S-01', 'S-02', 'S-04', 'S-08', 'S-09', 'S-10'])('%s가 하루를 덮는다', (id) => {
    const ribbon = ribbonFor(id);
    expect(sum(ribbon.discharging)).toBe(TIMELINE_POINT_COUNT);
    expect(sum(ribbon.receiving)).toBe(TIMELINE_POINT_COUNT);
    expect(ribbon.scores).toHaveLength(TIMELINE_POINT_COUNT);
  });

  /**
   * **`가동` 행이 걷혔다** `[사용자 요청 2026-09-08]`. 되살리면 계측 계열을 다시 받아야 하고
   * (`point.current`) 그러면 부르는 쪽의 `pending` 관문도 함께 돌아온다 — 값으로 못박는다.
   */
  it('가동 행을 더는 만들지 않는다', () => {
    expect(ribbonFor('S-02')).not.toHaveProperty('running');
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

  it('중단이 마지막에 걸린 사업장은 구간이 끝에서 끊긴다 — 사업장2 S-09', () => {
    const runs = ribbonFor('S-09').discharging;
    expect(states(runs)).toEqual(['on', 'off']);
    expect(runs[1]!.from + runs[1]!.length).toBe(TIMELINE_POINT_COUNT);
  });
});

describe('buildRibbon — 알람 마커', () => {
  /**
   * 표본 번호를 박아 두지 않는다 — 수집 주기가 바뀌면 같은 시각의 표본 번호가 달라진다.
   * 검사할 것은 번호가 아니라 **그 알람의 시각에 놓였는가**다.
   */
  it('사업장1(S-02) 알람 2건이 시간축 끝쪽에 놓인다', () => {
    const alarms = ribbonFor('S-02').alarms;
    expect(alarms).toHaveLength(2);

    for (const alarm of alarms) {
      expect(alarm.index).toBe(timelineIndexAt(alarm.timeIso));
      expect(TIMELINE_POINT_COUNT - 1 - alarm.index).toBeLessThan(minutesToSamples(60));
    }
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

describe('buildRibbon — 배출 없음과 두절은 다른 상태다', () => {
  /** 하루 종일 방류하지 않은 것은 **아는 사실**이라 `off`다. `unknown`이 아니다(**E4**) */
  it('배출 없음 사업장의 방류는 하루 종일 꺼짐이다', () => {
    expect(states(ribbonFor('S-08').discharging)).toEqual(['off']);
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

/**
 * **수신하지 못한 시각의 가동·방류는 모름이다** `[사용자 지적 2026-09-08]`(**E4**).
 *
 * 화면이 세 줄로 서로 모순된 말을 했다 — `수신`은 끊겼다는데 바로 위 `가동`은 그 구간 내내
 * **가동 중이라 주장**했다. 두 줄이 다른 원천에서 오기 때문이다: 가동은 계측 서버의 전류
 * (실측), 수신·방류는 시연 시나리오. 실서버에는 그 두절이 없어 전류가 계속 흘렀다.
 */
describe('buildRibbon — 못 받은 시각을 안다고 적지 않는다(E4)', () => {
  /**
   * **행은 걷혔지만 마스킹은 남는다** `[사용자 요청 2026-09-08]` — 판독줄의 `방류 N시간`이
   * 이 값을 세므로, 못 받은 시간을 방류로 세면 그 숫자가 부풀려진다.
   */
  it('방류의 모름 구간이 수신의 것과 정확히 같은 자리다', () => {
    for (const siteId of ['S-02', 'S-04', 'S-08']) {
      const ribbon = ribbonFor(siteId);
      const unknownAt = (runs: RibbonRun[]) =>
        runs.flatMap((run) =>
          run.state === 'unknown'
            ? Array.from({ length: run.length }, (_, k) => run.from + k)
            : [],
        );

      expect(unknownAt(ribbon.discharging)).toEqual(unknownAt(ribbon.receiving));
    }
  });

  it('통신 두절 사업장은 방류도 모름이다', () => {
    const ribbon = ribbonFor('S-04');
    expect(states(ribbon.receiving)).toEqual(['unknown']);
    expect(states(ribbon.discharging)).toEqual(['unknown']);
  });

  /** 두절이 없는 사업장에서는 아무것도 덮지 않는다 — 멀쩡한 값을 모름으로 만들지 않는다 */
  it('수신이 온전하면 방류에 모름이 없다', () => {
    const ribbon = ribbonFor('S-08');
    expect(states(ribbon.receiving)).toEqual(['on']);
    expect(states(ribbon.discharging)).not.toContain('unknown');
  });
});
