import { describe, expect, it } from 'vitest';
import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { MEASUREMENT_ITEMS } from '@/shared/config/measurement';
import { SITE_SCENARIOS } from '@/shared/config/demo-scenario';
import { getFlowForecast, getForecast } from './api/fixtures';
import { formatR2 } from './lib/format-r2';
import { FLOW_FORECAST, FORECAST_TARGET_CODES, FORECAST_TARGETS } from './config/constants';
import { peakValue } from './lib/has-values';
import { trendVerdict } from './lib/verdict';

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
   * 회의가 6시간 예측을 내렸다 `[회의 2026-08-20]` `[INC-109]` — TN·TP로 6시간을 예측하는 것이
   * 아니라 TN·TP는 소프트 센싱으로 지금 값을 추정하는 항목이고, 6시간 예측은 실제로 재는
   * 항목으로 이야기해야 한다는 정리다. 그 대상이 정해지지 않았다(`[TBD-52]`).
   *
   * **테스트가 그것을 못박는다** — 원문이 아직 1~6시간 예측을 요구하므로(p.30·32·65) 예측선을
   * 되살리려는 힘이 계속 있다. 되살아나면 여기서 걸린다.
   */
  describe('예측 곡선과 신뢰구간을 만들지 않는다', () => {
    it('계열 점에 예측·신뢰구간 필드가 없다', () => {
      for (const point of getForecast('S-01', 'TOC').points) {
        expect(point).not.toHaveProperty('forecast');
        expect(point).not.toHaveProperty('lower');
        expect(point).not.toHaveProperty('upper');
      }
    });

    it('계열이 관측 창을 넘어가지 않는다 — 마지막 점이 지금보다 뒤가 아니다', () => {
      const points = getForecast('S-01', 'TOC').points;
      const last = Date.parse(points[points.length - 1]!.t);
      /* 예측 구간이 있었다면 마지막 점이 기준 시각보다 뒤에 있었다 */
      expect(last).toBeLessThanOrEqual(Date.parse(DEMO_NOW_ISO));
    });

    it('요약이 지평 시간을 싣지 않는다 — 그리지 않는 것의 길이를 적으면 있는 것처럼 읽힌다', () => {
      expect(getForecast('S-01', 'TOC')).not.toHaveProperty('horizonHours');
    });
  });

  /** TN·TP는 센서가 없다 — 값이 계측인지 추정인지 화면이 적어야 한다(E3) */
  describe('계열의 출처', () => {
    it('TN·TP는 소프트 센싱 추정이다', () => {
      expect(getForecast('S-01', 'TN').origin).toBe('softSensed');
      expect(getForecast('S-01', 'TP').origin).toBe('softSensed');
    });

    it('TOC와 유량은 직접 계측이다 — 계측 사양에 있다', () => {
      expect(getForecast('S-01', 'TOC').origin).toBe('measured');
      expect(getFlowForecast('S-01').origin).toBe('measured');
    });

    it('경향 카드도 출처를 함께 받는다 — 카드가 코드로 되찾아 오지 않게', () => {
      for (const trend of getForecast('S-01').trends) {
        expect(trend.origin).toBe(trend.code === 'TOC' ? 'measured' : 'softSensed');
      }
    });
  });

  describe('통신 두절 사업장 — 값을 지어내지 않는다(S-04)', () => {
    const offline = FORECAST_TARGET_CODES.map((code) => getForecast('S-04', code));

    it('세 항목 모두 전 구간이 결측이다', () => {
      for (const summary of offline) {
        expect(summary.online).toBe(false);
        expect(summary.points.every((p) => p.value === null)).toBe(true);
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

    it('통신이 살아 있는 사업장은 값을 낸다', () => {
      expect(getForecast('S-01', 'TOC').points.some((p) => p.value !== null)).toBe(true);
    });
  });

  /**
   * 유량이 계열에 들어간 근거는 발표자료 그림이다 `[INC-95 판정 2026-08-19]`.
   * 그런데 **성능 목표는 수질에만 있다** `[원문 p.26]` — 유량에 R²를 붙이면 원문에 없는
   * 성능을 화면이 주장하게 된다.
   */
  describe('유량 계열 — 없는 성능을 붙이지 않는다', () => {
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

    it('통신 두절이면 유량도 값을 만들지 않는다', () => {
      expect(getFlowForecast('S-04').points.every((p) => p.value === null)).toBe(true);
    });
  });

  /**
   * `발표 p.16 그림`이 차트 아래에 최대값을 함께 낸다.
   * **예측이 아니라 관측 구간의 최대다** `[INC-109]` — 예측 곡선을 내렸으므로 이름도 바뀌었다.
   */
  describe('최근 6시간 최대', () => {
    it('관측 구간의 최대다', () => {
      const summary = getForecast('S-01', 'TOC');
      const values = summary.points.map((p) => p.value).filter((v): v is number => v !== null);
      expect(peakValue(summary)).toBe(Math.max(...values));
    });

    it('값이 없으면 null이다 — 0으로 채우지 않는다(E4)', () => {
      expect(peakValue(getForecast('S-04', 'TOC'))).toBeNull();
    });
  });

  it('TP는 두 자리다 — 한 자리로 줄이면 값의 변화가 사라진다', () => {
    const tp = getForecast('S-01', 'TP');
    expect(tp.decimals).toBe(2);

    const values = tp.points.map((p) => p.value).filter((v): v is number => v !== null);
    const distinctAtOne = new Set(values.map((v) => v.toFixed(1))).size;
    const distinctAtTwo = new Set(values.map((v) => v.toFixed(2))).size;
    expect(distinctAtTwo).toBeGreaterThan(distinctAtOne);
  });
});

/**
 * 경향은 **계열에서 낸다.** 예전에는 시나리오 세기로만 정해서 차트가 내려가는데 카드가
 * `상승`이라 말할 수 있었고, 통신이 두절돼도 화살표가 찍혔다.
 */
describe('경향', () => {
  const online = SITE_SCENARIOS.filter(
    (site) => getForecast(site.id).trends.some((t) => t.value !== null),
  );

  it('통신이 두절되면 경향을 판정하지 않는다 — 화살표를 찍으면 없는 방향을 주장한다(E4)', () => {
    for (const trend of getForecast('S-04').trends) {
      expect(trend.value).toBeNull();
      expect(trend.trend).toBeNull();
    }
  });

  it('경향의 방향이 계열 앞뒤 절반의 차이와 어긋나지 않는다', () => {
    for (const site of online) {
      for (const code of FORECAST_TARGET_CODES) {
        const trend = getForecast(site.id, code).trends.find((t) => t.code === code)!;
        if (trend.trend === null) continue;

        const values = getForecast(site.id, code)
          .points.map((p) => p.value)
          .filter((v): v is number => v !== null);
        const half = Math.floor(values.length / 2);
        const mean = (xs: number[]) => xs.reduce((acc, v) => acc + v, 0) / xs.length;
        const delta = mean(values.slice(half)) - mean(values.slice(0, half));

        if (trend.trend === 'rising') expect(delta).toBeGreaterThan(0);
        if (trend.trend === 'falling') expect(delta).toBeLessThan(0);
      }
    }
  });

  /**
   * 파형이 인덱스만의 함수였을 때 세 항목이 같은 구간에서 같은 방향으로 움직여 열 사업장 중
   * 여덟 곳에서 카드 3장의 경향이 **전부 같았다.** 항목별 위상(`ForecastTargetProfile.phase`)이
   * 그것을 갈랐다.
   */
  it('한 사업장에서 세 항목의 경향이 서로 다른 곳이 있다', () => {
    const split = online.filter(
      (site) => new Set(getForecast(site.id).trends.map((t) => t.trend)).size === 3,
    );
    expect(split.length).toBeGreaterThan(0);
  });

  it('세 경향이 모두 나타난다 — 중립색이 시연에 한 번도 안 나오면 칩이 무의미하다', () => {
    const seen = new Set(online.flatMap((site) => getForecast(site.id).trends.map((t) => t.trend)));
    expect(seen).toEqual(new Set(['rising', 'steady', 'falling']));
  });
});

/**
 * 판정 문구는 entity가 낸다 — 세 화면이 같은 답을 내야 한다. 위젯이 각자 분기를 들고 있던
 * 동안 통합 관제는 농도를 찍고 TOC를 `AI 추정`이라 적었다.
 */
describe('판정 문구', () => {
  const of = (siteId: string) => getForecast(siteId).trends[0]!;

  it('값이 없으면 기준 유무보다 먼저 수신 없음이다', () => {
    /* `isOverLimit`이 "값 없음"과 "기준 없음"을 같은 null로 내므로 순서가 뒤집히면 안 된다 */
    expect(trendVerdict(of('S-04'), null).text).toBe('수신 없음');
  });

  it('기준이 설정되면 기준 대비로 적는다', () => {
    expect(trendVerdict(of('S-01'), true).text).toBe('기준보다 높음');
    expect(trendVerdict(of('S-01'), false).text).toBe('기준보다 낮음');
  });

  /** 두 판정의 단어가 섞이면 관측 기반 판정이 법적 판정으로 읽힌다 */
  /**
   * **시간 축으로 대체하지 않는다** `[사용자 지적 2026-08-21]`. 한때 기준이 없을 때
   * `직전 3시간보다 높음`으로 떨어뜨렸는데, 요구는 *기준치보다* 높고 낮음이었다.
   */
  it('기준이 없으면 기준 미설정이라 적고 다른 축을 끌어오지 않는다', () => {
    const verdict = trendVerdict(of('S-01'), null);
    expect(verdict.text).toBe('기준 미설정');
    expect(verdict.text).not.toContain('시간');
  });

  it('무엇을 해야 하는지가 근거 자리에 온다 — 빈 칸이면 값이 없는 것으로 읽힌다', () => {
    expect(trendVerdict(of('S-01'), true).basis).toContain('기준치');
    expect(trendVerdict(of('S-01'), null, '지역구분을 고르세요').basis).toBe('지역구분을 고르세요');
    expect(trendVerdict(of('S-01'), null).basis).toContain('[TBD-45]');
  });
});
