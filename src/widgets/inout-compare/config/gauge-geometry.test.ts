import { describe, expect, it } from 'vitest';
import { GAUGE_GEOMETRY, GAUGE_TOP_MARGIN, SUMMARY_DONUT } from './constants';

const G = GAUGE_GEOMETRY;

/**
 * **치수는 눈으로 확인할 수 없다.** 반원 게이지의 호가 `viewBox`를 넘으면 브라우저가 조용히
 * 잘라내고 `tsc`·`eslint`·`verify:docs`는 전부 통과한다 — 실제로 두 번 그렇게 됐다:
 * 첫 판본은 방사형 눈금이 위로 9px 넘쳐 **눈금이 통째로 안 보였고**, 그 다음 판본은 간극 호를
 * 두 값 호 사이에 두어 **가운데 숫자를 가로질렀다.** 둘 다 캡처를 보고서야 드러났다.
 *
 * 그래서 치수의 **관계**를 값으로 못박는다. 반지름을 손으로 고칠 때 여기서 걸린다.
 */
describe('반원 게이지 치수', () => {
  /** 가장 바깥 호가 위로 넘치면 잘린다 — 여백이 음수면 그 순간이다 */
  it('가장 바깥 호가 뷰박스 안에 들어온다', () => {
    expect(GAUGE_TOP_MARGIN).toBeGreaterThanOrEqual(0);
  });

  /** 반원의 지름과 굵기가 뷰박스 폭을 넘으면 좌우가 잘린다 */
  it('반원의 지름이 뷰박스 폭 안에 들어온다', () => {
    expect(G.gapR * 2 + G.gapStroke).toBeLessThanOrEqual(G.width);
    expect(G.outerR * 2 + G.stroke).toBeLessThanOrEqual(G.width);
  });

  /** 반원의 기준선(`cy`)과 그 아래 여백이 뷰박스 높이 안에 있어야 호의 끝이 잘리지 않는다 */
  it('기준선이 뷰박스 높이 안에 있다', () => {
    expect(G.cy + G.stroke / 2).toBeLessThanOrEqual(G.height);
  });

  /**
   * **순서가 뜻을 갖는다** — 간극 호가 두 값 호보다 바깥에 있어야 «둘의 관계»로 읽히고,
   * 가운데 숫자를 가로지르지 않는다.
   */
  it('간극 호가 두 값 호보다 바깥이다', () => {
    expect(G.gapR).toBeGreaterThan(G.outerR);
    expect(G.outerR).toBeGreaterThan(G.innerR);
  });

  /** 세 호가 서로 겹치면 한 겹으로 읽힌다 — 굵기를 고려한 실제 간격을 본다 */
  it('세 호가 서로 겹치지 않는다', () => {
    const gapToOuter = G.gapR - G.gapStroke / 2 - (G.outerR + G.stroke / 2);
    const outerToInner = G.outerR - G.stroke / 2 - (G.innerR + G.stroke / 2);

    expect(gapToOuter).toBeGreaterThan(0);
    expect(outerToInner).toBeGreaterThan(0);
  });

  /**
   * 가운데 숫자는 **안쪽 호 아래**에서 시작해야 호와 겹치지 않는다. 반원은 아래로 갈수록
   * 넓어지므로 위쪽에 두면 좁은 자리에 글자가 끼인다.
   */
  it('가운데 숫자가 안쪽 호 아래에서 시작한다', () => {
    expect(G.centerTop).toBeGreaterThan(G.cy - G.innerR);
    expect(G.centerTop).toBeLessThan(G.cy);
  });
});

describe('요약 도넛 치수', () => {
  it('고리가 상자 안에 들어온다', () => {
    expect(SUMMARY_DONUT.r * 2 + SUMMARY_DONUT.stroke).toBeLessThanOrEqual(SUMMARY_DONUT.size);
  });
});
