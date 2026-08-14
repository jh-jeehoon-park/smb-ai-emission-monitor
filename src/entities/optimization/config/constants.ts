/**
 * 운영 최적화의 성능 목표는 전부 원문 수치다. 임의로 만들지 않는다.
 * 설비 수명 증가 목표는 같은 페이지 안에서 ≥15%와 ≥10%로 갈려 있어(INC-18) 쓰지 않는다.
 */

/** 약품비 절감 — 현재 검증 수준 20~30% (사업계획서 p.27·p.31) */
export const CHEMICAL_SAVING_RANGE: readonly [number, number] = [20, 30];

/** 에너지 절감 목표 ≥10% (사업계획서 p.27·p.64) */
export const ENERGY_SAVING_TARGET = 10;

/** 총 운영비 절감 목표 ≥12% (사업계획서 p.27·p.31·p.64) */
export const OPEX_SAVING_TARGET = 12;

/**
 * 사업계획서 p.34·p.40이 든 **원화 예시**다. 특정 사업장의 실제 비용이 아니다 —
 * 사업장별 약품 단가·계약 전력이 원문에 없어 금액을 사업장마다 만들 수 없다(TBD-41).
 * 화면에도 예시임을 적는다.
 */
export const COST_EXAMPLE_KRW = {
  annualChemical: 10_000_000,
  annualPower: 5_000_000,
  /** 사고 1회 대응 비용 (p.34·p.40이 같은 값을 쓴다) */
  incidentResponse: 30_000_000,
} as const;

/**
 * 사고 1건을 미리 잡았을 때의 절감액. **원문이 두 값을 준다(INC-93)** —
 * p.34는 1,500만 원, p.40은 2,500만 원이며 둘 다 "사고 시 평균 3,000만 원"을 전제한다.
 * 하나를 고르면 그것이 확정값으로 읽히므로 범위로 두고 화면에 두 출처를 밝힌다.
 */
export const INCIDENT_AVOIDED_KRW_RANGE: readonly [number, number] = [15_000_000, 25_000_000];

/**
 * TMS 구축 비용 회피 (p.40). **초년도 1회성이라 연간 절감과 합치지 않는다** —
 * 합치면 초년도에만 유효한 값이 매년 반복되는 것처럼 읽힌다.
 * 기존 TMS 구축비 2~3억은 원문 안에서 값이 갈린다(INC-36).
 */
export const TMS_AVOIDED_KRW_RANGE: readonly [number, number] = [150_000_000, 250_000_000];

/** 2년차 이후 연간 절감 합계 (p.40). 항목 합계와 맞지 않는다(INC-70) */
export const ANNUAL_SAVING_KRW_RANGE: readonly [number, number] = [27_500_000, 33_500_000];

export const OPTIMIZATION_MODEL_LABEL = 'XMARL-PPO';

/**
 * 표시 소수 자릿수. 화면마다 다르게 반올림하지 않는다(E1).
 * 주입량은 한 자리면 권장과 현재의 차이가 드러나고, 에너지 효율은 kWh/m³ 값이
 * 1~3 범위라 두 자리가 있어야 10% 절감이 눈에 보인다.
 */
export const DOSING_DECIMALS = 1;
export const ENERGY_DECIMALS = 2;

/** XMARL-PPO 입력 (사업계획서 p.66·p.67) */
export const OPTIMIZATION_INPUT_LABEL =
  '수질 상태(LSTM 예측 포함) · 설비 상태(전력·전류·운전율) · 운영 변수(약품 주입량·폭기량)';
