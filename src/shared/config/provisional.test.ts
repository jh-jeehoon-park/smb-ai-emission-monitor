import { describe, expect, it } from 'vitest';
import {
  PROVISIONAL_ANOMALY_BANDS,
  PROVISIONAL_ANOMALY_TICKS,
  PROVISIONAL_STATUS_LEVELS,
  anomalyBandLabel,
  toStatusLevel,
} from './provisional';

/**
 * 등급 경계는 프로토타입 임시값이지만(TBD-02), 임시값이라도 경계에서 틀리면
 * 화면 전체가 틀린다. 확정 시 이 테스트의 기대값만 바꾸면 된다.
 */
describe('toStatusLevel — 이상 점수 구간 경계', () => {
  it.each([
    [0, 'normal'],
    [49, 'normal'],
    [50, 'caution'],
    [69, 'caution'],
    [70, 'warning'],
    [79, 'warning'],
    [80, 'critical'],
    [100, 'critical'],
  ])('점수 %i는 %s 등급이다', (score, expected) => {
    expect(toStatusLevel(score)).toBe(expected);
  });

  it('구간에 빈틈이 없다 — 0~100 모든 정수가 어느 한 등급에 속한다', () => {
    for (let score = 0; score <= 100; score += 1) {
      const matched = PROVISIONAL_ANOMALY_BANDS.filter((b) => score >= b.min && score <= b.max);
      expect(matched).toHaveLength(1);
    }
  });

  it('구간이 서로 겹치지 않고 정렬되어 있다', () => {
    PROVISIONAL_ANOMALY_BANDS.forEach((band, i) => {
      const next = PROVISIONAL_ANOMALY_BANDS[i + 1];
      expect(band.min).toBeLessThanOrEqual(band.max);
      if (next) expect(next.min).toBe(band.max + 1);
    });
  });
});

describe('구간 라벨·눈금은 경계값에서 파생된다', () => {
  it('라벨이 경계값과 일치한다', () => {
    PROVISIONAL_ANOMALY_BANDS.forEach((band) => {
      expect(anomalyBandLabel(band.level)).toBe(`${band.min}–${band.max}`);
    });
  });

  it('눈금 개수는 등급 수 + 1이고 마지막은 최대값이다', () => {
    expect(PROVISIONAL_ANOMALY_TICKS).toHaveLength(PROVISIONAL_STATUS_LEVELS.length + 1);
    expect(PROVISIONAL_ANOMALY_TICKS.at(-1)).toBe(100);
  });
});
