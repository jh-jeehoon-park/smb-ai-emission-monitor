// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { DISCHARGE_LIMITS, UNRESOLVED_LIMIT_TEXT } from '@/shared/config/discharge-limits';
import { getMeasurementSeries } from '@/entities/measurement';
import { WaterQualityGrid } from './water-quality-grid';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

const points = getMeasurementSeries('S-02');

/**
 * **표를 prop으로 받는다.** 이 위젯은 사업장을 모르고 라우터도 필요 없다 — 훅을 부르게 했더니
 * `useSelectedSiteId` → `useRouter`로 이어져 라우터 없이는 렌더도 못 했다.
 *
 * 정적 표를 넘기므로 아래 기대값은 설정 도입 전과 같다.
 */
const draw = (codes: Parameters<typeof WaterQualityGrid>[0]['codes'], limits = DISCHARGE_LIMITS) =>
  render(<WaterQualityGrid data={points} codes={codes} limits={limits} />);

/**
 * **기준은 이제 글로만 말한다.**
 *
 * 기준 밖 구간 음영을 걷어냈다 `[사용자 결정 2026-08-20]` — 초과가 없으면 축 여백만큼의
 * 고정 높이로만 그려져 값이 6.4든 8.5든 같았고, 화면에 이름표도 없었다. 시각 채널을
 * 지운 이상 남은 글이 사라지면 기준 자체가 화면에서 없어진다.
 */
describe('기준 표기', () => {
  it('기준이 있는 항목은 범위와 초과 건수를 적는다', () => {
    draw(['pH']);
    expect(screen.getByText(/기준 5\.80–8\.60/)).toBeTruthy();
    expect(screen.getByText(/초과 없음/)).toBeTruthy();
  });

  /** 0은 "확인했더니 없었다"는 뜻이라, 기준을 모르는 항목이 안전한 항목으로 둔갑한다(E4) */
  it('기준이 없는 항목은 초과 0건이 아니라 미확정이라 적는다', () => {
    draw(['TOC']);
    expect(screen.getByText(UNRESOLVED_LIMIT_TEXT)).toBeTruthy();
    expect(screen.queryByText(/초과/)).toBeNull();
  });

  it('허가증 확인 문구를 출처로 달고 있다 — 확정 기준처럼 읽히면 안 된다', () => {
    const { container } = draw(['pH']);
    const note = container.querySelector('[title]');
    expect(note?.getAttribute('title')).toContain('허가증');
  });
});
