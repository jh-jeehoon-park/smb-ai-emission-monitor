// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { LiveValue } from './live-value';

/**
 * **멈춰 있을 때 화면에 있는 값은 언제나 실제 계측값이어야 한다**
 * `[사용자 요청 2026-09-16: 수치가 변경될 때에 대한 자연스러운 애니메이션]`.
 *
 * 흘러가는 **동안** 계측되지 않은 중간값이 보이는 것은 이 트윈의 알려진 대가다. 그러나
 * 멈춘 뒤에도 그 값이 남아 있으면 그것은 대가가 아니라 **거짓**이다 — 화면이 오지 않은
 * 수치를 계속 적게 된다.
 */
const frames: FrameRequestCallback[] = [];

beforeEach(() => {
  frames.length = 0;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    frames.push(cb);
    return frames.length;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal(
    'matchMedia',
    /* 감속 설정이 꺼진 환경 — 트윈이 실제로 돈다 */
    () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('LiveValue — 멈춘 값은 실제 계측값이다', () => {
  it('첫 값은 그대로 그린다 — 0부터 세지 않는다', () => {
    const { container } = render(<LiveValue value="8.30" />);
    expect(container.textContent).toBe('8.30');
  });

  /**
   * **이 검사가 실제로 잡은 결함이다.** 흘러가던 중에 값이 결측(`—`)이 되면 rAF가 취소되는데,
   * 그때 트윈 상태가 남아 있었다. 값이 다시 들어오면 화면이 **그 남은 숫자**를 그렸다 —
   * 새로 온 계측값이 아니라.
   */
  it('결측을 지나 값이 돌아오면 **새 값**을 그린다', () => {
    const { container, rerender } = render(<LiveValue value="8.30" />);

    /* 값이 바뀌어 트윈이 시작된다 — 직전 값(8.30)에서 출발한다 */
    rerender(<LiveValue value="8.40" />);
    expect(container.textContent).toBe('8.30');

    /* 수신이 끊긴다 */
    rerender(<LiveValue value="—" />);
    expect(container.textContent).toBe('—');

    /* 다시 들어온다 — 남아 있던 8.30이 아니라 9.10이어야 한다 */
    rerender(<LiveValue value="9.10" />);
    expect(container.textContent).toBe('9.10');
  });

  it('수가 아닌 값은 흘려보내지 않는다 — 흘릴 축이 없다', () => {
    const { container, rerender } = render(<LiveValue value="없음" />);
    rerender(<LiveValue value="3/60" />);

    expect(container.textContent).toBe('3/60');
  });

  /** 자릿수는 원본을 따른다 — 같은 항목이 화면마다 다르게 반올림되지 않는다(**E1**) */
  it('흘러가는 동안에도 자릿수를 지킨다', () => {
    const { container, rerender } = render(<LiveValue value="8.30" />);
    rerender(<LiveValue value="8.40" />);

    expect(container.textContent).toMatch(/^\d+\.\d{2}$/);
  });
});

/**
 * **트윈 뒤에 페이드가 겹쳐 돌지 않아야 한다.**
 *
 * 두 갈래가 서로 다른 마크업을 낸다 — 흘러갈 때는 글자만, 멈춰 있을 때는 `key`가 걸린
 * `.num-fade` 껍데기다. 트윈이 끝나며 갈래가 바뀌면 **그 `key`가 새 값이라 페이드가 다시
 * 돈다**: 420ms 흘러간 직후에 160ms 페이드가 한 번 더 붙는다.
 */
describe('LiveValue — 전환이 겹치지 않는다', () => {
  it('흘러가는 동안에는 페이드 껍데기를 두지 않는다', () => {
    const { container, rerender } = render(<LiveValue value="8.30" />);
    rerender(<LiveValue value="8.40" />);

    expect(container.querySelector('.num-fade')).toBeNull();
  });

  it('멈춰 있을 때는 페이드 껍데기가 있다 — 수가 아닌 값이 갈릴 자리다', () => {
    const { container } = render(<LiveValue value="없음" />);
    expect(container.querySelector('.num-fade')).not.toBeNull();
  });
});

describe('LiveValue — 수치는 트윈만, 그 밖은 페이드만', () => {
  it('수치가 멈춰 있을 때도 페이드 껍데기를 두지 않는다 — 트윈 끝에 겹쳐 돌던 것을 걷었다', () => {
    const { container, rerender } = render(<LiveValue value="8.30" />);
    expect(container.querySelector('.num-fade')).toBeNull();

    rerender(<LiveValue value="8.40" />);
    expect(container.querySelector('.num-fade')).toBeNull();
  });

  it('`children`을 주면 내용은 그대로 두고 전환만 붙인다', () => {
    const { container } = render(
      <LiveValue value="8.30">
        <b>8.30</b>
      </LiveValue>,
    );
    expect(container.querySelector('.num-fade')).not.toBeNull();
    expect(container.querySelector('b')).not.toBeNull();
  });
});

/**
 * **흘러가는 동안의 값도 검사한다.**
 *
 * 앞의 검사들은 rAF를 한 번도 돌리지 않아 «시작·끝»만 봤다 — 보간 자체가 검증되지 않았고,
 * 실제로 그 자리에서 두 결함이 났었다(첫 값이 0에서 올라옴 · 진행도가 음수라 구간 밖으로 튐).
 */
describe('LiveValue — 흘러가는 동안', () => {
  /** 프레임을 손으로 돌린다 */
  const advance = (ms: number) => {
    const pending = [...frames];
    frames.length = 0;
    /* `act` 밖에서 부르면 상태가 DOM 까지 내려오지 않아 검사가 옛 글자를 읽는다 */
    act(() => {
      for (const cb of pending) cb(ms);
    });
  };

  it('구간 밖으로 나가지 않는다 — 계측 범위를 벗어난 값은 거짓이다', () => {
    const { container, rerender } = render(<LiveValue value="8.30" />);
    rerender(<LiveValue value="8.40" />);

    const seen: number[] = [];
    for (const at of [0, 40, 120, 240, 360, 420]) {
      advance(at);
      const v = Number(container.textContent);
      if (Number.isFinite(v)) seen.push(v);
    }

    expect(seen.length).toBeGreaterThan(2);
    for (const v of seen) {
      expect(v).toBeGreaterThanOrEqual(8.3);
      expect(v).toBeLessThanOrEqual(8.4);
    }
  });

  /** **0에서 올라오지 않는다** — 표 수십 칸이 0부터 세면 읽을 수 없다 */
  it('첫 값은 흘러가지 않는다', () => {
    const { container } = render(<LiveValue value="8.30" />);
    advance(0);
    advance(200);

    expect(container.textContent).toBe('8.30');
  });

  it('끝나면 원본 문자열로 멈춘다 — 부동소수가 한 자리 어긋나지 않게', () => {
    const { container, rerender } = render(<LiveValue value="8.30" />);
    rerender(<LiveValue value="8.40" />);

    advance(0);
    advance(1000);

    expect(container.textContent).toBe('8.40');
  });
});
