import { describe, expect, it } from 'vitest';
import { TIMELINE_POINT_COUNT, minutesToSamples } from '@/shared/lib/timeline';
import { RIBBON_SCORE_BUCKET_MINUTES } from '../config/constants';
import { downsampleScores } from './downsample-scores';

/**
 * **1440점을 970px에 그리면 픽셀당 4.3점이라 선이 털로 보였다** `[사용자 지적 2026-09-08]`.
 * 솎되 **잃으면 안 되는 것**이 둘 있다 — 봉우리와 결측이다.
 */
describe('이상 점수 솎기', () => {
  it('버킷 최댓값을 쓴다 — 봉우리를 깎지 않는다', () => {
    expect(downsampleScores([10, 20, 91, 15, 12, 11], 6)).toEqual([91]);
  });

  /**
   * 평균이었다면 26으로 내려가 **위험 경계(80)를 넘은 사실 자체가 사라진다.**
   * 이 축이 답하는 질문이 «오늘 언제 위험했나»라서 최댓값이 정보를 잃지 않는 방향이다.
   */
  it('평균으로 솎았다면 사라졌을 값을 남긴다', () => {
    const bucket = [10, 20, 91, 15, 12, 11];
    const mean = bucket.reduce((a, b) => a + b, 0) / bucket.length;
    expect(mean).toBeLessThan(80);
    expect(downsampleScores(bucket, 6)[0]).toBeGreaterThanOrEqual(80);
  });

  /** 버킷 전체가 결측이면 결측이다 — 0으로도, 앞뒤 값으로도 메우지 않는다(E4) */
  it('전부 결측인 버킷은 null이다', () => {
    expect(downsampleScores([null, null, null], 3)).toEqual([null]);
  });

  /** 일부만 결측이면 아는 값을 쓴다 — 통째로 구멍을 내면 있던 값이 사라진다 */
  it('일부만 결측이면 아는 값의 최댓값이다', () => {
    expect(downsampleScores([null, 40, null, 55, null, null], 6)).toEqual([55]);
  });

  it('결측 버킷이 계열 가운데에서 구멍으로 남는다', () => {
    const scores = [1, 2, 3, null, null, null, 7, 8, 9];
    expect(downsampleScores(scores, 3)).toEqual([3, null, 9]);
  });

  /** 마지막 버킷이 모자라도 버리지 않는다 — 가장 최근 값이 잘리면 «지금»이 사라진다 */
  it('나누어떨어지지 않는 꼬리도 한 버킷이 된다', () => {
    expect(downsampleScores([1, 2, 3, 4, 5], 2)).toEqual([2, 4, 5]);
  });

  it('버킷이 1 이하면 원본 그대로다', () => {
    const scores = [1, null, 3];
    expect(downsampleScores(scores, 1)).toEqual(scores);
    expect(downsampleScores(scores, 0)).toEqual(scores);
  });

  /**
   * **분으로 적은 값이 실제 점 수로 옮겨지는지 잰다.** 표본 수를 박아 두면 수집 주기가
   * 바뀔 때 조용히 다른 시간을 뜻하게 된다(`[INC-111]`).
   */
  it('창 전체를 솎으면 화면에 그릴 만한 점 수가 된다', () => {
    const stride = minutesToSamples(RIBBON_SCORE_BUCKET_MINUTES);
    const full = Array.from({ length: TIMELINE_POINT_COUNT }, () => 30);
    const buckets = downsampleScores(full, stride);

    expect(buckets).toHaveLength(TIMELINE_POINT_COUNT / stride);
    /* `dataviz` — 1000점 미만이면 SVG로 그려도 된다 */
    expect(buckets.length).toBeLessThan(1000);
  });
});
