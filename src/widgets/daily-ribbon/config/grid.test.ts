import { describe, expect, it } from 'vitest';
import {
  RIBBON_GRID_ROWS,
  RIBBON_OVERLAY_ROW,
  RIBBON_SCORE_HEIGHT,
  RIBBON_STRIP_HEIGHT,
} from './constants';

const rows = RIBBON_GRID_ROWS.split(' ');

/**
 * **행을 명시적으로 정의하지 않으면 오버레이가 첫 행만 덮는다.**
 *
 * `1 / -1`의 `-1`은 **명시 격자**의 마지막 선이다. `grid-template-rows`가 없으면
 * 1번 선으로 풀려 시작과 끝이 같아지고 `span 1`로 떨어진다 — 실제로 그렇게 깨져서
 * 격자선·커서·마우스가 상태 띠에 닿지 않았다.
 */
describe('리본 격자 — 오버레이가 트랙 전체를 덮는다', () => {
  it('행이 명시적으로 정의돼 있다', () => {
    expect(rows.length).toBeGreaterThan(1);
  });

  it('오버레이가 눈금 줄을 뺀 모든 트랙 행을 덮는다', () => {
    const [start, end] = RIBBON_OVERLAY_ROW.split(' / ').map(Number);
    expect(start).toBe(1);
    // 마지막 행은 눈금 줄이다. 끝 선은 그 앞 = 전체 행 수
    expect(end).toBe(rows.length);
  });

  /** 위치로 검사한다 — 값으로 세면 높이가 우연히 같아질 때 개수가 흐트러진다 */
  it('행 높이가 상수에서 나온다 — 격자와 SVG가 갈리지 않게', () => {
    expect(rows[0]).toBe(`${RIBBON_SCORE_HEIGHT}px`);
    expect(rows[1]).toBe('auto'); // 구분선
    expect(rows.slice(2, 5)).toEqual(Array(3).fill(`${RIBBON_STRIP_HEIGHT}px`));
    expect(rows[5]).toBe('auto'); // 눈금 줄
  });

  it('이상 점수 행이 상태 띠보다 훨씬 크다 — 위계', () => {
    expect(RIBBON_SCORE_HEIGHT).toBeGreaterThan(RIBBON_STRIP_HEIGHT * 4);
  });
});
