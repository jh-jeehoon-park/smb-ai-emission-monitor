import type { StatusLevel } from '@/shared/config/provisional';

export interface Equipment {
  id: string;
  name: string;
  /** 고장 확률 0~100% (사업계획서 p.66) */
  failureProbability: number;
  /** 잔여 수명 RUL. 원문에 단위가 없어 일 단위로 표기한다 */
  remainingUsefulLifeDays: number;
  /**
   * 설비 유지보수 우선순위 지수. 산정식·값 범위·단위가 원문에 없다(TBD-22).
   * 여기서는 0~100 상대 지수로만 표시하고 산식은 세우지 않는다.
   */
  maintenancePriorityIndex: number;
  status: StatusLevel;
  runtimeHours: number;
}

/**
 * 잔여 수명(RUL) 추이의 한 점. **지나온 값만 담는다.**
 *
 * 원문 예시 `[원문 발표 p.18 그림]`는 RUL 곡선에 **실제 고장 시점**을 함께 표시하는데,
 * 우리 시연 설비는 **고장 난 적이 없다.** 없는 사건을 그리면 그 자리가 "여기서 고장났다"로
 * 읽힌다 — 그래서 고장 시점은 그리지 않는다(E3·E4).
 */
export interface RulPoint {
  /** 며칠 전인가. 0이 오늘 */
  dayOffset: number;
  iso: string;
  /** 그날의 잔여 수명(일) */
  rul: number;
}

/**
 * 설비 상태 이력 — **시연용으로 만든다.**
 *
 * 원문이 화면에 요구하지만(`[원문 발표 p.18 그림]`의 설비별 상태 Heatmap) 이력 저장소가
 * 없다(`REQ-AD-019` 미구현). 그래서 만들되 **이미 있는 축과 어긋나지 않게** 파생한다 —
 * 통신이 끊긴 시간은 설비 상태도 **모름**이다. 결측을 여기서 다시 만들면 같은 화면의
 * 리본·시계열과 다른 말을 한다.
 *
 * 근거·위험·철회 조건은 `docs/specs/assumptions.md` §3.2.
 */
export interface EquipmentStatusCell {
  /** 시간 단위 칸. 0이 창의 시작 */
  hourOffset: number;
  iso: string;
  /** **`null`은 모름이다** — 수신하지 못한 시간을 정상으로도 이상으로도 적지 않는다(E4) */
  level: StatusLevel | null;
}

/** 방지시설이 그 시간에 멈춰 있었는가. `null`은 모름 */
export interface TreatmentCell {
  hourOffset: number;
  iso: string;
  idle: boolean | null;
}

/** 앞으로의 외삽 구간. 과거만 있으면 `예측 그래프`가 아니라 지난 기록일 뿐이다 */
export interface RulSeriesPoint {
  /** 0이 오늘. 음수는 지나온 날, 양수는 앞으로의 날 */
  day: number;
  iso: string;
  /** 지나온 값. 앞날은 `null` */
  actual: number | null;
  /** 0에 닿기까지의 외삽. 지나온 날은 `null`, 오늘은 두 선을 잇도록 값을 함께 둔다 */
  projected: number | null;
}
