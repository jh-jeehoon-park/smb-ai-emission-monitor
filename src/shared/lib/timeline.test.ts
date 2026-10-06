import { describe, expect, it } from 'vitest';
import { SITE_SCENARIOS } from '@/shared/config/demo-scenario';
import { COLLECTION_INTERVAL_MINUTES, HISTORY_WINDOW_HOURS } from '@/shared/config/measurement';
import {
  EVENT_LENGTH_SAMPLES,
  TIMELINE_POINT_COUNT,
  countDischargeHours,
  getOutageWindow,
  isDischargingAt,
  minutesToSamples,
  timelineIndexAt,
  timelineIsoAt,
} from './timeline';

const LAST = TIMELINE_POINT_COUNT - 1;

/**
 * **구간은 표본 수가 아니라 시간으로 정해져 있어야 한다.**
 *
 * 표본 수를 박아 두면 수집 주기를 바꿀 때 구간이 조용히 늘거나 준다 — 5분 주기의 `36`은
 * 3시간이지만 1분 주기에서는 36분이고, 화면은 그대로 그려져 틀린 것을 알아챌 방법이 없다.
 * 실제로 주기를 1분으로 옮길 때 사건 구간·두절 구간·파형 주기가 다 같이 어긋났다.
 */
describe('구간 길이는 수집 주기가 바뀌어도 같은 시간을 뜻한다', () => {
  it('시간축이 조회 창 전체를 덮는다', () => {
    expect(TIMELINE_POINT_COUNT * COLLECTION_INTERVAL_MINUTES).toBe(HISTORY_WINDOW_HOURS * 60);
  });

  it('사건 구간은 3시간이다', () => {
    expect(EVENT_LENGTH_SAMPLES * COLLECTION_INTERVAL_MINUTES).toBe(3 * 60);
  });

  /**
   * 시나리오의 구간 위치도 표본 수로 적혀 있었다(`96`·`132`·`288`). 주기를 옮기면 8시간 전
   * 두절이 1.6시간 전으로 밀리는데, 화면에는 여전히 두절 구간이 그려져 아무도 모른다.
   * **벽시계로 못박아** 되돌아가면 걸리게 한다.
   */
  it('S-02의 두절이 8시간 전에 시작한다', () => {
    const window = getOutageWindow('S-02')!;
    const endMs = new Date(timelineIsoAt(LAST)).getTime();
    const hoursAgo = (endMs - new Date(window.fromIso).getTime()) / 3_600_000;

    /* 시작 표본 자신을 포함해 세므로 마지막 표본과의 거리는 정확히 한 표본만큼 짧다 */
    expect(hoursAgo).toBeLessThanOrEqual(8);
    expect(hoursAgo).toBeGreaterThan(8 - (COLLECTION_INTERVAL_MINUTES + 1) / 60);
  });
});

describe('timelineIndexAt', () => {
  it('timelineIsoAt의 역함수다', () => {
    for (const index of [0, 1, 137, LAST]) {
      expect(timelineIndexAt(timelineIsoAt(index))).toBe(index);
    }
  });

  /**
   * 예전에는 양 끝으로 클램프했다. 그러면 사흘 전 알람이 첫 표본을 가리키고 화면은 그 값을
   * **그 알람의 계측값이라 적는다** — 틀렸다는 표시가 어디에도 남지 않는다.
   */
  it('창보다 오래된 시각은 null이다 — 첫 표본으로 묶지 않는다', () => {
    expect(timelineIndexAt('2020-01-01T00:00:00Z')).toBeNull();
  });

  it('창보다 미래인 시각은 null이다 — 마지막 표본으로 묶지 않는다', () => {
    expect(timelineIndexAt('2099-01-01T00:00:00Z')).toBeNull();
  });

  it('창의 양 끝 표본은 null이 아니다 (경계를 통째로 잘라내지 않았다)', () => {
    expect(timelineIndexAt(timelineIsoAt(0))).toBe(0);
    expect(timelineIndexAt(timelineIsoAt(LAST))).toBe(LAST);
  });
});

