import { describe, expect, it } from 'vitest';
import { MEASUREMENT_ITEMS } from '@/shared/config/measurement';
import { getForecast } from './api/fixtures';
import { formatR2 } from './lib/format-r2';
import { FORECAST_TARGET_CODES, FORECAST_TARGETS } from './config/constants';

// 세그먼트를 가로지르는 불변식을 모은다 — 한 곳이 바뀌면 다른 곳이 따라와야 하는 것들.
describe('prediction 슬라이스 불변식 — 자릿수(E1)와 산출 근거(E3)', () => {
  it.each(FORECAST_TARGET_CODES)('%s의 자릿수가 계측 설정과 같다', (code) => {
    expect(FORECAST_TARGETS[code].decimals).toBe(MEASUREMENT_ITEMS[code].decimals);
  });

  it('요약이 자릿수를 함께 낸다 — 위젯이 값을 임의로 반올림하지 못하게', () => {
    for (const code of FORECAST_TARGET_CODES) {
      expect(getForecast('site-01', code).decimals).toBe(FORECAST_TARGETS[code].decimals);
    }
  });

  it('경향 카드도 자릿수를 함께 받는다 — 카드가 항목 프로파일을 되찾아 오지 않게', () => {
    // 통합 관제와 오염도 추정이 같은 카드를 그린다. 한쪽만 프로파일을 조회하면 값이 갈린다.
    for (const trend of getForecast('site-01').trends) {
      expect(trend.decimals).toBe(FORECAST_TARGETS[trend.code].decimals);
      expect(trend.value.toFixed(trend.decimals)).toBe(
        trend.value.toFixed(FORECAST_TARGETS[trend.code].decimals),
      );
    }
  });

  it('어느 항목을 보든 경향 카드 3개의 자릿수가 같다', () => {
    const fromTOC = getForecast('site-01', 'TOC').trends.map((t) => [t.code, t.decimals]);
    const fromTP = getForecast('site-01', 'TP').trends.map((t) => [t.code, t.decimals]);
    expect(fromTOC).toEqual(fromTP);
  });

  it('R²는 원문이 준 항목만 값을 갖는다 — 없는 성능을 지어내지 않는다(E3)', () => {
    // 사업계획서 p.27이 TN·TP만 제시한다. TOC의 R²는 원문에 없다.
    expect(FORECAST_TARGETS.TN.r2).toBe(0.886);
    expect(FORECAST_TARGETS.TP.r2).toBe(0.782);
    expect(FORECAST_TARGETS.TOC.r2).toBeNull();
  });

  it('formatR2 — 두 화면이 같은 문구·자릿수를 쓴다', () => {
    expect(formatR2(null)).toBe('원문 미규정');
    expect(formatR2(FORECAST_TARGETS.TN.r2)).toBe('0.886');
    expect(formatR2(FORECAST_TARGETS.TP.r2)).toBe('0.782');
    // 원문 값을 반올림하면 원문 값이 아니게 된다
    expect(formatR2(0.886)).not.toBe('0.89');
  });

  it('TP는 두 자리다 — 한 자리로 줄이면 값의 변화가 사라진다', () => {
    const tp = getForecast('site-01', 'TP');
    expect(tp.decimals).toBe(2);

    const values = tp.points.map((p) => p.forecast).filter((v): v is number => v !== null);
    const distinctAtOne = new Set(values.map((v) => v.toFixed(1))).size;
    const distinctAtTwo = new Set(values.map((v) => v.toFixed(2))).size;
    expect(distinctAtTwo).toBeGreaterThan(distinctAtOne);
  });
});
