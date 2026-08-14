import { describe, expect, it } from 'vitest';
import {
  ANNUAL_SAVING_KRW_RANGE,
  CHEMICAL_SAVING_RANGE,
  COST_EXAMPLE_KRW,
  ENERGY_SAVING_TARGET,
  INCIDENT_AVOIDED_KRW_RANGE,
  OPEX_SAVING_TARGET,
} from './config/constants';
import { calcCostSavings, formatKrw, toManwon } from './lib/cost-savings';

describe('절감액 산출 — 원문 p.40 표와 맞는가', () => {
  it('원문 절감률을 넣으면 원문 절감액이 나온다', () => {
    // p.40: 약품비 1,000만 × 20~30% = 200~300만 · 에너지비 500만 × 10% = 50만
    const low = calcCostSavings(CHEMICAL_SAVING_RANGE[0], ENERGY_SAVING_TARGET);
    const high = calcCostSavings(CHEMICAL_SAVING_RANGE[1], ENERGY_SAVING_TARGET);

    expect(toManwon(low.chemicalAnnualKrw)).toBe(200);
    expect(toManwon(high.chemicalAnnualKrw)).toBe(300);
    expect(toManwon(low.powerAnnualKrw)).toBe(50);
  });

  it('약품·전력만의 연 절감액은 250~350만 원이다', () => {
    // 원문 합계 2,750~3,350만에는 사고 대응 2,500만이 들어 있다.
    // 이 함수는 사고를 빼고 계산한다 — 실측 기반과 가정 기반을 섞지 않기 위해서다.
    const low = calcCostSavings(CHEMICAL_SAVING_RANGE[0], ENERGY_SAVING_TARGET);
    const high = calcCostSavings(CHEMICAL_SAVING_RANGE[1], ENERGY_SAVING_TARGET);

    expect(toManwon(low.annualKrw)).toBe(250);
    expect(toManwon(high.annualKrw)).toBe(350);

    const [incidentLow, incidentHigh] = INCIDENT_AVOIDED_KRW_RANGE;
    expect(incidentLow).toBeLessThan(incidentHigh);

    // 하한은 원문 합계와 맞는다: 250 + 2,500 = 2,750만
    expect(toManwon(low.annualKrw + incidentHigh)).toBe(toManwon(ANNUAL_SAVING_KRW_RANGE[0]));
  });

  it('항목 합계 상한이 원문 합계 상한과 어긋난다 — INC-70을 그대로 고정한다', () => {
    /**
     * 350 + 2,500 = 2,850만인데 원문 합계는 3,350만이다(사업계획서 p.40).
     * **이 차이를 코드로 메우지 않는다** — 어느 쪽이 맞는지는 발주처가 정한다.
     * 누군가 상수를 고쳐 계산이 맞아떨어지게 만들면 이 테스트가 깨지고,
     * 그때 확인해야 하는 것은 코드가 아니라 INC-70의 해소 여부다.
     */
    const high = calcCostSavings(CHEMICAL_SAVING_RANGE[1], ENERGY_SAVING_TARGET);
    const itemSum = toManwon(high.annualKrw + INCIDENT_AVOIDED_KRW_RANGE[1]);

    expect(itemSum).toBe(2850);
    expect(toManwon(ANNUAL_SAVING_KRW_RANGE[1])).toBe(3350);
    expect(itemSum).not.toBe(toManwon(ANNUAL_SAVING_KRW_RANGE[1]));
  });

  it('총 운영비 절감률은 산술평균이 아니라 금액 가중이다', () => {
    const s = calcCostSavings(30, 10);
    // 산술평균이면 20%. 약품비가 전력비의 2배라 가중값은 그보다 높다.
    expect(s.opexRate).toBeCloseTo(((1000 * 0.3 + 500 * 0.1) / 1500) * 100, 6);
    expect(s.opexRate).toBeGreaterThan(20);
    expect(s.opexRate).not.toBeCloseTo(20, 1);
  });

  it('원문 검증 수준을 채우면 총 운영비 목표도 넘는다', () => {
    // 목표 ≥12%가 약품 20%·전력 10%에서 실제로 달성되는지 — 화면의 '충족' 표기 근거
    const s = calcCostSavings(CHEMICAL_SAVING_RANGE[0], ENERGY_SAVING_TARGET);
    expect(s.opexRate).toBeGreaterThanOrEqual(OPEX_SAVING_TARGET);
  });

  it('월 절감액은 연의 1/12이다', () => {
    const s = calcCostSavings(24, 10);
    expect(s.monthlyKrw * 12).toBeCloseTo(s.annualKrw, 6);
  });

  it('기준 금액은 원문 예시값 그대로다', () => {
    expect(COST_EXAMPLE_KRW.annualChemical).toBe(10_000_000);
    expect(COST_EXAMPLE_KRW.annualPower).toBe(5_000_000);
    expect(COST_EXAMPLE_KRW.incidentResponse).toBe(30_000_000);
  });

  it('사고 회피액은 한 값이 아니라 범위다 — INC-93', () => {
    // 원문 p.34가 1,500만, p.40이 2,500만이라 하나를 고르면 확정값처럼 읽힌다
    expect(INCIDENT_AVOIDED_KRW_RANGE).toEqual([15_000_000, 25_000_000]);
  });

  it('1억을 넘으면 억으로 끊는다 — 15,000만 원은 자릿수를 세어야 읽힌다', () => {
    expect(formatKrw(150_000_000, 1)).toBe('1.5억 원');
    expect(formatKrw(250_000_000, 1)).toBe('2.5억 원');
    // 경계 바로 아래는 만원 유지
    expect(formatKrw(99_990_000, 1)).toBe('9,999만 원');
    expect(formatKrw(2_960_000, 1)).toBe('296만 원');
  });
});
