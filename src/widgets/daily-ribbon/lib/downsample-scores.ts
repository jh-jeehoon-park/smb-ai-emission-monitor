/**
 * 이상 점수 계열을 **버킷 최댓값으로 솎는다** `[사용자 지적 2026-09-08: 가독성이 떨어진다]`.
 *
 * 1440점을 970px에 그리면 **픽셀당 4.3점**이다(실측). 한 픽셀 열에 네 표본의 흔들림이
 * 겹쳐 쌓여, 선이 값이 아니라 **털**로 보였다 — 하루 종일 30 언저리였다가 끝에서 91까지
 * 올랐다는 이 그림의 결론이 잡음에 묻혔다. `dataviz`가 «≥1000점은 솎는다»로 정해 둔 자리다.
 *
 * **최댓값을 쓰는 이유** — 이 축이 답하는 질문은 «오늘 언제 위험했나»다. 평균·중앙값은
 * 봉우리를 깎아 **경계를 넘은 사실 자체를 지운다**(6분 버킷에서 91이 40대로 내려간다).
 * 최댓값은 그 방향으로는 아무것도 잃지 않는다.
 *
 * **대가를 적어 둔다** — 저점 구간의 선이 잡음 폭(±5점)만큼 위로 뜬다. 값 자체가 필요한
 * 사람은 **커서 툴팁이 솎지 않은 원본에서 읽는다**(`data.scores[index]`) — 솎는 것은
 * 실루엣뿐이고 판독은 원본 그대로다.
 *
 * **버킷 전체가 결측이면 결측이다**(**E4**). 아는 표본이 하나라도 있으면 그 최댓값을 쓴다 —
 * 일부 결측을 통째로 구멍으로 만들면 있던 값이 사라진다.
 */
export function downsampleScores(
  scores: readonly (number | null)[],
  samplesPerBucket: number,
): (number | null)[] {
  if (samplesPerBucket <= 1) return [...scores];

  const buckets: (number | null)[] = [];

  for (let from = 0; from < scores.length; from += samplesPerBucket) {
    let peak: number | null = null;

    for (let i = from; i < Math.min(from + samplesPerBucket, scores.length); i += 1) {
      const score = scores[i];
      if (score === null || score === undefined) continue;
      peak = peak === null ? score : Math.max(peak, score);
    }

    buckets.push(peak);
  }

  return buckets;
}
