import { describe, expect, it } from 'vitest';
import { SITE_SCENARIOS } from '@/shared/config/demo-scenario';
import { MEASUREMENT_ITEMS } from '@/shared/config/measurement';
import { isDischargingAt, timelineIndexAt } from '@/shared/lib/timeline';
import { INFLOW_FORECAST_CODE, getFlowForecast } from '@/entities/prediction';
import { getMeasurementSeries } from './fixtures';

/**
 * **판정과 그림이 한 원천에서 나와야 한다.**
 *
 * 리본·리포트·이상 탐지가 보는 방류 여부는 `isDischargingAt`이고 차트가 그리는 것은 `flow`
 * 계열이다. 둘이 갈리면 한 화면이 두 말을 한다 — 실제로 그랬다: 일간 운전 리본이
 * `방류 중단`이라 적는 구간에도 유량이 412 언저리로 흘렀고, **금일 누적 배출량은 방류하지
 * 않은 시간까지 더하게 된다** `[사용자 결정 2026-08-28]`.
 *
 * 같은 파일이 전류·전력에 이미 같은 규칙을 쓰고 있었다(`isTreatmentIdleAt` → 0). 방류도
 * 그렇게 맞췄고, 되돌아오지 않게 여기서 잰다.
 */
describe('유량과 방류 여부의 정합', () => {
  it('방류하지 않는 표본의 유출 유량은 0이다', () => {
    for (const scenario of SITE_SCENARIOS) {
      const series = getMeasurementSeries(scenario.id);
      series.forEach((point, i) => {
        if (isDischargingAt(scenario.id, i) !== false) return;
        expect(point.flow, `${scenario.id}[${i}]`).toBe(0);
      });
    }
  });

  /**
   * **유입은 0으로 만들지 않는다.** 방류를 멈춰도 폐수는 들어온다 — 그것이 수위가 차오르는
   * 근거다. 여기까지 0으로 만들면 «공장이 멈췄다»가 되어 다른 거짓말이 된다.
   */
  it('방류하지 않아도 유입 유량은 흐른다', () => {
    const held = SITE_SCENARIOS.filter((s) => s.online && s.dischargeGap);
    expect(held.length).toBeGreaterThan(0);

    for (const scenario of held) {
      const series = getMeasurementSeries(scenario.id);
      const idle = series.filter((_, i) => isDischargingAt(scenario.id, i) === false);
      expect(idle.length, scenario.id).toBeGreaterThan(0);
      expect(idle.every((p) => p.inflow !== null && p.inflow > 0), scenario.id).toBe(true);
    }
  });

  /** 두절 구간은 **0이 아니라 모름**이다 — 0으로 적으면 안 내보냈다는 사실 주장이 된다(E4) */
  it('두절 구간의 유량은 0이 아니라 null이다', () => {
    const offline = SITE_SCENARIOS.find((s) => !s.online)!;
    const series = getMeasurementSeries(offline.id);
    expect(series.every((p) => p.flow === null)).toBe(true);
  });
});

/**
 * 수위는 **앞 표본에서 이어지는 유일한 계열**이라 다른 항목과 규칙이 다르다.
 * 방류를 멈추면 차오르고 재개하면 빠진다 — 그 방향이 뒤집히면 화면이 거꾸로 말한다.
 */
