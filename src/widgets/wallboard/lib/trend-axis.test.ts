import { describe, expect, it } from 'vitest';
import { niceCeil, trendTicks } from './trend-axis';

/** 1분 주기 계열의 시각. 시연 ISO는 KST 벽시계라 `Z`를 붙여도 그대로 읽힌다 */
function minuteSeries(startIso: string, count: number): string[] {
  const start = new Date(startIso).getTime();
  return Array.from({ length: count }, (_, i) =>
    new Date(start + i * 60_000).toISOString().replace('.000Z', 'Z'),
  );
}

describe('niceCeil', () => {
  it.each([
    [938, 1000],
    [1000, 1000],
    [1003, 2000],
    [420, 500],
    [180, 200],
    [12, 20],
    [7.5, 10],
  ])('%s → %s', (input, expected) => {
    expect(niceCeil(input)).toBe(expected);
  });

  /**
   * 천장의 절반이 **가운데 눈금**이 된다. `2.5` 계열을 빼 둔 이유가 여기다 —
   * `250`은 두 자리로 읽히지만 `125`는 세 자리라 2~3m 밖에서 한 박자 늦는다.
   */
  it('가운데 눈금도 두 자리 안에서 읽힌다', () => {
    for (const value of [938, 1003, 420, 180, 12, 7.5]) {
      const half = niceCeil(value) / 2;
      const digits = String(half).replace('.', '').replace(/0+$/, '');
      expect(digits.length, `${value} → ${half}`).toBeLessThanOrEqual(2);
    }
  });

  /**
   * **계열이 통째로 비면 `0`이 온다.** 그때 천장을 `0`으로 두면 범위가 0이라 모든 값이 같은
   * 자리에 그려진다 — 그릴 값이 없는 상황이지만 나누기가 먼저 터지지 않아야 한다.
   */
  it('0과 음수에도 양수 천장을 준다', () => {
    expect(niceCeil(0)).toBeGreaterThan(0);
    expect(niceCeil(-5)).toBeGreaterThan(0);
    expect(niceCeil(Number.NaN)).toBeGreaterThan(0);
  });
});

describe('trendTicks', () => {
  const times = minuteSeries('2026-09-11T13:38:00Z', 1440);

  /** 맨 끝 하나만 «지금»이고 나머지는 전부 정시다 */
  it('맨 끝을 뺀 눈금은 전부 정시다', () => {
    const ticks = trendTicks(times, 4, 0.07);
    for (const tick of ticks.slice(0, -1)) {
      expect(tick.label).toMatch(/^\d\d:00$/);
      expect(Number(tick.label.slice(0, 2)) % 4).toBe(0);
    }
  });

  it('맨 끝은 마지막 표본이다 — 그림의 오른쪽 끝이 언제인지가 드러난다', () => {
    const ticks = trendTicks(times, 4, 0.07);
    expect(ticks[ticks.length - 1]!.index).toBe(times.length - 1);
    expect(ticks[ticks.length - 1]!.label).toBe('13:37');
    expect(ticks.map((t) => t.label)).toContain('00:00');
  });

  /**
   * **맨 끝과 붙은 정시 눈금은 빠진다.** `13:38`이 끝이면 `12:00`은 98분 전(6.8%)이라
   * 7% 안에 들어 글자가 겹친다 — 1920×1080 캡처에서 실제로 겹쳤다.
   */
  it('맨 끝에 붙은 정시 눈금을 뺀다', () => {
    const labels = trendTicks(times, 4, 0.07).map((t) => t.label);
    expect(labels).not.toContain('12:00');
    expect(labels).toContain('08:00');
  });

  it('간격을 좁히면 그 눈금이 살아난다', () => {
    expect(trendTicks(times, 4, 0.01).map((t) => t.label)).toContain('12:00');
  });

  it('표본이 둘 미만이면 눈금을 내지 않는다', () => {
    expect(trendTicks([], 4, 0.07)).toEqual([]);
    expect(trendTicks(['2026-09-11T13:38:00Z'], 4, 0.07)).toEqual([]);
  });
});
