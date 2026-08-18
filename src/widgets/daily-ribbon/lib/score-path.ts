export interface ScoreSegment {
  /** 면적 — 밑변까지 닫힌 path */
  area: string;
  /** 선 — 값 위만 지나는 열린 path. 면적 path를 그대로 그으면 밑변과 닫는 변까지 그려진다 */
  line: string;
}

/**
 * 이상 점수 계열을 **결측에서 끊어** 여러 조각으로 만든다.
 *
 * 이어 그리면 통신이 끊긴 구간을 직선으로 건너뛰어 **없는 값을 그린 것**이 된다.
 * 결측을 0으로 그리지 않는 것과 같은 이유다(**E4**) — 0으로 그리면 점수가 떨어진
 * 것처럼, 이어 그리면 그 사이에 값이 있었던 것처럼 보인다.
 *
 * 좌표계는 뷰박스 `0 0 <표본수> 100`이고 y는 위아래가 뒤집힌다(점수 100이 y=0).
 *
 * 표본이 하나뿐인 조각은 버린다 — 점 하나로는 선을 그을 수 없고, 면적만 남기면
 * 폭 0의 보이지 않는 도형이 된다.
 */
export function toScorePath(scores: (number | null)[]): ScoreSegment[] {
  const segments: ScoreSegment[] = [];
  let points: string[] = [];
  let from = 0;

  const flush = (to: number) => {
    if (points.length >= 2) {
      const line = `M${points.join(' L')}`;
      segments.push({ area: `M${from},100 L${points.join(' L')} L${to},100 Z`, line });
    }
    points = [];
  };

  scores.forEach((score, index) => {
    if (score === null) {
      flush(index - 1);
      return;
    }
    if (points.length === 0) from = index;
    points.push(`${index},${100 - score}`);
  });
  flush(scores.length - 1);

  return segments;
}
