import { describe, expect, it } from 'vitest';
import { DISCHARGE_LIMITS } from '@/shared/config/discharge-limits';
import { PROVISIONAL_TREATMENT_STALL_SITES } from '@/shared/config/provisional';
import { WATER_SERIES_CODES, getMeasurementSeries } from '@/entities/measurement';
import { minutesToSamples } from '@/shared/lib/timeline';
import { TREND_BUCKET_MINUTES } from '../config/constants';
import { buildCompare, heldVolume, type InOutCompare } from './point-readings';

const points = getMeasurementSeries('S-01');
const build = (unreceived: Parameters<typeof buildCompare>[1] = []) =>
  buildCompare(points, unreceived, DISCHARGE_LIMITS);

/** 대조 줄의 **유출수** 쪽. 기준·판정은 방류수의 것이라 늘 이쪽을 본다 */
const outletOf = (compare: InOutCompare, code: string) =>
  compare.treatment.find((row) => row.code === code)!.outlet;

describe('유입 − 유출 — 한쪽이라도 모르면 모른다', () => {
  /**
   * **0으로 채우면 «머문 양이 0이다»라는, 재 보지 않은 주장이 된다**(E4).
   * 이 화면의 주인공이 그 값이라 여기가 무너지면 화면 전체가 거짓말한다.
   */
  it('한쪽이 결측이면 null이다', () => {
    expect(heldVolume(null, 700)).toBeNull();
    expect(heldVolume(1200, null)).toBeNull();
    expect(heldVolume(null, null)).toBeNull();
  });

  it('둘 다 있으면 뺀다', () => {
    expect(heldVolume(1200, 700)).toBe(500);
  });

  /** 나간 양이 더 많은 구간은 실제로 있다(수조를 비우는 중) — 0으로 자르면 수지가 거짓이 된다 */
  it('음수를 0으로 자르지 않는다', () => {
    expect(heldVolume(700, 1200)).toBe(-500);
  });
});

describe('지점 묶음', () => {
  it('두 지점의 유량이 서로 다른 계열에서 온다', () => {
    const c = build();
    expect(c.inlet.flow.code).toBe('inflow');
    expect(c.outlet.flow.code).toBe('flow');
  });

  /** 유입은 펌프가 도는지가 «들어오고 있는가»의 증거이고, 유출은 수조 수위가 그렇다 */
  it('지점마다 함께 읽는 항목이 다르다', () => {
    const c = build();
    expect(c.inlet.aside.map((r) => r.code)).toEqual(['current', 'power']);
    expect(c.outlet.aside.map((r) => r.code)).toEqual(['level']);
  });

  /**
   * **원본 그대로 내보내지 않는다.** 1440점을 420px에 그리면 픽셀당 3.4점이라 선이 «털»이
   * 된다 — 버킷은 분으로 세고 결측 버킷은 결측으로 남는다.
   */
  it('추이 계열이 분 단위 버킷으로 솎여 온다', () => {
    const c = build();
    const buckets = Math.ceil(points.length / minutesToSamples(TREND_BUCKET_MINUTES));
    expect(c.inlet.history).toHaveLength(buckets);
    expect(c.outlet.history).toHaveLength(buckets);
    expect(c.inlet.history.length).toBeLessThan(points.length);
  });

  /** 버킷이 통째로 비면 결측이다 — 남은 표본으로 메우면 두절이 정상 추세로 이어져 보인다(E4) */
  it('전 구간 두절 사업장의 추이는 전부 결측이다', () => {
    const dark = buildCompare(getMeasurementSeries('S-08'), [], DISCHARGE_LIMITS);
    const anyKnown = dark.outlet.history.some((v) => v !== null);
    const anyKnownSource = getMeasurementSeries('S-08').some((p) => p.flow !== null);
    expect(anyKnown).toBe(anyKnownSource);
  });

  /**
   * **수질 8종이 두 지점의 짝으로 선다** `[회의 2026-09-08]`.
   *
   * 한때 유출 한 지점뿐이었다 — 계측 서버에 유입 수질 채널이 없다는 **데이터 사정**이 근거
   * 자리에 있었고, 지금은 시연 계열이 그 자리를 채운다 `[TBD-59]` `[사용자 지적 2026-09-10]`.
   */
  it('수질 항목마다 유입·유출 짝이 있다', () => {
    const c = build();
    expect(c.treatment).toHaveLength(WATER_SERIES_CODES.length);
    expect(c.treatment.every((row) => row.inlet.code !== row.outlet.code)).toBe(true);
  });

  /**
   * **유입값이 시연값임을 데이터가 들고 있다** — 화면이 배지를 그릴 근거다. 이 표시가
   * 사라지면 우리가 만든 값이 계측으로 읽힌다(**E4**).
   */
  it('유입은 시연값으로, 유출은 실측으로 표시된다', () => {
    const c = build();
    expect(c.treatment.every((row) => row.inlet.demo)).toBe(true);
    expect(c.treatment.every((row) => !row.outlet.demo)).toBe(true);
  });

  /**
   * **판정 대상은 다섯이다** `[TBD-59]`. 수온·EC·pH는 유입과 같은 것이 정상이라 판정에서
   * 뺀다 — 넣으면 정상 사업장이 상시로 «처리 미흡»이 된다.
   */
  it('판정 대상과 아닌 것이 갈린다', () => {
    const c = build();
    const judged = c.treatment.filter((row) => row.judged).map((row) => row.code);

    expect([...judged].sort()).toEqual(['DO', 'NO3N', 'TOC', 'chromaticity', 'turbidity']);
    expect(c.treatment.filter((row) => !row.judged).every((row) => !row.similar)).toBe(true);
  });

  /** 부호를 글로 적는다 — 색으로 방향을 가르면 «줄어드는 것이 좋다»는 주장이 된다 */
  it('변화 문구가 방향을 말한다', () => {
    const toc = build().treatment.find((row) => row.code === 'TOC')!;
    const dissolvedOxygen = build().treatment.find((row) => row.code === 'DO')!;

    expect(toc.changeText).toContain('감소');
    expect(dissolvedOxygen.changeText).toContain('증가');
  });

  /**
   * **판정 불가와 정상을 가른다**(E4). 전 구간 두절이면 대조가 성립하지 않는데 `처리 확인됨`
   * 이라 적으면 «재 봤더니 괜찮더라»가 되어 없는 관측을 주장한다.
   */
  it('수질을 한 점도 못 받으면 판정 불가다', () => {
    /*
     * **사업장을 골라 쓰지 않는다.** 시연 사업장은 계열마다 두절 구간이 달라(`S-08`은 방류가
     * 비어도 수질은 온다) «전 구간 두절»을 사업장 이름으로 대신할 수 없다. 여기서 재려는 것은
     * «수질이 없을 때 무엇이라 적는가»이므로 그 조건을 직접 만든다.
     */
    const blind = points.map((point) => {
      const copy = { ...point };
      for (const code of WATER_SERIES_CODES) copy[code] = null;
      return copy;
    });

    const dark = buildCompare(blind, [], DISCHARGE_LIMITS);
    expect(dark.verdict.kind).toBe('unknown');
    expect(dark.verdict.headline).toBe('판정 불가');
  });

  /** 정체를 심은 사업장에서 화면이 실제로 «처리 상태 확인»이라 적어야 한다 */
  it('정체 사업장은 처리 상태 확인이다', () => {
    const stalled = buildCompare(
      getMeasurementSeries(PROVISIONAL_TREATMENT_STALL_SITES[0]!),
      [],
      DISCHARGE_LIMITS,
    );

    expect(stalled.verdict.kind).toBe('stall');
    expect(stalled.verdict.similarCount).toBeGreaterThan(0);
  });

  /** 정상 사업장은 처리가 확인된다 — 전부 의심이면 판정이 대비를 잃는다 */
  it('정상 사업장은 처리 확인됨이다', () => {
    expect(build().verdict.kind).toBe('ok');
  });

  /** 직접 재지 않는 값이라 등급이 갈린다(E3) — 색이 그 축을 나른다 */
  it('AI 추정은 실측과 다른 등급을 갖는다', () => {
    const c = build();
    expect(c.estimates.map((r) => r.code).sort()).toEqual(['TN', 'TP']);
    expect(c.estimates.every((r) => r.grade === 'estimated')).toBe(true);
    expect(c.treatment.every((row) => row.outlet.grade === 'actual')).toBe(true);
  });
});

