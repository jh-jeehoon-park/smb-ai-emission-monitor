import { describe, expect, it } from 'vitest';
import { MEASUREMENT_ITEMS } from '@/shared/config/measurement';
import { getForecast } from './api/fixtures';
import { formatR2 } from './lib/format-r2';
import { FLOW_FORECAST, FORECAST_TARGET_CODES, FORECAST_TARGETS } from './config/constants';
import { getFlowForecast, getForecast as getForecastFor } from './api/fixtures';
import { peakForecast } from './lib/has-values';

// 세그먼트를 가로지르는 불변식을 모은다 — 한 곳이 바뀌면 다른 곳이 따라와야 하는 것들.
describe('prediction 슬라이스 불변식 — 자릿수(E1)와 산출 근거(E3)', () => {
  it.each(FORECAST_TARGET_CODES)('%s의 자릿수가 계측 설정과 같다', (code) => {
    expect(FORECAST_TARGETS[code].decimals).toBe(MEASUREMENT_ITEMS[code].decimals);
  });

  it('요약이 자릿수를 함께 낸다 — 위젯이 값을 임의로 반올림하지 못하게', () => {
    for (const code of FORECAST_TARGET_CODES) {
      expect(getForecast('S-01', code).decimals).toBe(FORECAST_TARGETS[code].decimals);
    }
  });

  it('경향 카드도 자릿수를 함께 받는다 — 카드가 항목 프로파일을 되찾아 오지 않게', () => {
    // 통합 관제와 오염도 추정이 같은 카드를 그린다. 한쪽만 프로파일을 조회하면 값이 갈린다.
    for (const trend of getForecast('S-01').trends) {
      expect(trend.decimals).toBe(FORECAST_TARGETS[trend.code].decimals);
      expect(trend.value).not.toBeNull();
      expect(trend.value!.toFixed(trend.decimals)).toBe(
        trend.value!.toFixed(FORECAST_TARGETS[trend.code].decimals),
      );
    }
  });

  it('어느 항목을 보든 경향 카드 3개의 자릿수가 같다', () => {
    const fromTOC = getForecast('S-01', 'TOC').trends.map((t) => [t.code, t.decimals]);
    const fromTP = getForecast('S-01', 'TP').trends.map((t) => [t.code, t.decimals]);
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

  /**
   * 화면이 "통신이 두절되면 추정도 중단되며 마지막 산출 시각만 남는다"라고 적는다.
   * 그런데 예측선을 그려 주면 그 문장과 차트가 서로 다른 말을 한다 — 없는 6시간 뒤 값을
   * 만들어 내는 쪽이 더 위험하다(E3).
   */
  describe('통신 두절 사업장 — 예측을 지어내지 않는다(S-04)', () => {
    const offline = FORECAST_TARGET_CODES.map((code) => getForecast('S-04', code));

    it('세 항목 모두 예측 지점이 없다', () => {
      for (const summary of offline) {
        expect(summary.online).toBe(false);
        expect(summary.points.every((p) => p.forecast === null)).toBe(true);
      }
    });

    it('신뢰구간도 없다 — 밴드만 남으면 예측이 있는 것처럼 보인다', () => {
      for (const summary of offline) {
        expect(summary.points.every((p) => p.lower === null && p.upper === null)).toBe(true);
      }
    });

    it('경향 추정값은 0이 아니라 null이다', () => {
      for (const trend of offline[0]!.trends) {
        expect(trend.value).toBeNull();
      }
    });

    it('마지막 산출 시각은 남는다 — 언제까지 산출했는지가 정보다(E3)', () => {
      expect(offline[0]!.computedAtIso).not.toBe('');
    });

    it('통신이 살아 있는 사업장은 그대로 예측을 낸다', () => {
      const online = getForecast('S-01', 'TOC');
      expect(online.points.some((p) => p.forecast !== null)).toBe(true);
    });
  });

  /**
   * 유량이 예측 대상에 들어간 근거는 발표자료 그림이다 `[INC-95 판정 2026-08-19]`.
   * 그런데 **성능 목표는 수질 예측에만 있다** `[원문 발표 p.26]` — 유량에 R²를 붙이면
   * 원문에 없는 성능을 화면이 주장하게 된다.
   */
  describe('유량 예측 — 없는 성능을 붙이지 않는다', () => {
    it('R²가 없다', () => {
      expect(FLOW_FORECAST.r2).toBeNull();
    });

    it('요약도 유량 코드를 그대로 낸다 — 소비처가 라벨을 자르지 않게', () => {
      expect(getFlowForecast('S-01').code).toBe('flow');
    });

    it('단위와 자릿수가 계측 유량과 같다(E1)', () => {
      const summary = getFlowForecast('S-01');
      expect(summary.unit).toBe(MEASUREMENT_ITEMS.flow.unit);
      expect(summary.decimals).toBe(MEASUREMENT_ITEMS.flow.decimals);
    });

    it('오염도 3항목 목록에는 들어가지 않는다 — 경향 카드는 오염도 전용이다', () => {
      expect(FORECAST_TARGET_CODES).not.toContain('flow');
      expect(getFlowForecast('S-01').trends).toHaveLength(FORECAST_TARGET_CODES.length);
    });

    it('통신 두절이면 유량도 예측을 만들지 않는다', () => {
      expect(getFlowForecast('S-04').points.every((p) => p.forecast === null)).toBe(true);
    });
  });

  /**
   * `발표 p.16 그림`이 예측 화면에 `최대 예측값`을 함께 낸다.
   * **실측 구간은 세지 않는다** — 지나간 값의 최대는 예측이 아니다.
   */
  describe('최대 예측값', () => {
    it('예측 구간의 최대다', () => {
      const summary = getForecastFor('S-01', 'TOC');
      const forecasts = summary.points
        .map((p) => p.forecast)
        .filter((v): v is number => v !== null);
      expect(peakForecast(summary)).toBe(Math.max(...forecasts));
    });

    it('실측이 더 커도 실측을 고르지 않는다', () => {
      const summary = getForecastFor('S-01', 'TOC');
      const peak = peakForecast(summary)!;
      const actualOnly = summary.points.filter((p) => p.forecast === null && p.actual !== null);
      expect(actualOnly.length).toBeGreaterThan(0);
      expect(summary.points.some((p) => p.forecast === peak)).toBe(true);
    });

    it('예측이 없으면 null이다 — 0으로 채우지 않는다(E4)', () => {
      expect(peakForecast(getForecastFor('S-04', 'TOC'))).toBeNull();
    });
  });

  it('TP는 두 자리다 — 한 자리로 줄이면 값의 변화가 사라진다', () => {
    const tp = getForecast('S-01', 'TP');
    expect(tp.decimals).toBe(2);

    const values = tp.points.map((p) => p.forecast).filter((v): v is number => v !== null);
    const distinctAtOne = new Set(values.map((v) => v.toFixed(1))).size;
    const distinctAtTwo = new Set(values.map((v) => v.toFixed(2))).size;
    expect(distinctAtTwo).toBeGreaterThan(distinctAtOne);
  });
});
