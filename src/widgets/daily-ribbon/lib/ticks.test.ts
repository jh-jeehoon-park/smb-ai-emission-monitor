import { describe, expect, it } from 'vitest';
import { TIMELINE_POINT_COUNT, timelineIsoAt } from '@/shared/lib/timeline';
import { buildTicks } from './ticks';

const ticks = buildTicks(6);

describe('buildTicks — 경과 시간이 아니라 실제 시각(E5)', () => {
  /**
   * 예전 눈금은 `00 06 12 18 24`였다. 시계 시각처럼 보이지만 창 시작부터의 경과
   * 시간이라 알람 시각과 맞춰 볼 수 없었다 — 그 회귀를 막는다.
   */
  it('첫 눈금이 00이 아니라 창이 시작한 실제 시각이다', () => {
    expect(ticks[0]!.label).not.toBe('00');
    expect(ticks[0]!.label).toBe(timelineIsoAt(0).slice(11, 16));
  });

  it('마지막 눈금은 시각이 아니라 지금이다', () => {
    const last = ticks[ticks.length - 1]!;
    expect(last.index).toBe(TIMELINE_POINT_COUNT - 1);
    expect(last.label).toBe('지금');
    expect(last.percent).toBe(100);
  });

  it('라벨이 전부 HH:MM 형식이거나 지금이다', () => {
    for (const tick of ticks) {
      expect(tick.label === '지금' || /^\d{2}:\d{2}$/.test(tick.label)).toBe(true);
    }
  });
});

describe('buildTicks — 자정', () => {
  /** 자정은 6시간 간격에 걸리지 않는다. 걸리기를 기다리면 표시가 영영 안 나온다 */
  it('자정 눈금이 정확히 하나 있다', () => {
    expect(ticks.filter((t) => t.isDayBreak)).toHaveLength(1);
  });

  it('자정 눈금의 시각이 00:00이다', () => {
    expect(ticks.find((t) => t.isDayBreak)!.label).toBe('00:00');
  });

  it('자정 눈금에만 날짜가 붙는다', () => {
    for (const tick of ticks) {
      expect(tick.dateLabel === null).toBe(!tick.isDayBreak);
    }
  });

  it('자정 눈금은 6시간 격자 위에 있지 않다 — 별도로 넣어야만 생긴다', () => {
    const midnight = ticks.find((t) => t.isDayBreak)!;
    expect(midnight.index % (6 * 12)).not.toBe(0);
  });
});

describe('buildTicks — 좌표', () => {
  it('모든 눈금이 0~100% 안에 있다', () => {
    for (const tick of ticks) {
      expect(tick.percent).toBeGreaterThanOrEqual(0);
      expect(tick.percent).toBeLessThanOrEqual(100);
    }
  });

  it('인덱스 순으로 정렬되고 겹치지 않는다', () => {
    const indexes = ticks.map((t) => t.index);
    expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
    expect(new Set(indexes).size).toBe(indexes.length);
  });

  it('6시간 격자가 빠짐없이 들어 있다', () => {
    for (let index = 0; index < TIMELINE_POINT_COUNT; index += 6 * 12) {
      expect(ticks.some((t) => t.index === index)).toBe(true);
    }
  });
});
