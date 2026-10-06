import { describe, expect, it } from 'vitest';
import type { MeasurementPoint } from '@/entities/measurement';
import { SPARK_MAX_POINTS, thinForCode } from './lib/thin-series';

/**
 * **스파크라인만 솎는다** `[사용자 지적 2026-09-16: 데이터가 올라오기까지 오래 걸린다]`.
 *
 * 1,440점을 약 340px 카드에 그리던 것을 줄인다(`screens.md` §8 `솎기`). 실측으로 응답 뒤
 * 카드에 값이 뜨기까지 **1,278ms → 약 400ms**가 됐다.
 *
 * 여기서 잠그는 것은 «빨라졌는가»가 아니라 **«줄이면서 무엇을 잃지 않는가»**다.
 */
const at = (index: number, value: number | null): MeasurementPoint =>
  ({ t: `2026-09-16T00:${String(index % 60).padStart(2, '0')}:00Z`, pH: value }) as MeasurementPoint;

const ramp = (n: number) => Array.from({ length: n }, (_, i) => at(i, i));

describe('thinForCode — 실루엣을 지키며 점을 줄인다', () => {
  it('상한 이하면 손대지 않는다 — 짧은 계열을 굳이 흔들지 않는다', () => {
    const short = ramp(100);
    expect(thinForCode(short, 'pH')).toBe(short);
  });

  it('상한을 넘으면 그 아래로 줄인다', () => {
    const thinned = thinForCode(ramp(1440), 'pH');
    expect(thinned.length).toBeLessThanOrEqual(SPARK_MAX_POINTS);
    expect(thinned.length).toBeGreaterThan(SPARK_MAX_POINTS / 3);
  });

  /** **평균을 쓰지 않는 이유가 이것이다** — 그린 점은 전부 실제 표본이어야 한다 */
  it('그리는 점이 전부 원본에 있던 표본이다', () => {
    const points = ramp(1440);
    const set = new Set(points);
    for (const p of thinForCode(points, 'pH')) expect(set.has(p)).toBe(true);
  });

  it('시간 순서가 뒤집히지 않는다', () => {
    const points = ramp(1440);
    const index = new Map(points.map((p, i) => [p, i]));
    const thinned = thinForCode(points, 'pH');
    for (let i = 1; i < thinned.length; i += 1) {
      expect(index.get(thinned[i]!)!).toBeGreaterThan(index.get(thinned[i - 1]!)!);
    }
  });

  /**
   * **봉우리와 골이 살아남아야 한다.** 최댓값만 남기면 하한을 밑돈 구간이 선에서 사라져,
   * 화면이 «초과 N건»이라 적는데 선은 한 번도 벗어나지 않은 그림이 된다(pH는 상·하한이 둘 다 있다).
   */
  it('한 점짜리 치솟음과 내리꽂힘을 둘 다 남긴다', () => {
    const points = ramp(1440);
    points[700] = at(700, 9999);
    points[701] = at(701, -9999);

    const values = thinForCode(points, 'pH').map((p) => p.pH);
    expect(values).toContain(9999);
    expect(values).toContain(-9999);
  });

  /** 버킷 전체가 결측이면 결측이다(**E4**) — 끊긴 자리가 선에 그대로 남아야 한다 */
  it('통째로 빈 구간은 빈 채로 남는다', () => {
    const points = ramp(1440);
    for (let i = 400; i < 500; i += 1) points[i] = at(i, null);

    const thinned = thinForCode(points, 'pH');
    expect(thinned.some((p) => p.pH === null)).toBe(true);
  });

  /** 아는 표본이 하나라도 있으면 그것을 쓴다 — 일부 결측을 구멍으로 만들면 있던 값이 사라진다 */
  it('일부만 결측인 구간은 아는 값으로 그린다', () => {
    const points = ramp(40).map((p, i) => (i % 2 === 0 ? at(i, null) : p));
    const thinned = thinForCode(points, 'pH', 10);

    expect(thinned.filter((p) => p.pH !== null).length).toBeGreaterThan(0);
  });

  it('값이 하나도 없는 계열도 그리다 멈추지 않는다', () => {
    const empty = Array.from({ length: 1440 }, (_, i) => at(i, null));
    expect(() => thinForCode(empty, 'pH')).not.toThrow();
    expect(thinForCode(empty, 'pH').every((p) => p.pH === null)).toBe(true);
  });
});
