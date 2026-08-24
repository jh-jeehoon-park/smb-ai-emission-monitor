import { smoothPath } from '@/shared/lib/smooth-path';

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
 *
 * 선은 **부드럽게** 잇는다 `[사용자 지시 2026-08-24]`. 보간이 점 사이에서 값의 범위를
 * 넘지 않는 monotone cubic이라 그리지 않은 점수 봉우리가 생기지 않는다(`smoothPath`).
 */
export function toScorePath(scores: (number | null)[]): ScoreSegment[] {
  const segments: ScoreSegment[] = [];
  let points: { x: number; y: number }[] = [];
  let from = 0;

  const flush = (to: number) => {
    if (points.length >= 2) {
      const line = smoothPath(points);
      /* 면적은 **같은 곡선**을 쓰고 앞뒤로 밑변만 붙인다. 곡선의 첫 `M`을 밑변에서
         올라오는 `L`로 바꿔야 선과 면적의 윗변이 어긋나지 않는다 */
      const curve = line.replace(/^M([^ ]+)/, 'L$1');
      segments.push({ area: `M${from},100 ${curve} L${to},100 Z`, line });
    }
    points = [];
  };

  scores.forEach((score, index) => {
    if (score === null) {
      flush(index - 1);
      return;
    }
    if (points.length === 0) from = index;
    points.push({ x: index, y: 100 - score });
  });
  flush(scores.length - 1);

  return segments;
}
