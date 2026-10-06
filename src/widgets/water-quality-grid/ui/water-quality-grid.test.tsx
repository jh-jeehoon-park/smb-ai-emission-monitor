// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { DISCHARGE_LIMITS, UNRESOLVED_LIMIT_TEXT } from '@/shared/config/discharge-limits';
import type { MeasurementItemCode } from '@/shared/config/measurement';
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
const draw = (codes: MeasurementItemCode[], limits = DISCHARGE_LIMITS) =>
  render(
    <WaterQualityGrid data={points} sections={[{ codes }]} limits={limits} windowHours={24} />,
  );

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

  /**
   * **`[title]` 첫 요소를 집지 않는다.** 예전에는 `container.querySelector('[title]')`로
   * 찾았는데, 단위 한글 병기 툴팁이 기호에 붙으면서(`[회의 피드백 2026-08-24]`) 그쪽이
   * 먼저 걸려 이 테스트가 깨졌다 — 카드에 툴팁이 하나 더 생기는 것만으로 무너지는 찾기였다.
   * 기준 문구를 글자로 찾아 그 문단을 집는다.
   */
  it('허가증 확인 문구를 출처로 달고 있다 — 확정 기준처럼 읽히면 안 된다', () => {
    draw(['pH']);
    const note = screen.getByText(/기준 5\.80–8\.60/).closest('p');
    expect(note?.getAttribute('title')).toContain('허가증');
  });
});

/**
 * **hover 면은 카드 루트다** `[사용자 지적 2026-09-07: 작은 선에 정확히 맞춰야 함]`.
 *
 * 차트 상자에 되돌려 붙이면 툴팁을 보려고 40px 띠에 다시 조준해야 한다 — 화면에서는
 * 아무것도 달라 보이지 않아 **눈으로는 회귀를 못 잡는다.** jsdom에는 배치가 없어
 * Recharts가 그려지지 않으므로(`ResponsiveContainer`가 0×0) 소스로 확인한다.
 */
describe('hover 면', () => {
  const source = readFileSync('src/widgets/water-quality-grid/ui/water-quality-grid.tsx', 'utf8');

  it('카드 루트가 hover 면이고 차트 상자는 중계 대상일 뿐이다', () => {
    expect(source).toMatch(/rounded-nested bg-surface-2 p-3" \{\.\.\.surfaceProps\}/);
    expect(source).toMatch(/ref=\{chartRef\}[^>]*h-10/);
  });

  /** 차트 상자에 hover 면을 두던 옛 훅이 남아 있으면 둘이 겹쳐 돈다 */
  it('옛 hoverProps가 남아 있지 않다', () => {
    expect(source).not.toContain('hoverProps');
  });

  /**
   * **스로틀을 켜 두면 툴팁이 «뜨문뜨문» 돌아온다** `[사용자 지적 2026-09-07]`.
   * 중계가 프레임당 하나로 줄여 보내는데 차트가 그것을 또 미루면, `mousemove`마다 앞선
   * 예약을 취소하는 성질과 겹쳐 콜백이 돌지 못한다(`chart-relay.recharts.test.tsx`).
   */
  it('차트 쪽 rAF 스로틀을 꺼 둔다', () => {
    expect(source).toContain('throttledEvents={[]}');
  });

  /** 여백이 갈리면 중계가 플롯 밖을 가리켜 **툴팁을 끄는 쪽으로** 떨어진다 */
  it('차트 여백과 중계가 같은 상수를 본다', () => {
    expect(source).toContain('margin={SPARK_MARGIN}');
    expect(source).toContain('useChartSurface(SPARK_MARGIN)');
  });
});