describe('방류 수조 수위', () => {
  const [floor, full] = MEASUREMENT_ITEMS.level.range;

  it('만수위를 넘지 않고 바닥 아래로 내려가지 않는다', () => {
    for (const scenario of SITE_SCENARIOS) {
      for (const point of getMeasurementSeries(scenario.id)) {
        if (point.level === null) continue;
        expect(point.level, scenario.id).toBeGreaterThanOrEqual(floor);
        expect(point.level, scenario.id).toBeLessThanOrEqual(full);
      }
    }
  });

  it('방류를 멈춘 구간에서 차오른다', () => {
    const held = SITE_SCENARIOS.filter((s) => s.online && s.dischargeGap && s.id !== 'S-08');
    expect(held.length).toBeGreaterThan(0);

    for (const scenario of held) {
      const series = getMeasurementSeries(scenario.id);
      const idx = series
        .map((_, i) => i)
        .filter((i) => isDischargingAt(scenario.id, i) === false);
      const first = series[idx[0]!]!.level;
      const last = series[idx[idx.length - 1]!]!.level;
      expect(last!, `${scenario.id} 차오름`).toBeGreaterThan(first!);
    }
  });

  it('두절 구간의 수위는 모름이다', () => {
    const offline = SITE_SCENARIOS.find((s) => !s.online)!;
    expect(getMeasurementSeries(offline.id).every((p) => p.level === null)).toBe(true);
  });

  /**
   * **직선이면 계측값이 아니라 설정값으로 읽힌다.**
   *
   * 목표 수위를 고정값으로 두었더니 방류 구간이 없는 사업장(10곳 중 7곳)에서 수위가 한 값에
   * 수렴한 뒤 완전한 직선이 됐다 — 검토에서 잡았다. 목표가 천천히 숨 쉬게 고쳤다.
   */
  it('수렴한 뒤에도 직선이 아니다', () => {
    for (const scenario of SITE_SCENARIOS) {
      if (!scenario.online) continue;
      /*
       * **꼬리만 본다.** 시작값에서 목표로 다가가는 앞 구간은 목표가 고정이어도 값이 계속
       * 달라진다 — 전 구간을 세면 직선인 계열도 통과한다(그렇게 헛도는 검사를 한 번 썼다).
       */
      const tail = getMeasurementSeries(scenario.id)
        .slice(-120)
        .map((p) => p.level)
        .filter((v): v is number => v !== null);
      expect(new Set(tail).size, `${scenario.id} 꼬리의 서로 다른 값`).toBeGreaterThan(5);
    }
  });

  /**
   * **두절 동안 값을 굴리지 않는다.**
   *
   * 못 본 시간의 변화는 시연 데이터가 만들 것이 아니다 — 굴리면 복구 뒤의 값이 우리가
   * 지어낸 가정 위에 선다(E4). 끊기기 직전과 이어진 직후가 거의 같아야 한다.
   */
  it('두절 전후의 수위가 이어진다', () => {
    const scenario = SITE_SCENARIOS.find((s) => s.online && s.outageStartMinutesAgo !== null)!;
    const series = getMeasurementSeries(scenario.id);
    const gapStart = series.findIndex((p) => p.level === null);
    expect(gapStart, `${scenario.id} 두절 구간`).toBeGreaterThan(0);

    const gapEnd = series.findIndex((p, i) => i > gapStart && p.level !== null);
    expect(gapEnd).toBeGreaterThan(gapStart);

    const before = series[gapStart - 1]!.level!;
    const after = series[gapEnd]!.level!;
    /* 한 표본이 움직이는 폭(만수위의 6%보다 작다)만큼만 벌어져야 한다 */
    expect(Math.abs(after - before), `${scenario.id} ${before} → ${after}`).toBeLessThan(0.1);
  });

  /** 방류 여부가 만드는 변화를 숨결이 덮으면 이 계열이 말해야 할 것을 못 말한다 */
  it('숨결이 방류 상태가 만드는 차이보다 작다', () => {
    const held = getMeasurementSeries('S-08').map((p) => p.level!);
    const run = getMeasurementSeries('S-05').map((p) => p.level!);
    const spread = (v: number[]) => Math.max(...v) - Math.min(...v);
    /* 두 상태의 목표 차이(만수위의 45%)가 각 상태 안의 흔들림보다 커야 한다 */
    expect(Math.min(...held.slice(60))).toBeGreaterThan(Math.max(...run.slice(60)));
    expect(spread(run.slice(60))).toBeLessThan(1);
  });
});

/**
 * **두 생성기가 같은 판정을 봐야 한다.**
 *
 * 오염도 추정의 유량 계열은 계측 fixture와 **다른 생성기**를 쓴다(창이 짧고 프로파일이
 * 따로다). 계측 쪽만 방류에 맞췄더니 `금일 배출 현황`은 유량 0인데 오염도 추정은 계속
 * 흘렀다 — **한 사업장을 두 화면이 다르게 말했다**(E3). 검토에서 잡아 함께 고쳤다.
 */
describe('예측 계열과 계측 계열의 정합', () => {
  it('방류하지 않는 시각의 유량 예측 계열도 0이다', () => {
    const held = SITE_SCENARIOS.filter((s) => s.online && s.dischargeGap);
    expect(held.length).toBeGreaterThan(0);

    for (const scenario of held) {
      const forecast = getFlowForecast(scenario.id);
      const idle = forecast.points.filter((p) => {
        /* 창 밖 시각은 판정할 수 없다 — `timelineIndexAt`이 `null`을 돌려준다 */
        const i = timelineIndexAt(p.t);
        return i !== null && isDischargingAt(scenario.id, i) === false;
      });
      expect(idle.length, scenario.id).toBeGreaterThan(0);
      expect(idle.every((p) => p.value === 0), scenario.id).toBe(true);
    }
  });

  /** 유입은 0으로 만들지 않는다 — 방류를 멈춰도 폐수는 들어온다 */
  it('유입 예측 계열은 방류를 멈춰도 흐른다', () => {
    const held = SITE_SCENARIOS.filter((s) => s.online && s.dischargeGap);
    for (const scenario of held) {
      const forecast = getFlowForecast(scenario.id, INFLOW_FORECAST_CODE);
      const idle = forecast.points.filter((p) => {
        /* 창 밖 시각은 판정할 수 없다 — `timelineIndexAt`이 `null`을 돌려준다 */
        const i = timelineIndexAt(p.t);
        return i !== null && isDischargingAt(scenario.id, i) === false;
      });
      expect(idle.every((p) => p.value !== null && p.value > 0), scenario.id).toBe(true);
    }
  });
});
