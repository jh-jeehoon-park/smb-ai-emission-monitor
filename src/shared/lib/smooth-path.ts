/**
 * 점 목록을 **부드러운 선**의 SVG path로 바꾼다.
 *
 * 보간은 **monotone cubic**(Fritsch–Carlson)이다. `natural`·`basis`처럼 흔한 스플라인은
 * 점 사이에서 최소·최대를 넘어가는데(overshoot), 계측 그래프에서는 그 봉우리가 **측정하지
 * 않은 값**으로 읽힌다 — 12.0과 12.2 사이에 12.6이 그려지면 그건 거짓이다.
 * monotone cubic은 구간의 단조성을 보존해 두 점의 값 범위를 벗어나지 않는다.
 *
 * Recharts도 같은 이유로 `type="monotone"`을 쓴다. 스파크라인은 Recharts를 쓰지 않으므로
 * 같은 성질을 여기서 직접 만든다.
 */
export function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M${fmt(points[0]!.x)},${fmt(points[0]!.y)}`;
  if (points.length === 2) {
    const [a, b] = points as [{ x: number; y: number }, { x: number; y: number }];
    return `M${fmt(a.x)},${fmt(a.y)} L${fmt(b.x)},${fmt(b.y)}`;
  }

  const n = points.length;
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const h = points[i + 1]!.x - points[i]!.x;
    dx.push(h);
    slope.push(h === 0 ? 0 : (points[i + 1]!.y - points[i]!.y) / h);
  }

  /* 각 점의 접선. 부호가 바뀌는 점(봉우리·골)은 0으로 눕혀 넘어감을 막는다 */
  const tangent: number[] = new Array(n).fill(0);
  tangent[0] = slope[0]!;
  tangent[n - 1] = slope[n - 2]!;
  for (let i = 1; i < n - 1; i++) {
    const a = slope[i - 1]!;
    const b = slope[i]!;
    tangent[i] = a * b <= 0 ? 0 : (a + b) / 2;
  }

  /* Fritsch–Carlson 제한: 접선이 인접 기울기의 3배를 넘으면 구간을 벗어난다 */
  for (let i = 0; i < n - 1; i++) {
    const s = slope[i]!;
    if (s === 0) {
      tangent[i] = 0;
      tangent[i + 1] = 0;
      continue;
    }
    const a = tangent[i]! / s;
    const b = tangent[i + 1]! / s;
    const h = Math.hypot(a, b);
    if (h > 3) {
      const t = 3 / h;
      tangent[i] = t * a * s;
      tangent[i + 1] = t * b * s;
    }
  }

  let d = `M${fmt(points[0]!.x)},${fmt(points[0]!.y)}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i]!;
    const p1 = points[i + 1]!;
    const h = dx[i]! / 3;
    d += ` C${fmt(p0.x + h)},${fmt(p0.y + tangent[i]! * h)} ${fmt(p1.x - h)},${fmt(
      p1.y - tangent[i + 1]! * h,
    )} ${fmt(p1.x)},${fmt(p1.y)}`;
  }
  return d;
}

function fmt(v: number): string {
  return Number(v.toFixed(2)).toString();
}
