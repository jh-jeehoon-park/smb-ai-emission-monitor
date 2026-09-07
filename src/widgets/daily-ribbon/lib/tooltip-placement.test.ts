import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TIMELINE_POINT_COUNT } from '@/shared/lib/timeline';
import { CHART_TOOLTIP_MIN_WIDTH_PX } from '@/shared/ui/chart-tooltip';
import { RIBBON_TOOLTIP_GAP_PX } from '../config/constants';
import { tooltipSideAt, tooltipTransform } from './tooltip-placement';

/** 그 시각의 표본 번호 */
const at = (percent: number) => Math.round((percent / 100) * TIMELINE_POINT_COUNT);

/**
 * **툴팁이 커서를 덮지 않는다** `[사용자 지적 2026-09-07]`.
 *
 * 예전에는 `translateX(-50%)`로 커서에 정중앙 정렬해, 상자가 마우스 포인터와 그 자리의
 * 값을 함께 가렸다 — 값을 보려고 올렸는데 그 값이 상자 밑에 들어갔다.
 */
describe('tooltipSideAt — 커서 옆에 앉힌다', () => {
  const WIDE = 1500;
  const NARROW = 600;

  it.each([0, 25, 50])('넓은 트랙의 %s%%에서는 오른쪽이다 — 읽는 방향과 같다', (percent) => {
    expect(tooltipSideAt(at(percent), WIDE)).toBe('right');
  });

  /** 오른쪽에 상자가 들어갈 자리가 없으면 뒤집는다 — 트랙 밖으로 나가면 카드에 잘린다 */
  it('오른쪽 끝에서는 왼쪽으로 뒤집는다', () => {
    expect(tooltipSideAt(TIMELINE_POINT_COUNT - 1, WIDE)).toBe('left');
  });

  /**
   * **퍼센트 임계로는 이것을 맞출 수 없다.** 상자 140px은 1500px 트랙에서 9%, 600px에서
   * 23%다 — 옛 상수(18%)는 넓은 트랙에서 너무 일찍, 좁은 트랙에서 너무 늦게 뒤집었다.
   */
  it('같은 지점이라도 트랙이 좁으면 더 일찍 뒤집는다', () => {
    const percent = 80;
    expect(tooltipSideAt(at(percent), WIDE)).toBe('right');
    expect(tooltipSideAt(at(percent), NARROW)).toBe('left');
  });

  /** 뒤집는 경계가 곧 «상자 + 간격이 들어가는가»다 */
  it('경계는 상자 폭 + 간격이다', () => {
    const need = CHART_TOOLTIP_MIN_WIDTH_PX + RIBBON_TOOLTIP_GAP_PX;
    const justFits = at(((WIDE - need) / WIDE) * 100);

    expect(tooltipSideAt(justFits, WIDE)).toBe('right');
    expect(tooltipSideAt(justFits + 2, WIDE)).toBe('left');
  });
});

describe('tooltipTransform — 어느 쪽이든 커서에서 떨어뜨린다', () => {
  it('양쪽 모두 간격만큼 밀거나 당긴다', () => {
    expect(tooltipTransform('right')).toBe(`translateX(${RIBBON_TOOLTIP_GAP_PX}px)`);
    expect(tooltipTransform('left')).toBe(`translateX(calc(-100% - ${RIBBON_TOOLTIP_GAP_PX}px))`);
  });

  /** 가운데 정렬로 되돌아가면 다시 커서를 덮는다 — 그 형태가 남지 않게 못박는다 */
  it('가운데 정렬로 되돌아가지 않는다', () => {
    for (const side of ['right', 'left'] as const) {
      expect(tooltipTransform(side)).not.toContain('-50%');
    }
  });
});

/**
 * **상자 폭은 두 곳에 적혀 있다.** Tailwind가 소스 글자를 훑으므로 임의값(`min-w-[140px]`)에
 * 변수를 넣을 수 없어, 클래스와 상수가 따로 산다. 갈리면 뒤집는 경계가 조용히 어긋난다.
 */
describe('툴팁 상자 폭', () => {
  it('클래스와 상수가 같은 값이다', () => {
    const shell = readFileSync('src/shared/ui/chart-tooltip.tsx', 'utf8');
    expect(shell).toContain(`min-w-[${CHART_TOOLTIP_MIN_WIDTH_PX}px]`);
  });
});
