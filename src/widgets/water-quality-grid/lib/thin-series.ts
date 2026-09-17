import type { MeasurementPoint, SeriesCode } from '@/entities/measurement';

/**
 * 스파크라인이 그릴 점 수의 상한 `[사용자 지적 2026-09-16: 데이터가 올라오기까지 오래 걸린다]`.
 *
 * 카드는 4열에서 약 340px다. 24시간을 1분 격자로 그리면 **1,440점 · 픽셀당 4.2점**이라
 * 한 픽셀 열에 네 표본의 흔들림이 겹친다 — `screens.md` §8 `솎기`와 `dataviz`(«≥1000점은
 * 솎는다»)가 이미 요구하는 자리인데 이 카드들만 빠져 있었다.
 *
 * **비용도 컸다.** 실측으로 응답이 온 뒤 카드에 값이 뜨기까지 1,278ms였고 그중 **약 990ms가
 * 차트**였다. 점을 360개로 줄이자 548ms가 됐다.
 */
export const SPARK_MAX_POINTS = 360;

/**
 * 한 계열의 실루엣을 지키며 점을 줄인다.
 *
 * **버킷마다 최솟값과 최댓값 표본을 남긴다.** 평균이나 중앙값을 쓰지 않는 이유는 그것이
 * **계측되지 않은 값을 만들기** 때문이다 — 이 저장소가 `?? 0`과 결측 보간을 막아 온 것과
 * 같은 이유다. 여기서 그리는 점은 **전부 실제 표본**이고 각자 자기 시각을 갖는다.
 *
 * **최댓값만 쓰지 않는 이유**(이상 점수 타임라인은 그렇게 한다) — 그 축은 «언제 위험했나»를
 * 묻지만 수질은 **상한과 하한이 둘 다 있다**(pH 5.80–8.60). 최댓값만 남기면 하한을 밑돈
 * 구간이 선에서 사라져, 화면이 «초과 N건»이라 적는데 선은 한 번도 벗어나지 않은 그림이 된다.
 *
 * **버킷 전체가 결측이면 결측이다**(**E4**). 아는 표본이 하나라도 있으면 그 최소·최대를 쓴다 —
 * 일부 결측을 통째로 구멍으로 만들면 있던 값이 사라진다(§8 `솎기`의 규약 그대로다).
 */
export function thinForCode(
  points: MeasurementPoint[],
  code: SeriesCode,
  maxPoints: number = SPARK_MAX_POINTS,
): MeasurementPoint[] {
  if (points.length <= maxPoints) return points;

  /* 버킷마다 최대 두 점이 나오므로 버킷 수는 상한의 절반이다 */
  const bucketCount = Math.max(1, Math.floor(maxPoints / 2));
  const size = Math.ceil(points.length / bucketCount);
  const thinned: MeasurementPoint[] = [];

  for (let start = 0; start < points.length; start += size) {
    const end = Math.min(start + size, points.length);
    let lowAt = -1;
    let highAt = -1;
    let low = Number.POSITIVE_INFINITY;
    let high = Number.NEGATIVE_INFINITY;

    for (let i = start; i < end; i += 1) {
      const value = points[i]![code];
      if (value === null) continue;
      if (value < low) {
        low = value;
        lowAt = i;
      }
      if (value > high) {
        high = value;
        highAt = i;
      }
    }

    /* 아는 표본이 없다 — 한 점만 남겨 끊긴 자리가 그대로 보이게 한다 */
    if (lowAt === -1) {
      thinned.push(points[start]!);
      continue;
    }

    /* 시간 순서를 지킨다 — 최솟값이 뒤에 있으면 뒤에 그려야 선이 되돌아가지 않는다 */
    const first = Math.min(lowAt, highAt);
    const second = Math.max(lowAt, highAt);
    thinned.push(points[first]!);
    if (second !== first) thinned.push(points[second]!);
  }

  return thinned;
}
