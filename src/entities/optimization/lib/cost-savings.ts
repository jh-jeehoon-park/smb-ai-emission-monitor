import { COST_EXAMPLE_KRW } from '../config/constants';

const MONTHS_PER_YEAR = 12;

export interface CostSavings {
  /** 약품비 절감률 % */
  chemicalRate: number;
  /** 전력비 절감률 % */
  powerRate: number;
  /** 총 운영비 절감률 % — 약품·전력 금액으로 가중한 값이지 두 비율의 평균이 아니다 */
  opexRate: number;
  chemicalAnnualKrw: number;
  powerAnnualKrw: number;
  annualKrw: number;
  monthlyKrw: number;
}

/**
 * 절감률로 절감 금액을 낸다. **금액은 원문 예시 사업장 기준이다** — 사업장별 약품 단가와
 * 계약 전력 단가가 원문에 없어(TBD-41) 실금액을 만들 수 없다. 화면에 그 사실을 적는다.
 *
 * 총 운영비 절감률을 두 비율의 산술평균으로 내면 안 된다. 약품비가 전력비의 2배라
 * 평균을 쓰면 전력 절감이 실제보다 크게 반영된다.
 */
export function calcCostSavings(chemicalRate: number, powerRate: number): CostSavings {
  const chemicalAnnualKrw = COST_EXAMPLE_KRW.annualChemical * (chemicalRate / 100);
  const powerAnnualKrw = COST_EXAMPLE_KRW.annualPower * (powerRate / 100);
  const annualKrw = chemicalAnnualKrw + powerAnnualKrw;
  const base = COST_EXAMPLE_KRW.annualChemical + COST_EXAMPLE_KRW.annualPower;

  return {
    chemicalRate,
    powerRate,
    opexRate: (annualKrw / base) * 100,
    chemicalAnnualKrw,
    powerAnnualKrw,
    annualKrw,
    monthlyKrw: annualKrw / MONTHS_PER_YEAR,
  };
}

const KRW_PER_MANWON = 10_000;
const KRW_PER_EOK = 100_000_000;
const MANWON_FORMAT = new Intl.NumberFormat('ko-KR');

/** 만원 단위 정수로 끊는다. 원 단위까지 적으면 예시 금액이 실측처럼 보인다 */
export function toManwon(krw: number): number {
  return Math.round(krw / KRW_PER_MANWON);
}

/**
 * 금액 표기. **1억을 넘으면 억으로 끊는다** — `15,000만 원`은 자릿수를 세어야 읽히고
 * 옆에 놓인 `296만 원`과 크기 비교가 되지 않는다. 자릿수는 provisional에서 온다(E1).
 */
export function formatKrw(krw: number, eokDecimals: number): string {
  if (Math.abs(krw) >= KRW_PER_EOK) {
    return `${(krw / KRW_PER_EOK).toFixed(eokDecimals)}억 원`;
  }
  return `${MANWON_FORMAT.format(toManwon(krw))}만 원`;
}
