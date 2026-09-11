import { describe, expect, it } from 'vitest';
import { MISSING_HATCH, MISSING_HATCH_FILL, MISSING_HATCH_PATTERN } from './operating-visual';

/**
 * **같은 «모름»이 두 표기로 존재한다** — DOM은 `repeating-linear-gradient`, SVG는 `<pattern>`.
 * 기하가 갈리면 같은 사실이 화면마다 다른 결로 보이는데, 그 어긋남은 눈으로만 잡힌다
 * (2px/5px와 3px/6px는 나란히 놓지 않으면 구분되지 않는다). 그래서 문자열에서 숫자를 뽑아 댄다.
 */
describe('결측 빗금 — DOM 표기와 SVG 표기의 기하가 같다', () => {
  it('기울기·굵기·주기가 세 값 모두 일치한다', () => {
    const matched = MISSING_HATCH.match(
      /repeating-linear-gradient\((\d+)deg,\s*var\(--missing\)\s*0\s*(\d+)px,\s*transparent\s*\d+px\s*(\d+)px\)/,
    );

    /* 정규식이 빗나가면 아래 단정이 `undefined === undefined`로 조용히 통과한다 */
    expect(matched).not.toBeNull();

    const [, angleDeg, stripe, period] = matched!;
    expect(Number(angleDeg)).toBe(MISSING_HATCH_PATTERN.angleDeg);
    expect(Number(stripe)).toBe(MISSING_HATCH_PATTERN.stripe);
    expect(Number(period)).toBe(MISSING_HATCH_PATTERN.period);
  });

  /** 줄기가 주기보다 좁아야 «빗금»이다 — 같거나 넓으면 그냥 단색 면이 된다 */
  it('줄기가 주기보다 좁다', () => {
    expect(MISSING_HATCH_PATTERN.stripe).toBeLessThan(MISSING_HATCH_PATTERN.period);
  });

  it('SVG fill이 그 id를 가리킨다', () => {
    expect(MISSING_HATCH_FILL).toBe(`url(#${MISSING_HATCH_PATTERN.id})`);
  });
});
