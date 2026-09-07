// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Skeleton } from './skeleton';

/**
 * **`Skeleton`은 `<span>`이다** `[사용자 지적 2026-09-07]`.
 *
 * 스켈레톤은 **실제 값과 같은 요소 안에** 들어가야 그 요소의 단에서 높이를 물려받는데, 그
 * 요소가 대개 `<p>`다. `<div>`를 `<p>` 안에 두면 브라우저 파서가 `<p>`를 먼저 닫아 서버가
 * 보낸 것과 다른 트리가 되고 **하이드레이션이 깨진다** — 실제로 두 곳에서 그렇게 만들었다.
 *
 * 태그를 되돌리면 그 함정이 그대로 돌아오므로 값으로 못박는다.
 */
describe('Skeleton 태그', () => {
  it('`<span>`으로 렌더한다 — `<p>` 안에 들어갈 수 있어야 한다', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild?.tagName).toBe('SPAN');
  });

  /** `<span>`이면 기본이 인라인이다 — 눕히지 않으면 폭·높이가 먹지 않는다 */
  it('기본은 `block`이다', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild?.className).toContain('block');
  });

  /**
   * 글자 흐름 안에 둬야 하는 자리가 있다(타일 보조줄). `cn`이 `tailwind-merge`라 나중에 온
   * 것이 이기는데, 그 성질에 기대고 있으므로 값으로 확인한다.
   */
  it('`inline-block`을 넘기면 그것이 이긴다', () => {
    const { container } = render(<Skeleton className="inline-block" />);
    const classes = container.firstElementChild?.className ?? '';
    expect(classes).toContain('inline-block');
    expect(classes.split(/\s+/)).not.toContain('block');
  });

  /** 값을 대신하는 면이라 읽히지 않아야 한다 — 자리를 알리는 일은 `SkeletonRegion`이 한다 */
  it('보조기술에서 감춘다', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  });
});
