import { describe, expect, it } from 'vitest';
import { DISCHARGE_LIMITS, type DischargeLimitTable } from '@/shared/config/discharge-limits';
import { buildOverlayRows } from './limit-ratio';
import type { ForecastSummary } from '../model/types';

const summary = (code: string, points: [string, number | null][]): ForecastSummary =>
  ({
    code,
    points: points.map(([t, value]) => ({ t, value })),
  }) as unknown as ForecastSummary;

/** 5분 간격 세 표본 — 실제 계열과 같은 간격이다 */
const THREE = summary('TOC', [
  ['2026-08-21T14:10:00Z', 1],
  ['2026-08-21T14:15:00Z', 2],
  ['2026-08-21T14:20:00Z', 3],
]);

/**
 * **미래 구간이 폭 0이었다.** 계열은 관측 창을 넘지 않아 마지막 점이 곧 `현재`인데,
 * 음영을 `현재`부터 그으니 그릴 자리가 없었다 — 화면에 아무것도 안 보였고 검사도 없었다.
 *
 * 값 없는 줄로 축을 늘리는 것이 유일한 방법이다. 계열은 `connectNulls={false}`라 그
 * 구간에서 끊기므로 **없는 예측을 그리지 않으면서** 자리만 생긴다(E3).
 */
describe('미래 구간 자리', () => {
  it('요청하지 않으면 줄을 늘리지 않는다', () => {
    expect(buildOverlayRows([THREE])).toHaveLength(3);
  });

  it('표본 간격만큼 뒤로 늘린다', () => {
    const rows = buildOverlayRows([THREE], undefined, 1);
    /* 5분 간격 · 1시간이면 12줄이 는다 */
    expect(rows).toHaveLength(3 + 12);
  });

  it('늘린 줄에는 값이 없다 — 없는 예측을 그리지 않는다', () => {
    const rows = buildOverlayRows([THREE], undefined, 1);
    rows.slice(3).forEach((row) => {
      expect(row.TOC).toBeUndefined();
    });
  });

  it('늘린 줄은 마지막 표본보다 뒤에 있다', () => {
    const rows = buildOverlayRows([THREE], undefined, 1);
    expect(Date.parse(rows[3]!.t)).toBeGreaterThan(Date.parse(rows[2]!.t));
  });

  /**
   * **시각 형식이 계열과 같아야 한다.** `timelineIsoAt`가 `…T14:20:00Z`(밀리초 없음)를
   * 쓰는데 `toISOString()`은 밀리초를 붙인다 — 축이 문자열 카테고리라 형식이 섞이면
   * 같은 축에 두 표기가 나오고, `row.t <= nowIso` 같은 문자열 비교도 어긋난다.
   */
  it('늘린 줄의 시각 형식이 계열과 같다', () => {
    const rows = buildOverlayRows([THREE], undefined, 1);
    rows.forEach((row) => {
      expect(row.t, row.t).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    });
  });

  /** 표본이 하나뿐이면 간격을 알 수 없다 — 지어내면 축이 엉뚱한 곳까지 늘어난다 */
  it('간격을 모르면 늘리지 않는다', () => {
    const one = summary('TOC', [['2026-08-21T14:20:00Z', 1]]);
    expect(buildOverlayRows([one], undefined, 6)).toHaveLength(1);
  });
});

/**
 * **변환한 뒤로 판단해야 한다.** 기준이 없으면 비율이 전부 `null`이 되는데, 원값을 보는
 * 술어는 참을 돌려준다 — 선은 안 보이는데 범례와 표에는 남아 `수신 없음`이라 적힌다.
 * 실제 사유는 `기준 미설정`이라 화면이 거짓을 말한다.
 */
describe('기준이 없는 계열', () => {
  it('비율은 전부 비어 있다', () => {
    const rows = buildOverlayRows([THREE], DISCHARGE_LIMITS);
    expect(rows.every((row) => row.TOC === null)).toBe(true);
  });

  it('기준이 있으면 값이 찬다', () => {
    const table: DischargeLimitTable = {
      ...DISCHARGE_LIMITS,
      TOC: { min: null, max: 10, source: '테스트', unavailableReason: null },
    };
    const rows = buildOverlayRows([THREE], table);
    expect(rows.every((row) => typeof row.TOC === 'number')).toBe(true);
  });
});