describe('isDischargingAt — 모름과 아님을 가른다(E4)', () => {
  /** 통신 두절 사업장. 방류가 없었던 것이 아니라 수신하지 못한 것이다 */
  it('두절 사업장은 false가 아니라 null이다', () => {
    const offline = SITE_SCENARIOS.find((s) => !s.online)!;
    expect(isDischargingAt(offline.id, LAST)).toBeNull();
    expect(isDischargingAt(offline.id, 0)).toBeNull();
  });

  it('잠시 끊겼던 구간도 null이다 — 그 시간의 방류 여부는 모른다', () => {
    const brief = SITE_SCENARIOS.find((s) => s.online && s.outageStartMinutesAgo !== null)!;
    /* 시나리오는 **분**으로 적혀 있다. 표본 번호로 바로 쓰면 주기가 1분일 때만 우연히 맞는다 */
    const inside = TIMELINE_POINT_COUNT - minutesToSamples(brief.outageStartMinutesAgo!);
    expect(isDischargingAt(brief.id, inside)).toBeNull();
  });

  it('중단 구간이 없는 사업장은 전 구간 방류다', () => {
    const always = SITE_SCENARIOS.find(
      (s) => s.online && s.dischargeGap === null && s.outageStartMinutesAgo === null,
    )!;
    expect(countDischargeHours(always.id, TIMELINE_POINT_COUNT)).toBe(24);
  });
});

describe('countDischargeHours', () => {
  it('두절 사업장은 0시간이 아니라 null이다', () => {
    const offline = SITE_SCENARIOS.find((s) => !s.online)!;
    expect(countDischargeHours(offline.id, TIMELINE_POINT_COUNT)).toBeNull();
  });

  /**
   * 실증 데이터(진유원 272일)의 방류 비율은 88.3%다. 시연 10개소가 그 근처에 있어야
   * "간헐방류"가 데이터에서 온 성질이라고 말할 수 있다.
   */
  it('수신 사업장 전체 방류 비율이 데이터셋 근처다', () => {
    const hours = SITE_SCENARIOS.map((s) => countDischargeHours(s.id, TIMELINE_POINT_COUNT)).filter(
      (h): h is number => h !== null,
    );
    const ratio = hours.reduce((a, b) => a + b, 0) / (hours.length * 24);

    expect(ratio).toBeGreaterThanOrEqual(0.85);
    expect(ratio).toBeLessThanOrEqual(0.92);
  });

  /** 272일 중 15일(5.5%)은 방류가 아예 없었다. 그 상태를 시연에서 볼 수 있어야 한다 */
  it('배출이 전혀 없는 사업장이 하나 있다', () => {
    const zero = SITE_SCENARIOS.filter(
      (s) => countDischargeHours(s.id, TIMELINE_POINT_COUNT) === 0,
    );
    expect(zero).toHaveLength(1);
  });

  it('부분 방류 사업장이 있다 — 24h도 0h도 아닌 값', () => {
    const partial = SITE_SCENARIOS.map((s) => countDischargeHours(s.id, TIMELINE_POINT_COUNT)).filter(
      (h) => h !== null && 0 < h && h < 24,
    );
    expect(partial.length).toBeGreaterThanOrEqual(2);
  });

  it('창을 좁히면 값이 늘지 않는다', () => {
    for (const scenario of SITE_SCENARIOS) {
      const day = countDischargeHours(scenario.id, TIMELINE_POINT_COUNT);
      const sixHours = countDischargeHours(scenario.id, TIMELINE_POINT_COUNT / 4);
      if (day === null || sixHours === null) continue;
      expect(sixHours).toBeLessThanOrEqual(day);
      expect(sixHours).toBeLessThanOrEqual(6);
    }
  });
});

