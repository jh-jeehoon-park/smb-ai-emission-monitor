import { describe, expect, it } from 'vitest';
import { chartRelayPoint, type ChartBox, type ChartMargin } from './chart-relay';

/** 카드 안의 40px 띠. 폭 200 */
const box: ChartBox = { left: 120, right: 320, top: 400, height: 40 };
/** 계측 격자 스파크라인과 같은 값 */
const margin: ChartMargin = { top: 2, right: 2, bottom: 0, left: 2 };

const at = (x: number) => chartRelayPoint(x, box, margin);

/**
 * **세로는 뜻이 없고 가로만 뜻이 있다.**
 *
 * Recharts는 포인터가 플롯 안에 있을 때만 축 툴팁을 켠다 — 계측 격자에서 그 플롯은 40px
 * 스파크라인이라 140px 카드의 29%였다 `[사용자 지적 2026-09-07]`.
 */
describe('chartRelayPoint — 카드 위 포인터를 플롯 안의 한 점으로', () => {
  it('가로는 그대로 두고 세로만 플롯 한가운데로 박는다', () => {
    /* 플롯 세로는 402~440, 그 가운데 */
    expect(at(200)).toEqual({ clientX: 200, clientY: 421 });
  });

  /**
   * **상자가 아니라 플롯으로 자른다.** 여백(각 2px)에 떨어지면 범위 밖이라 미들웨어가
   * `mouseLeaveChart()`를 부른다 — «아무 일도 없음»이 아니라 **꺼짐**이다. 카드가 차트보다
   * 넓어 양쪽 8px씩을 늘 지나므로 실제로 자주 밟혔다.
   */
  it.each([
    [80, 122],
    [1000, 318],
  ])('플롯 밖 %s는 플롯 끝(%s)으로 잘라 넣는다', (from, to) => {
    expect(at(from)!.clientX).toBe(to);
  });

  /** 실측: 폭 200·여백 2에서 `2`와 `198`이 켜지고 `1`·`199`가 꺼졌다(경계가 닫힌 구간이다) */
  it('잘라 넣은 자리가 플롯 안에 남는다', () => {
    expect(at(0)!.clientX).toBeGreaterThanOrEqual(box.left + margin.left);
    expect(at(9999)!.clientX).toBeLessThanOrEqual(box.right - margin.right);
  });

  /** 아직 그려지지 않은 차트에는 옮길 자리가 없다 — jsdom·첫 렌더가 그 상태다 */
  it.each([
    ['폭', { ...box, right: box.left }],
    ['높이', { ...box, height: 0 }],
  ])('%s가 0이면 옮기지 않는다', (_label, zero) => {
    expect(chartRelayPoint(200, zero as ChartBox, margin)).toBeNull();
  });
});
