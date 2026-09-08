import { describe, expect, it } from 'vitest';
import { contributionEvidence, distributionOf, percentileRank } from './distribution';
import type { MeasurementPoint } from '@/entities/measurement';
import type { Contribution } from '@/entities/anomaly';

/**
 * **기여도 옆에 실측을 둔다** `[사용자 요청 2026-09-08]`.
 *
 * 기여도 34%만으로는 «그래서 그 값이 이상했나»를 알 수 없다. 같은 구간의 분포를 옆에 두면
 * 그 시각의 값이 평소 자리인지 끝자락인지가 보인다 — 모델 산출과 실측을 나란히 두는 것이
 * 이 화면이 XAI 검증 화면이 되는 지점이다(**E3**).
 */
describe('distributionOf', () => {
  it('홀수 길이의 중앙값', () => {
    expect(distributionOf([1, 2, 3])?.median).toBe(2);
  });

  it('짝수 길이는 두 값 사이를 보간한다', () => {
    expect(distributionOf([1, 2, 3, 4])?.median).toBe(2.5);
  });

  /** 이상 구간에는 튀는 값이 끼어 있다 — 평균이면 끌려간다 */
  it('중앙값이 극단값에 끌려가지 않는다', () => {
    expect(distributionOf([1, 2, 3, 4, 1000])?.median).toBe(3);
  });

  it('사분위와 최소·최대를 함께 낸다', () => {
    const d = distributionOf([1, 2, 3, 4, 5])!;
    expect([d.min, d.q1, d.median, d.q3, d.max]).toEqual([1, 2, 3, 4, 5]);
  });

  /** 결측을 0으로 세면 분포가 아래로 끌려 내려간다(**E4**) */
  it('결측은 빼고 센 표본 수를 나른다', () => {
    const d = distributionOf([1, null, 3, null])!;
    expect(d.count).toBe(2);
    expect(d.min).toBe(1);
    expect(d.max).toBe(3);
  });

  /** 하나도 없으면 **0이 아니라 모름**이다 */
  it('값이 하나도 없으면 `null`이다', () => {
    expect(distributionOf([])).toBeNull();
    expect(distributionOf([null, null])).toBeNull();
  });

  it('전부 같은 값이면 상자가 한 점이다', () => {
    const d = distributionOf([7, 7, 7])!;
    expect([d.min, d.q1, d.median, d.q3, d.max]).toEqual([7, 7, 7, 7, 7]);
  });
});

describe('percentileRank', () => {
  it('최솟값과 최댓값이 양 끝에 붙지 않는다 — 같은 값의 가운데를 준다', () => {
    expect(percentileRank([1, 2, 3, 4], 1)).toBe(12.5);
    expect(percentileRank([1, 2, 3, 4], 4)).toBe(87.5);
  });

  it('중간값은 50%다', () => {
    expect(percentileRank([1, 2, 3], 2)).toBeCloseTo(50);
  });

  /** 계단 하나에 0%와 100%가 붙으면 «상위 0%»라는 말이 나온다 */
  it('전부 같은 값이면 50%다', () => {
    expect(percentileRank([5, 5, 5], 5)).toBe(50);
  });

  it('값이 하나도 없으면 `null`이다', () => {
    expect(percentileRank([null, null], 3)).toBeNull();
  });
});

/** 계열이 없는 항목으로 `MeasurementPoint`를 인덱싱하면 `undefined`가 조용히 흐른다 */
const point = (t: string, TOC: number | null): MeasurementPoint =>
  ({ t, TOC }) as unknown as MeasurementPoint;

describe('contributionEvidence', () => {
  const contributions: Contribution[] = [
    { code: 'TOC', label: 'TOC 총유기탄소', weight: 0.34, direction: 'up' },
    { code: 'vibration', label: '진동', weight: 0.1, direction: 'up' },
  ];
  const points = [point('a', 10), point('b', 20), point('c', 30)];

  it('그 시각의 실측과 분포를 함께 낸다', () => {
    const [toc] = contributionEvidence(contributions, points, 2);
    expect(toc!.value).toBe(30);
    expect(toc!.distribution?.median).toBe(20);
    expect(toc!.percentile).toBeCloseTo(83.3, 0);
  });

  /** 진동은 사양이 없어 계열이 없다 `[TBD-49]` — 없는 키로 인덱싱하면 안 된다 */
  it('계열이 없는 항목은 값을 비운다', () => {
    const [, vibration] = contributionEvidence(contributions, points, 2);
    expect(vibration!.value).toBeNull();
    expect(vibration!.distribution).toBeNull();
  });

  /** 기여도는 모델 산출이라 손대지 않는다 */
  it('기여도를 그대로 나른다', () => {
    const [toc] = contributionEvidence(contributions, points, 2);
    expect(toc!.contribution.weight).toBe(0.34);
  });

  it('창 밖 인덱스는 값이 없다 — 분포는 그대로다', () => {
    const [toc] = contributionEvidence(contributions, points, 999);
    expect(toc!.value).toBeNull();
    expect(toc!.percentile).toBeNull();
    expect(toc!.distribution?.count).toBe(3);
  });
});
