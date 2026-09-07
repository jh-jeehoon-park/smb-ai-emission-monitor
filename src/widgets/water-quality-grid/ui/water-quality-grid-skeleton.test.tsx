// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WATER_SERIES_CODES, FLOW_SERIES_CODES } from '@/entities/measurement';
import { MEASUREMENT_ITEMS } from '@/shared/config/measurement';
import type { GridSection } from './water-quality-grid';
import { WaterQualityGridSkeleton } from './water-quality-grid-skeleton';

/**
 * 계측 격자가 대기 중에 그리는 것 `[사용자 지적 2026-09-07]`.
 *
 * **이 파일이 하이드레이션 오류를 만들었던 곳이다.** 값 막대를 실제 값과 같은 `<p>` 안에
 * 넣어 단에서 높이를 물려받게 했는데, 그때 막대가 `<div>`라 브라우저 파서가 `<p>`를 먼저
 * 닫는다 — React가 *"In HTML, `<div>` cannot be a descendant of `<p>`"* 로 잡았다.
 * `Skeleton`을 `<span>`으로 바꿔 근본을 없앴고(`shared/ui/skeleton.test.tsx`), 여기서는
 * **그 트리가 실제로 깨끗한지**를 렌더로 본다.
 */
const SECTIONS: GridSection[] = [
  { title: '수질 8종', codes: WATER_SERIES_CODES },
  {
    title: '유량 — 들어온 양과 나간 양',
    codes: FLOW_SERIES_CODES,
    diff: { of: ['inflow', 'flow'], label: '유입 − 유출' },
  },
];

const errors: string[] = [];

afterEach(() => {
  errors.length = 0;
  vi.restoreAllMocks();
});

function renderQuietly() {
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    errors.push(args.map(String).join(' '));
  });
  return render(<WaterQualityGridSkeleton sections={SECTIONS} />);
}

describe('계측 격자 스켈레톤', () => {
  it('React가 경고하지 않는다', () => {
    renderQuietly();
    expect(errors.join('\n')).toBe('');
  });

  /**
   * **칸 수가 실제와 같아야 한다.** 차 칸(`Δ`)까지 세지 않으면 값이 도착할 때 격자가
   * 한 칸 밀린다.
   */
  it('칸 수가 항목 수 + 차 칸이다', () => {
    const { container } = renderQuietly();
    const expected = WATER_SERIES_CODES.length + FLOW_SERIES_CODES.length + 1;
    expect(container.querySelectorAll('.bg-surface-2')).toHaveLength(expected);
  });

  /** 기호와 항목 이름은 사전이 아는 것이라 기다리지 않는다 — 모르는 것만 면으로 덮는다 */
  it('기호와 항목 이름을 그린다', () => {
    const { getByText } = renderQuietly();
    for (const code of WATER_SERIES_CODES) {
      expect(getByText(MEASUREMENT_ITEMS[code].symbol)).toBeTruthy();
      expect(getByText(MEASUREMENT_ITEMS[code].label)).toBeTruthy();
    }
  });

  /** 묶음 제목도 계측이 아니다 */
  it('묶음 제목을 그린다', () => {
    const { getByText } = renderQuietly();
    expect(getByText('수질 8종')).toBeTruthy();
    expect(getByText('유량 — 들어온 양과 나간 양')).toBeTruthy();
  });

  /**
   * **확인된 부재의 어휘를 쓰지 않는다**(**E4**). 값 자리를 면으로 덮는 것이 이 부품의 일이고,
   * `수신 없음`·`—`을 적으면 대기가 결측으로 읽힌다.
   */
  it('값 자리에 부재를 적지 않는다', () => {
    const { container } = renderQuietly();
    /* 칸 안만 본다 — 묶음 제목의 `유량 — 들어온 양과 나간 양`은 값이 아니라 산문이다 */
    for (const card of container.querySelectorAll('.bg-surface-2')) {
      expect(card.textContent ?? '', card.textContent ?? '').not.toMatch(/수신 없음|계측 없음|—/);
    }
  });
});
