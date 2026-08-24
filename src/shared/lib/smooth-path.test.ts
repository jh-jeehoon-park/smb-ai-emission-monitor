import { describe, expect, it } from 'vitest';
import { smoothPath } from './smooth-path';

/** path의 모든 3차 베지어를 촘촘히 훑어 y 최소·최대를 구한다 */
function sampleY(d: string): { min: number; max: number } {
  const nums = (s: string) => s.trim().split(/[ ,]+/).map(Number);
  const start = nums(d.slice(1, d.indexOf(' C')));
  let cursor = { x: start[0]!, y: start[1]! };
  let min = cursor.y;
  let max = cursor.y;

  for (const seg of d.split(' C').slice(1)) {
    const [c1x, c1y, c2x, c2y, px, py] = nums(seg);
    for (let t = 0; t <= 1; t += 0.02) {
      const u = 1 - t;
      const y =
        u * u * u * cursor.y + 3 * u * u * t * c1y! + 3 * u * t * t * c2y! + t * t * t * py!;
      min = Math.min(min, y);
      max = Math.max(max, y);
    }
    void c1x;
    void c2x;
    cursor = { x: px!, y: py! };
  }
  return { min, max };
}

describe('smoothPath', () => {
  it('점이 없으면 빈 문자열', () => {
    expect(smoothPath([])).toBe('');
  });

  it('두 점은 직선이다 — 곡선을 만들 근거가 없다', () => {
    expect(smoothPath([{ x: 0, y: 0 }, { x: 10, y: 10 }])).toBe('M0,0 L10,10');
  });

  /**
   * 이 검사가 이 파일의 존재 이유다. 계측 그래프에서 점 사이의 봉우리는
   * **측정하지 않은 값**으로 읽힌다 — 곡선이 값의 범위를 넘으면 안 된다.
   */
  it('봉우리에서 값의 범위를 넘지 않는다', () => {
    const pts = [
      { x: 0, y: 50 },
      { x: 10, y: 10 },
      { x: 20, y: 12 },
      { x: 30, y: 48 },
    ];
    const { min, max } = sampleY(smoothPath(pts));
    const ys = pts.map((p) => p.y);
    expect(min).toBeGreaterThanOrEqual(Math.min(...ys) - 1e-6);
    expect(max).toBeLessThanOrEqual(Math.max(...ys) + 1e-6);
  });

  it('톱니 모양에서도 범위를 넘지 않는다', () => {
    const pts = Array.from({ length: 12 }, (_, i) => ({ x: i * 8, y: i % 2 === 0 ? 4 : 40 }));
    const { min, max } = sampleY(smoothPath(pts));
    expect(min).toBeGreaterThanOrEqual(4 - 1e-6);
    expect(max).toBeLessThanOrEqual(40 + 1e-6);
  });

  it('단조 증가 구간에서 되돌아가지 않는다', () => {
    const pts = [
      { x: 0, y: 40 },
      { x: 10, y: 30 },
      { x: 20, y: 20 },
      { x: 30, y: 5 },
    ];
    const { min, max } = sampleY(smoothPath(pts));
    expect(min).toBeGreaterThanOrEqual(5 - 1e-6);
    expect(max).toBeLessThanOrEqual(40 + 1e-6);
  });
});
