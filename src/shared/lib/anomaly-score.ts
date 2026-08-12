import { getScenario, siteSeed } from '@/shared/config/demo-scenario';
import { clamp, createRng } from '@/shared/lib/prng';
import { EVENT_START_INDEX, TIMELINE_POINT_COUNT, isMissingAt } from '@/shared/lib/timeline';

/**
 * 이상 점수 계열을 만드는 **유일한** 공식.
 *
 * 예전에는 사업장 카드(스파크라인)와 상세 패널이 각자 점수를 만들어서 같은 사업장인데
 * 91과 88이 동시에 보였다. 두 slice가 서로를 참조할 수 없으니(FSD) 공식을 여기에 두고
 * 양쪽이 같은 함수를 부른다.
 */
export function buildAnomalyScores(siteId: string): (number | null)[] {
  const scenario = getScenario(siteId);
  const rng = createRng(siteSeed(siteId, 486213));

  return Array.from({ length: TIMELINE_POINT_COUNT }, (_, i) => {
    if (isMissingAt(siteId, i)) return null;

    const base = scenario.baseScore + Math.sin(i / 29) * 6 + (rng() - 0.5) * 7;
    const event =
      i >= EVENT_START_INDEX ? ((i - EVENT_START_INDEX) / 36) ** 1.6 * scenario.eventRise : 0;
    return Math.round(clamp(base + event, 0, 100));
  });
}

/** 통신이 끊겼으면 현재 점수가 없다. 0이 아니라 null이다(E4) */
export function latestScore(scores: (number | null)[]): number | null {
  return [...scores].reverse().find((s) => s !== null) ?? null;
}

/** 카드용 스파크라인 — 같은 계열을 균등 간격으로 솎아낸다 */
export function downsample(scores: (number | null)[], count: number): (number | null)[] {
  const step = Math.max(1, Math.floor(scores.length / count));
  const out: (number | null)[] = [];
  for (let i = scores.length - (count - 1) * step - 1; i < scores.length; i += step) {
    out.push(scores[Math.max(0, i)] ?? null);
  }
  return out;
}
