import { describe, expect, it } from 'vitest';
import { toScorePath } from './score-path';

describe('toScorePath — 결측에서 끊는다(E4)', () => {
  /** 이어 그리면 통신이 끊긴 구간을 직선으로 건너뛰어 없는 값을 그린 것이 된다 */
  it('중간 결측이 조각을 둘로 가른다', () => {
    const segments = toScorePath([10, 20, null, null, 30, 40]);
    expect(segments).toHaveLength(2);
  });

  it('결측이 없으면 조각은 하나다', () => {
    expect(toScorePath([10, 20, 30])).toHaveLength(1);
  });

  it('전부 결측이면 아무것도 그리지 않는다 — 0으로 채우지 않는다', () => {
    expect(toScorePath([null, null, null])).toEqual([]);
  });

  it('조각의 좌표가 결측 구간을 넘지 않는다', () => {
    const [first] = toScorePath([10, 20, null, 30, 40]);
    // 결측은 인덱스 2다. 첫 조각은 1에서 닫혀야 한다
    expect(first!.area).toContain('L1,100 Z');
    expect(first!.line).not.toContain('3,');
  });
});

describe('toScorePath — 면적과 선이 다른 path다', () => {
  const [segment] = toScorePath([10, 90]);

  it('면적은 밑변에서 시작해 밑변으로 닫는다', () => {
    expect(segment!.area.startsWith('M0,100')).toBe(true);
    expect(segment!.area.endsWith('Z')).toBe(true);
  });

  /** 면적 path를 그대로 그으면 밑변과 닫는 변까지 선으로 그려진다 */
  it('선은 값 위만 지난다 — 밑변도 닫힘도 없다', () => {
    expect(segment!.line).not.toContain('100');
    expect(segment!.line).not.toContain('Z');
  });

  it('점수가 높을수록 y가 작다 — 위아래가 뒤집힌 좌표계', () => {
    expect(segment!.line).toBe('M0,90 L1,10');
  });
});

describe('toScorePath — 그릴 수 없는 조각', () => {
  it('표본 하나짜리 조각은 버린다 — 점 하나로 선을 그을 수 없다', () => {
    expect(toScorePath([null, 50, null])).toEqual([]);
  });

  it('빈 입력은 빈 결과다', () => {
    expect(toScorePath([])).toEqual([]);
  });
});
