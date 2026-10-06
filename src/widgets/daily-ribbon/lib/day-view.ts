import { PROVISIONAL_ANOMALY_BANDS, toStatusLevel } from '@/shared/config/provisional';
import type { StatusLevel } from '@/shared/config/provisional';
import { TIMELINE_POINT_COUNT, minutesToSamples, timelineIsoAt } from '@/shared/lib/timeline';
import { RIBBON_SCORE_BUCKET_MINUTES } from '../config/constants';
import { downsampleScores } from './downsample-scores';
import type { RibbonData } from './ribbon-rows';

export interface DayPoint {
  /** 버킷 한가운데의 시각(ISO). 축이 실제 시각을 쓴다(**E5**) */
  t: string;
  score: number | null;
}

export interface Peak {
  score: number;
  /** **원본 표본의 시각.** 판독줄이 적는 산출 시각이라 여기서 밀리면 안 된다(**E3**) */
  iso: string;
  /**
   * 차트에 점을 놓을 x. **원본 시각을 그대로 주면 점이 그려지지 않는다** — 축이 범주형
   * (버킷 시각의 목록)이라 목록에 없는 값은 좌표로 풀리지 않는다. 실제로 그렇게 최고점
   * 표식이 조용히 사라졌다.
   */
  x: string;
  level: StatusLevel;
}

export interface DayView {
  points: DayPoint[];
  peak: Peak | null;
  outages: { fromIso: string; toIso: string }[];
  dayBreakIso: string | null;
}

/** 위험 구간의 하한. 경계값에서 파생시킨다 — 화면에 박으면 한쪽만 바뀐다 */
export const DANGER_FROM = PROVISIONAL_ANOMALY_BANDS[PROVISIONAL_ANOMALY_BANDS.length - 1]!.min;

/**
 * 차트가 그릴 것을 한 번에 만든다.
 *
 * **최고점은 솎지 않은 원본에서 찾는다.** 솎은 계열에서 고르면 버킷 대표값이 답이 되어
 * 실제 봉우리의 **시각이 최대 한 버킷만큼 밀린다** — 판독줄이 적는 시각이 곧 산출
 * 시각이라(**E3**) 그만큼 어긋나면 안 된다. 점을 놓을 x만 버킷으로 스냅한다.
 */
export function buildDayView(data: RibbonData): DayView {
  const stride = minutesToSamples(RIBBON_SCORE_BUCKET_MINUTES);
  const buckets = downsampleScores(data.scores, stride);

  const points: DayPoint[] = buckets.map((score, i) => ({
    /* 버킷 한가운데. 시작점에 놓으면 마지막 버킷이 오른쪽 끝에서 한 버킷만큼 모자라다 */
    t: timelineIsoAt(Math.min(i * stride + Math.floor(stride / 2), TIMELINE_POINT_COUNT - 1)),
    score,
  }));

  let peak: Peak | null = null;
  data.scores.forEach((score, index) => {
    if (score === null) return;
    if (peak === null || score > peak.score) {
      peak = {
        score,
        iso: timelineIsoAt(index),
        x: nearestPointIso(points, index),
        level: toStatusLevel(score),
      };
    }
  });

  return {
    points,
    peak,
    outages: data.receiving
      .filter((run) => run.state !== 'on')
      .map((run) => ({
        fromIso: nearestPointIso(points, run.from),
        toIso: nearestPointIso(points, run.from + run.length - 1),
      })),
    dayBreakIso: findDayBreak(points),
  };
}

/**
 * 표본 인덱스를 **차트가 아는 x**로 옮긴다.
 *
 * 축이 범주형(버킷 시각의 목록)이라 목록에 없는 시각을 `ReferenceArea`·`ReferenceDot`에
 * 주면 그 도형이 그려지지 않는다 — 두절 구간과 최고점 표식이 **조용히 사라진다.**
 */
function nearestPointIso(points: DayPoint[], sampleIndex: number): string {
  const stride = minutesToSamples(RIBBON_SCORE_BUCKET_MINUTES);
  const bucket = Math.min(Math.max(Math.round(sampleIndex / stride), 0), points.length - 1);
  return points[bucket]!.t;
}

/** 앞 점과 날짜가 달라지는 첫 점. 창 안에 자정이 없으면 `null` */
function findDayBreak(points: DayPoint[]): string | null {
  for (let i = 1; i < points.length; i += 1) {
    if (points[i]!.t.slice(0, 10) !== points[i - 1]!.t.slice(0, 10)) return points[i]!.t;
  }
  return null;
}
