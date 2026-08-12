import { describe, expect, it } from 'vitest';
import { SITE_SCENARIOS } from '@/shared/config/demo-scenario';
import { TIMELINE_POINT_COUNT, getOutageWindow, isMissingAt } from '@/shared/lib/timeline';
import { buildAnomalyScores, downsample, latestScore } from './anomaly-score';

const OFFLINE = SITE_SCENARIOS.find((s) => !s.online);
const ONLINE = SITE_SCENARIOS.find((s) => s.online && s.outageStartOffset !== null);

describe('buildAnomalyScores', () => {
  it('시간축 길이만큼 값을 만든다', () => {
    expect(buildAnomalyScores('S-01')).toHaveLength(TIMELINE_POINT_COUNT);
  });

  it('같은 사업장은 몇 번을 호출해도 같은 값을 준다 (SSR/CSR 일치 조건)', () => {
    expect(buildAnomalyScores('S-01')).toEqual(buildAnomalyScores('S-01'));
  });

  it('사업장이 다르면 값도 다르다', () => {
    expect(buildAnomalyScores('S-01')).not.toEqual(buildAnomalyScores('S-05'));
  });

  it('점수는 0~100을 벗어나지 않는다 (사업계획서 p.64)', () => {
    for (const scenario of SITE_SCENARIOS) {
      for (const score of buildAnomalyScores(scenario.id)) {
        if (score === null) continue;
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }
    }
  });

  it('통신 두절 사업장은 전 구간이 결측이다 — 0으로 채우지 않는다(E4)', () => {
    expect(OFFLINE).toBeDefined();
    const scores = buildAnomalyScores(OFFLINE!.id);
    expect(scores.every((s) => s === null)).toBe(true);
    expect(scores).not.toContain(0);
  });

  it('결측 판정은 계측과 같은 함수를 쓴다 — 한쪽만 끊기면 화면이 모순된다', () => {
    expect(ONLINE).toBeDefined();
    buildAnomalyScores(ONLINE!.id).forEach((score, i) => {
      expect(score === null).toBe(isMissingAt(ONLINE!.id, i));
    });
  });
});

describe('latestScore', () => {
  it('마지막 유효값을 준다', () => {
    expect(latestScore([1, 2, 3])).toBe(3);
  });

  it('꼬리가 결측이면 그 앞의 유효값을 준다', () => {
    expect(latestScore([1, 2, null, null])).toBe(2);
  });

  it('전부 결측이면 0이 아니라 null이다', () => {
    expect(latestScore([null, null])).toBeNull();
  });
});

describe('downsample', () => {
  it('요청한 개수만큼 준다', () => {
    expect(downsample(buildAnomalyScores('S-01'), 24)).toHaveLength(24);
  });

  it('마지막 표본은 원본의 마지막 값과 같다 — 카드와 상세가 같은 현재값을 보여야 한다', () => {
    const scores = buildAnomalyScores('S-02');
    expect(downsample(scores, 24).at(-1)).toBe(scores.at(-1));
  });
});

describe('getOutageWindow', () => {
  it('두절 이력이 없으면 null이다 (없는 구간을 만들어내지 않는다)', () => {
    const noOutage = SITE_SCENARIOS.find((s) => s.online && s.outageStartOffset === null);
    expect(noOutage).toBeDefined();
    expect(getOutageWindow(noOutage!.id)).toBeNull();
  });

  it('두절 구간의 시작이 끝보다 앞선다', () => {
    const w = getOutageWindow(ONLINE!.id);
    expect(w).not.toBeNull();
    expect(new Date(w!.fromIso).getTime()).toBeLessThan(new Date(w!.toIso).getTime());
  });
});
