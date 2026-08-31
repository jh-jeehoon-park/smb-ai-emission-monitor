// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MEASUREMENT_ITEMS } from '@/shared/config/measurement';
import { WATER_SERIES_CODES, FLOW_SERIES_CODES } from '@/entities/measurement';
import { WaterQualityGrid } from './index';
import type { MeasurementPoint } from '@/entities/measurement';

/**
 * **격자의 칸마다 단위 한글이 붙어 있어야 한다** `[회의 피드백 2026-08-24]`.
 *
 * 카드 여덟 장이 붙어 있어 한글을 인라인으로 넣으면 칸이 뭉개진다 — 그래서 **항상 그려지는
 * 기호 span의 툴팁**이 맡는다. 이 자리가 두 번 어긋났다.
 *
 * 1. 처음에는 툴팁을 **단위 span**에 달았다. `pH`·`진동`은 `unit`이 빈 문자열이라 그 span이
 *    `{item.unit && …}`로 아예 렌더되지 않아 **병기가 조용히 사라졌다.**
 * 2. 2026-08-25에 `유입 − 유출` 차이 칸(`Δ`)을 새로 만들면서 **그 카드에만 툴팁을 안 달았다**
 *    `[사용자 지적 2026-08-28]`. 형제 카드 둘은 갖고 있어 눈으로는 티가 나지 않았다.
 *
 * 둘 다 "칸을 새로 만들면 규칙이 딸려오지 않는다"는 같은 종류다. 그래서 **칸의 종류를 세지
 * 않고 기호 span 전체를 훑는다** — 새 칸이 생겨도 이 검사가 함께 걸린다.
 */
const SYMBOL_CLASS = 'tracking-[0.08em]';

function points(codes: readonly string[]): MeasurementPoint[] {
  const at = (iso: string): MeasurementPoint =>
    ({
      timestamp: iso,
      ...Object.fromEntries(codes.map((c) => [c, 1])),
    }) as unknown as MeasurementPoint;
  return [at('2026-08-21T00:00:00Z'), at('2026-08-21T00:05:00Z')];
}

function symbolTitles(container: HTMLElement): (string | null)[] {
  return [...container.querySelectorAll(`span.${CSS.escape(SYMBOL_CLASS)}`)].map((el) =>
    el.getAttribute('title'),
  );
}

describe('계측 격자의 단위 한글 병기', () => {
  const codes = [...WATER_SERIES_CODES, ...FLOW_SERIES_CODES];

  function renderGrid() {
    return render(
      <WaterQualityGrid
        data={points(codes)}
        sections={[
          { title: '수질 8종', codes: [...WATER_SERIES_CODES] },
          {
            title: '유량',
            codes: [...FLOW_SERIES_CODES],
            diff: { of: ['inflow', 'flow'], label: '유입 − 유출' },
          },
        ]}
        windowHours={24}
      />,
    );
  }

  it('기호 span은 하나도 빠짐없이 툴팁을 갖는다', () => {
    const titles = symbolTitles(renderGrid().container);
    expect(titles.length).toBeGreaterThan(codes.length); // 항목 칸 + 차이 칸
    expect(titles.filter((t) => !t)).toHaveLength(0);
  });

  /** 단위가 빈 항목(pH)에서도 사라지지 않아야 한다 — 1번 함정 */
  it('단위가 없는 항목도 무엇이 없는지를 적는다', () => {
    const titles = symbolTitles(renderGrid().container).filter(Boolean) as string[];
    const ph = titles.find((t) => t.startsWith(MEASUREMENT_ITEMS.pH.label));
    expect(ph).toContain(MEASUREMENT_ITEMS.pH.unitKo);
    expect(ph).toContain('없음');
  });

  /** 차이 칸은 항목이 아니라 두 값의 차다 — 라벨 자리에 그 이름이 온다. 2번 함정 */
  it('차이 칸도 단위 한글을 갖는다', () => {
    const titles = symbolTitles(renderGrid().container).filter(Boolean) as string[];
    const diff = titles.find((t) => t.startsWith('유입 − 유출'));
    expect(diff).toBeDefined();
    expect(diff).toContain(MEASUREMENT_ITEMS.inflow.unitKo);
  });
});
