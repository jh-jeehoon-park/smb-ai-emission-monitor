// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Eyebrow } from './eyebrow';
import styles from './eyebrow.module.scss';

afterEach(cleanup);

const classesOf = (text: string) => {
  const { container } = render(<Eyebrow>{text}</Eyebrow>);
  return container.firstElementChild?.className ?? '';
};

/** 규칙 본문 — 클래스 이름만 보면 그 안의 서식이 빠져도 통과한다 */
const SCSS = readFileSync(join(process.cwd(), 'src', 'shared', 'ui', 'eyebrow.module.scss'), 'utf8');
const ruleOf = (name: string) => SCSS.match(new RegExp(`\\.${name}\\s*\\{([^}]*)\\}`))?.[1] ?? '';

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
    expect(cls).toContain(styles.latin);
    expect(ruleOf('latin')).toMatch(/text-transform:\s*uppercase/);
    expect(ruleOf('latin')).toMatch(/letter-spacing:\s*0\.14em/);
  });

  /** 기본 서식에 대문자·자간이 들어가면 한글에도 붙는다 — 라틴 전용 규칙에만 있어야 한다 */
  it('기본 서식에는 대문자·자간이 없다', () => {
    expect(ruleOf('root')).not.toMatch(/text-transform|letter-spacing/);
  });

  it('한글이 섞이면 주지 않는다', () => {
    const cls = classesOf('AutoEncoder · 구미 염색 2공장');
    expect(cls).not.toContain(styles.latin);
  });

  it('한글만이어도 주지 않는다', () => {
    const cls = classesOf('구미 염색 2공장');
    expect(cls).not.toContain(styles.latin);
  });

  /** 숫자·기호는 라틴으로 센다 — `6단계 · 실측`은 한글이 있으니 평서 서식이다 */
  it('숫자와 기호만이면 라틴으로 센다', () => {
    expect(classesOf('LSTM + Attention')).toContain(styles.latin);
    expect(classesOf('XMARL-PPO')).toContain(styles.latin);
  });
});
