// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { Eyebrow } from './eyebrow';

afterEach(cleanup);

const classesOf = (text: string) => {
  const { container } = render(<Eyebrow>{text}</Eyebrow>);
  return container.firstElementChild?.className ?? '';
};

/**
 * **한글이 한 자 섞이면 서식이 통째로 바뀐다.** 의도한 동작이지만(한글에 자간을 주면
 * `구 미 염 색`처럼 낱글자로 흩어진다) 이 성질 때문에 실제로 결함이 났다 — 모델 머리글에
 * 사업장 이름을 붙인 세 화면이 `AUTOENCODER`가 아니라 `AutoEncoder · 구미 염색 2공장`으로
 * 보여, 같은 모델이 화면마다 다르게 읽혔다 `[회의 피드백 2026-08-24]`.
 *
 * 그래서 **이 갈림을 못박아 둔다.** 라틴 전용에서 계기판 서식이 사라지거나, 한글 섞인
 * 문자열에 자간이 붙으면 둘 다 회귀다.
 */
describe('Eyebrow — 한글 여부로 서식이 갈린다', () => {
  it('라틴만이면 대문자·넓은 자간을 준다', () => {
    const cls = classesOf('AutoEncoder');
    expect(cls).toContain('uppercase');
    expect(cls).toContain('tracking-[0.14em]');
  });

  it('한글이 섞이면 주지 않는다', () => {
    const cls = classesOf('AutoEncoder · 구미 염색 2공장');
    expect(cls).not.toContain('uppercase');
    expect(cls).not.toContain('tracking-');
  });

  it('한글만이어도 주지 않는다', () => {
    const cls = classesOf('구미 염색 2공장');
    expect(cls).not.toContain('uppercase');
    expect(cls).not.toContain('tracking-');
  });

  /** 숫자·기호는 라틴으로 센다 — `6단계 · 실측`은 한글이 있으니 평서 서식이다 */
  it('숫자와 기호만이면 라틴으로 센다', () => {
    expect(classesOf('LSTM + Attention')).toContain('uppercase');
    expect(classesOf('XMARL-PPO')).toContain('uppercase');
  });
});
