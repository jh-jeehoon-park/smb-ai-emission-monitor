// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import {
  PROVISIONAL_ANOMALY_BANDS,
  PROVISIONAL_STATUS_LABELS,
} from '@/shared/config/provisional';
import { AnomalyBandLegend } from './anomaly-band-legend';

afterEach(cleanup);

/**
 * **회의가 지적한 것은 화면에 보이는 글이다** `[회의 피드백 2026-08-24: 범례를 숫자와 "설명"으로]`.
 * `anomalyBandLabel`이 맞는 문자열을 만드는지는 순수 함수 테스트가 보지만, 범례가 그 함수를
 * 실제로 쓰는지는 여기서만 확인된다 — 위젯이 `anomalyBandRange`로 되돌아가도 그쪽은 통과한다.
 */
describe('AnomalyBandLegend', () => {
  it('구간마다 경계값과 등급 이름을 함께 낸다', () => {
    render(<AnomalyBandLegend />);
    PROVISIONAL_ANOMALY_BANDS.forEach((band) => {
      const label = `${band.min}–${band.max} ${PROVISIONAL_STATUS_LABELS[band.level]}`;
      expect(screen.getByText(label, { trim: true })).toBeTruthy();
    });
  });

  /** 색점은 색을 못 가리는 사람에게 아무 말도 하지 않는다 — 글이 정보를 다 담고 점은 숨긴다 */
  it('색점을 보조기술에서 숨긴다', () => {
    const { container } = render(<AnomalyBandLegend />);
    const swatches = container.querySelectorAll('[aria-hidden]');
    expect(swatches).toHaveLength(PROVISIONAL_ANOMALY_BANDS.length);
  });
});
