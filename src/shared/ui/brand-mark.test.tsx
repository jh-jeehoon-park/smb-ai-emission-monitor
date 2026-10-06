// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { BRAND_NAME } from '@/shared/config/constants';
import { BrandMark } from './brand-mark';

/* vitest `globals`가 꺼져 있어 RTL 자동 정리가 등록되지 않는다 — 근거는 `modal.test.tsx` */
afterEach(cleanup);

/**
 * 마크가 PNG 두 벌에서 인라인 SVG로 바뀌면서 **색이 코드의 것**이 됐다.
 * 그래서 지켜야 할 것도 파일 존재가 아니라 아래 두 가지다.
 */
describe('브랜드 마크', () => {
  it('색을 포인트색 토큰에서 가져온다 — 테마가 바뀌면 함께 바뀐다', () => {
    const { container } = render(<BrandMark size={28} />);
    expect(container.innerHTML).toContain('var(--accent)');
    /* 초록 로고 시절의 하드코딩이 돌아오지 않게 못박는다 */
    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,6}/i);
  });

  /**
   * 그라데이션 id는 문서 전역이다. 셸과 로그인 화면처럼 두 곳에 동시에 놓이면
   * 같은 id가 서로를 덮어 한쪽 면이 사라진다.
   */
  it('마크마다 그라데이션 id가 다르다', () => {
    const { container } = render(
      <>
        <BrandMark size={28} />
        <BrandMark size={36} />
      </>,
    );
    const ids = [...container.querySelectorAll('linearGradient')].map((n) => n.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    /* SVG 조각 참조로 쓰이므로 기호가 섞이면 안 된다 */
    for (const id of ids) expect(id).toMatch(/^brand-[a-zA-Z0-9]+$/);
  });

  it('보조기술에는 플랫폼 이름으로 읽힌다', () => {
    const { getByRole } = render(<BrandMark size={28} />);
    expect(getByRole('img', { name: BRAND_NAME })).toBeTruthy();
  });
});
