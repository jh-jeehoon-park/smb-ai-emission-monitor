// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DailyRibbonSkeleton } from './daily-ribbon-skeleton';

/**
 * **스켈레톤이 실제와 같은 자리를 차지하는지**를 렌더로 확인한다 `[사용자 지적 2026-09-07]`.
 *
 * 소스 검사는 «상수를 읽는가»까지만 본다. 실제로 밟은 결함 둘은 그 밖에 있었다 —
 * ① 막대를 `<p>` 안에 넣어 **하이드레이션이 깨질 트리**를 만들었고, ② 발치 범례를 빼
 * 값이 도착할 때 카드가 그 줄만큼 **늘어났다**(스켈레톤이 없애려던 점프를 스켈레톤이 만든다).
 */
const errors: string[] = [];

afterEach(() => {
  errors.length = 0;
  vi.restoreAllMocks();
});

function renderQuietly() {
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    errors.push(args.map(String).join(' '));
  });
  return render(<DailyRibbonSkeleton />);
}

describe('일간 운전 리본 스켈레톤', () => {
  /**
   * React가 잘못된 중첩을 여기서 잡는다 — *"In HTML, `<div>` cannot be a descendant of
   * `<p>`. This will cause a hydration error."*
   */
  it('React가 경고하지 않는다', () => {
    renderQuietly();
    expect(errors.join('\n')).toBe('');
  });

  /**
   * 상태 띠 셋 + 점수 면. 하나가 빠지면 값이 도착할 때 표가 한 줄 늘어난다.
   *
   * `aria-hidden`으로 세지 않는다 — 범례의 색 조각도 그 속성을 갖는다(11개가 잡혔다).
   * 스켈레톤 면만 고르려면 그 면의 색을 봐야 한다.
   */
  it('덮는 면이 넷이다 — 점수 하나 + 상태 띠 셋', () => {
    const { container } = renderQuietly();
    const bars = [...container.querySelectorAll('span')].filter((el) =>
      el.className.includes('bg-surface-3'),
    );
    expect(bars).toHaveLength(4);
  });

  it('행 라벨을 실제와 같이 적는다', () => {
    const { getByText } = renderQuietly();
    for (const label of ['이상 점수', '가동', '방류', '수신']) {
      expect(getByText(label)).toBeTruthy();
    }
  });

  /**
   * **발치 범례를 그린다.** 계측이 아니라 상수에서 오므로 기다릴 이유가 없고, 빼면 값이
   * 도착할 때 카드가 약 33px 늘어난다. 실제 리본과 **같은 부품**(`RibbonLegend`)을 쓴다.
   */
  it('범례를 그린다 — 값이 도착할 때 카드가 늘어나지 않게', () => {
    const { getByText } = renderQuietly();
    for (const label of ['가동·방류 중', '정지·중단', '모름(결측)']) {
      expect(getByText(label)).toBeTruthy();
    }
  });

  /**
   * **«방류 0시간»을 적지 않는다.** 실제 캡션은 방류 시간과 알람 건수를 세는데 둘 다 아직
   * 모른다 — 0을 적으면 없는 사실을 주장한다(**E4**). 조회 조건은 화면이 아는 값이라 적는다.
   */
  it('캡션이 세지 않은 값을 적지 않는다', () => {
    const { container } = renderQuietly();
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/방류\s*0시간|알람\s*0건/);
    expect(text).toContain('분 주기');
  });

  it('자리가 무엇을 기다리는지 알린다', () => {
    const { container } = renderQuietly();
    expect(container.querySelector('[role="status"]')?.getAttribute('aria-label')).toContain(
      '계측',
    );
  });
});