describe('«안 받는다»와 «못 받았다»를 가른다', () => {
  /**
   * 결측은 «그 시각에 못 받았다»이고 미수신은 «이 사업장은 아예 안 받는다»다.
   * 히어로가 둘을 같게 적으면 «잠깐 끊겼다»로 읽힌다.
   */
  it('unreceived 목록에 있는 계열만 미수신으로 적는다', () => {
    const c = build(['inflow']);
    expect(c.inlet.flow.unreceived).toBe(true);
    expect(c.outlet.flow.unreceived).toBe(false);
  });
});

describe('기준은 걸리는 항목에만', () => {
  /** 유량·전류에는 배출허용기준이라는 개념 자체가 없다 — «미확정»이라 적으면 없는 기준을 예고한다 */
  it('유량·전류는 기준 대상이 아니다', () => {
    const c = build();
    expect(c.inlet.flow.regulated).toBe(false);
    expect(c.outlet.flow.regulated).toBe(false);
    expect(c.inlet.aside.every((r) => !r.regulated)).toBe(true);
  });

  it('pH는 기준이 있고 판정된다', () => {
    const pH = outletOf(build(), 'pH');
    expect(pH.regulated).toBe(true);
    expect(pH.limitText).not.toBeNull();
  });

  /** 표를 못 골라 값이 없는 항목은 «걸리지만 판정 불가»다 — 위 둘과 또 다른 사실이다 */
  it('TOC는 기준이 걸리지만 값이 없다', () => {
    const toc = outletOf(build(), 'TOC');
    expect(toc.regulated).toBe(true);
    expect(toc.limitText).toBeNull();
  });

  /** 기준치는 밖에서 받는다 — 사용자가 설정한 값이 정적 표를 덮어써야 한다 */
  it('넘겨준 기준표를 쓴다', () => {
    const c = buildCompare(points, [], {
      ...DISCHARGE_LIMITS,
      TOC: { min: null, max: 5, source: '사업장 허가증 입력값', unavailableReason: null },
    });
    const toc = outletOf(c, 'TOC');
    expect(toc.limitText).toBe('≤ 5.0');
    expect(toc.overLimit).not.toBeNull();
  });
});
