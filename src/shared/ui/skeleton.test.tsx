// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Skeleton } from './skeleton';
import styles from './skeleton.module.scss';

const SCSS = readFileSync(join(process.cwd(), 'src', 'shared', 'ui', 'skeleton.module.scss'), 'utf8');

/** `@layer components { … }`의 본문 — 괄호를 세어 끝을 찾는다(안에 규칙이 여럿 있다) */
function componentsLayer(source: string): string {
  const start = source.indexOf('@layer components');
  if (start < 0) return '';
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) return source.slice(open + 1, i);
  }
  return '';
}

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
  it('기본은 `display: block`이다', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild?.className).toContain(styles.root);
    expect(SCSS).toMatch(/\.root\s*\{[^}]*display:\s*block/);
  });

  /**
   * 글자 흐름 안에 둬야 하는 자리가 있다(타일 보조줄). 넘긴 클래스가 이기는 것은 **뼈대가
   * `components` 레이어에 있어서**다 — 레이어 없는 호출부 규칙이 선언 순서와 무관하게 이긴다.
   * 뼈대가 레이어 밖으로 나오면 `display: block`이 호출부의 `inline-block`과 순서 싸움을 한다.
   */
  it('넘긴 클래스를 함께 달고, 뼈대는 덮을 수 있는 레이어에 있다', () => {
    const { container } = render(<Skeleton className="caller-inline" />);
    const classes = (container.firstElementChild?.className ?? '').split(/\s+/);
    expect(classes).toContain('caller-inline');
    expect(classes).toContain(styles.root);
    expect(componentsLayer(SCSS)).toMatch(/\.root\s*\{[^}]*display:\s*block/);
  });

  /**
   * 숨쉬기는 **전역 클래스**다. CSS 모듈은 `animation`의 이름을 파일마다 바꿔 붙여서, 모듈 안에
   * `animation: pulse`를 적으면 키프레임을 못 찾아 조용히 멈춘다(화면 대조는 애니메이션을 끄고 찍어
   * 이것을 잡지 못한다). 감속 설정을 따르는 쪽(`pulse-motion-safe`)이어야 한다.
   */
  it('숨쉬기는 감속 설정을 따르는 전역 클래스가 맡는다', () => {
    const { container } = render(<Skeleton />);
    expect((container.firstElementChild?.className ?? '').split(/\s+/)).toContain('pulse-motion-safe');
    expect(SCSS).not.toMatch(/\banimation(-name)?\s*:/);
  });

  /** 값을 대신하는 면이라 읽히지 않아야 한다 — 자리를 알리는 일은 `SkeletonRegion`이 한다 */
  it('보조기술에서 감춘다', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  });
});
