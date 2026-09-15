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

/*
 * **원화 금액 상수 넷이 여기 있었다** `[사용자 요청 2026-09-15]` — `COST_EXAMPLE_KRW` ·
 * `INCIDENT_AVOIDED_KRW_RANGE` · `TMS_AVOIDED_KRW_RANGE` · `ANNUAL_SAVING_KRW_RANGE`.
 *
 * 쓰던 곳은 `SCR-AD-001 비용 절감 현황` **하나뿐**이었고 그 화면이 통째로 걷혔다 —
 * `[회의 2026-08-20: 검증이 힘든 페이지라 빼는 것이 맞다]`로 메뉴에서 감춘 뒤 아무도 쓰지
 * 않았다. 계산(`lib/cost-savings.ts`)도 함께 지웠다.
 *
 * **여기 남은 것은 «절감률»이지 «금액»이 아니다** — `CHEMICAL_SAVING_RANGE`·
 * `ENERGY_SAVING_TARGET`·`OPEX_SAVING_TARGET`은 `/optimization`이 목표 막대로 계속 쓴다.
 * 되살릴 일이 생기면 `git`에서 꺼낸다 — 근거(`[원문 p.34·40]`·`[INC-93]`·`[INC-36]`·
 * `[INC-70]`)는 `data-definition.md` §9.2와 `source-inconsistencies.md`에 그대로 있다.
 */

/**
 * 운전 조건 제안이 보는 창. **두 구간을 겹치지 않게 나눈다.**
 *
 * `[설계]` 원문이 창 길이를 주지 않는다. 최근 1시간은 12표본(5분 주기)이라 잡음 하나에
 * 흔들리지 않을 만큼이고, 직전 5시간은 그날 운전 패턴이 보일 만큼이다. 입력 대상 기간
 * 라벨(`최근 24시간`)과 다르며 화면이 창을 적는다(**E3**).
 */
export const OPERATING_WINDOW = { recentHours: 1, baselineHours: 5 } as const;

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
