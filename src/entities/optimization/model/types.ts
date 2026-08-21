/** 약품 주입량 최적화 (FR-16) */
export interface DosingAdvice {
  currentDose: number;
  recommendedDose: number;
  /** 단위가 원문에 없어 PROVISIONAL_DOSING_UNIT을 쓴다 */
  unit: string;
  /** 현재 대비 절감률 % */
  savingRate: number;
  /** 왜 이 값을 권했는지. AI 산출값에는 근거를 함께 낸다(E3) */
  basis: string[];
}

/**
 * 운전 조건 제안이 보는 계측 신호.
 *
 * **위젯이 계산해 넣어 준다.** 계열은 measurement의 것이고 slice끼리 참조하지 않는다
 * (FSD §8) — 에너지 효율의 현재값을 넘겨받는 것과 같은 구조다.
 *
 * `null`은 그 신호를 낼 수 없다는 뜻이고, 그러면 그 행의 제안을 만들지 않는다.
 */
export interface OperatingSignals {
  /** 용존산소 최근/직전 구간 평균과 그 비율 */
  dissolvedOxygen: OperatingSignal;
  /** 유입 유량 최근/직전 구간 평균과 그 비율 */
  flow: OperatingSignal;
}

export interface OperatingSignal {
  recent: number | null;
  baseline: number | null;
  ratio: number | null;
}

/**
 * 설비 운전 조건 제안 (FR-17). 절대 단위가 원문에 없어 현재 대비 상대 변화로만 낸다.
 *
 * **조정폭은 계측에서 나온다** `[사용자 결정 2026-08-21]`. 예전에는 난수였고 `reason`이
 * 사업장·시각과 무관한 고정 문장이라 계측을 본 판단처럼 읽혔다 — E3의 형식만 채운 것이다.
 */
export interface OperatingAdvice {
  id: string;
  /** 조정 대상 운영 변수 — 폭기량·펌프 속도 등 (사업계획서 p.67) */
  parameter: string;
  target: string;
  /** 조정폭 %. 방향은 원문 인과, 크기는 `PROVISIONAL_OPERATING_GAIN` */
  deltaPercent: number;
  /** 그렇게 판단한 **관측값**. 계측을 근거로 말하려면 그 값이 화면에 있어야 한다(E3) */
  observed: string;
  /** 왜 그 방향인가 — 원문 인과 또는 우리 결정. 근거 태그를 함께 적는다 */
  reason: string;
}

/** 에너지 효율 (FR-18). 현재값은 계측 전력·유량에서 실제로 계산한다 */
export interface EnergyAdvice {
  /** kWh/m³ */
  current: number | null;
  /** 목표 절감률을 적용한 값 */
  target: number | null;
  savingRate: number;
}

interface OptimizationBase {
  /** AI 산출 시각·대상 기간을 값과 함께 낸다(E3) */
  computedAtIso: string;
  inputWindowLabel: string;
  modelLabel: string;
  energy: EnergyAdvice;
}

/**
 * 통신이 끊기면 권장값이 **아예 없다.**
 *
 * `dosing: DosingAdvice | null` 로 두면 화면이 online을 확인한 뒤에도 컴파일러는
 * null 가능성을 계속 물고 있어 `dosing!` 같은 단언을 쓰게 된다(R2가 금지하는 escape hatch).
 * 판별 유니온으로 두면 online 분기 한 번에 타입이 좁혀지고, 두 상태를 섞어 쓰는
 * 실수를 컴파일러가 막아 준다.
 */
export type OptimizationSummary =
  | (OptimizationBase & { online: true; dosing: DosingAdvice; operating: OperatingAdvice[] })
  | (OptimizationBase & { online: false });
