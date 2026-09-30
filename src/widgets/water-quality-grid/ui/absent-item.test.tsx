// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { DISCHARGE_LIMITS } from '@/shared/config/discharge-limits';
import { WATER_QUALITY_CODES } from '@/shared/config/measurement';
import { getMeasurementSeries } from '@/entities/measurement';
import { WaterQualityGrid } from './water-quality-grid';
import styles from './water-quality-grid.module.scss';

/**
 * **이 사업장에 없는 계측기** `[사용자 요청 2026-09-28]` `[TBD-61]`.
 *
 * 실증 현장조사가 1차 5개소의 수질 항목이 7·8·9종으로 갈리는 것을 보여 줬다. 그런데
 * **8종은 필수 항목이다** `[사용자 결정 2026-09-28]` — 없는 것을 **감추면** 그 항목을 재지
 * 않는다는 사실 자체가 화면에서 사라진다(**A2**).
 *
 * 그리고 **「수신 없음」과 같은 말로 적으면 안 된다** — 그쪽은 채널이 있는데 값이 오지 않는
 * 것이라, 장비가 없는 곳에서 **있지도 않은 통신 장애를 찾게 된다**.
 */
afterEach(cleanup);

const points = getMeasurementSeries('S-02');

const draw = (absentCodes: (typeof WATER_QUALITY_CODES)[number][] = []) =>
  render(
    <WaterQualityGrid
      data={points}
      sections={[{ codes: [...WATER_QUALITY_CODES] }]}
      limits={DISCHARGE_LIMITS}
      windowHours={24}
      absentCodes={absentCodes}
    />,
  );

describe('미설치 항목', () => {
  it('기본값은 전부 보유다 — 넘기지 않으면 아무것도 미설치가 아니다', () => {
    draw();
    expect(screen.queryByText('미설치')).toBeNull();
  });

  /** **이 검사가 본론이다.** 카드가 사라지면 그 사실을 물어볼 거리조차 없어진다 */
  it('끈 항목의 카드가 사라지지 않는다', () => {
    const { container } = draw(['chromaticity']);

    /* 8종이 그대로 선다 — 일곱으로 줄지 않는다 */
    const cards = container.querySelectorAll(`.${CSS.escape(styles.card)}`);
    expect(cards.length).toBeGreaterThanOrEqual(WATER_QUALITY_CODES.length);
    expect(screen.getByText('미설치')).toBeInTheDocument();
  });

  it('미설치는 「수신 없음」·「계측 없음」과 다른 말이다', () => {
    draw(['chromaticity']);

    expect(screen.getByText('미설치')).toBeInTheDocument();
    expect(screen.getByText('이 사업장에 없음')).toBeInTheDocument();
    /* 같은 카드가 두 말을 동시에 하지 않는다 */
    expect(screen.queryByText('계측 없음')).toBeNull();
  });

  it('보유한 항목은 값을 그대로 그린다', () => {
    draw(['chromaticity']);
    /* 끄지 않은 항목은 미설치 문구를 얻지 않는다 — 하나만 꺼졌다 */
    expect(screen.getAllByText('미설치')).toHaveLength(1);
  });
});

/**
 * **위젯이 사업장 훅을 부르지 않는다.** 부르면 `useSelectedSiteId` → `useRouter`로 이어져
 * **라우터 없이는 렌더도 못 한다** — `unit-annotation.test.tsx`가 그 사실을 적어 두었고,
 * 이번 작업에서 실제로 그렇게 한 번 깨뜨렸다가 되돌렸다. `limits`와 같이 prop으로 받는다.
 */
describe('격자는 사업장을 모른다', () => {
  const source = readFileSync('src/widgets/water-quality-grid/ui/water-quality-grid.tsx', 'utf8');
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

  it('파일을 실제로 읽었다', () => {
    expect(code).toContain('absentCodes');
  });

  it('사업장 훅을 부르지 않는다', () => {
    expect(code).not.toContain('useInstruments(');
    expect(code).not.toContain('useSelectedSiteId(');
  });
});
