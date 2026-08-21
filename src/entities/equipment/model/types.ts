import type { StatusLevel } from '@/shared/config/provisional';

/**
 * 설비에서 잡히는 이상 신호.
 *
 * **진동과 전류 둘뿐이다** `[회의 2026-08-20]`. 회의는 "설비에 진동 감지 센서를 부착하여
 * 이상 탐지를 통한 알림"과 "각 설비의 on/off 가동 상태"만 현실적으로 가능하다고 정리했다.
 * 전류는 계측 사양에 이미 있고(`[원문 p.55]`) 예지보전 입력으로도 명시된다(`[원문 p.30·31]`).
 *
 * 유량·전력을 넣지 않는다 — 유량은 공정을 관통하는 채널이고 전력은 사업장 합계에 가까워
 * 설비 하나의 이상으로 돌릴 수 없다.
 */
export type EquipmentSignal = 'vibration' | 'current';

export const EQUIPMENT_SIGNAL_LABELS: Record<EquipmentSignal, string> = {
  vibration: '진동 이상',
  current: '전류 이상',
};

/**
 * 설비 한 대.
 *
 * **고장 확률·잔여 수명(RUL)·MPI가 없다** `[회의 2026-08-20]` `[INC-107]`. 원문은 성과지표로
 * "설비 고장 예측 정확도 ≥85%"(p.30·31·80)를 걸고 발표 p.18 그림에 고장확률·RUL 화면 예시까지
 * 두지만, 회의가 **예지보전은 어렵다**고 정리했다 — 산정에 필요한 고장 이력이 실증 데이터에
 * 없다는 사실과도 맞는다. 값을 낼 수 없는 것을 화면에 두면 나머지 숫자까지 의심받는다.
 *
 * 남은 것은 **이상 여부와 가동 상태**다.
 */
export interface Equipment {
  id: string;
  name: string;
  /** 지금 돌고 있는가. **`null`은 모름** — 통신이 끊긴 상태를 정지로 적지 않는다(E4) */
  running: boolean | null;
  /** 지금 걸린 이상 신호. 빈 배열이면 이상 없음 */
  signals: readonly EquipmentSignal[];
  /** 이상이 시작된 시각(ISO). 이상이 없거나 모르면 `null` */
  anomalySinceIso: string | null;
  /** 이상이 이어진 시간. 이상이 없거나 모르면 `null` */
  anomalyHours: number | null;
  /**
   * 상태 등급. 근거는 **이상 신호의 개수와 지속 시간**이며 판정 규칙이 원문에 없다
   * (`[TBD-50]`) — 임시 규칙은 `PROVISIONAL_EQUIPMENT_ANOMALY_RULE`이 갖는다.
   */
  status: StatusLevel;
  runtimeHours: number;
}

/**
 * 설비 × 시간 격자의 한 칸.
 *
 * **가동 상태와 이상 신호를 함께 담는다** — 회의가 확인 가능하다고 한 둘이다. 화면은 색으로
 * 가동/정지/모름을 칠하고 글리프로 이상을 표시한다.
 *
 * 원문이 화면을 요구하지만(`[원문 발표 p.18 그림]`의 설비별 상태 Heatmap) 이력 저장소가
 * 없다(`REQ-AD-019` 미구현). 그래서 만들되 **이미 있는 축과 어긋나지 않게** 파생한다 —
 * 통신이 끊긴 시간은 가동 여부도 **모름**이다. 결측을 여기서 다시 만들면 같은 화면의
 * 리본·시계열과 다른 말을 한다.
 *
 * 근거·위험·철회 조건은 `docs/specs/assumptions.md` §3.2.
 */
export interface EquipmentRunCell {
  /** 시간 단위 칸. 0이 창의 시작 */
  hourOffset: number;
  iso: string;
  /** **`null`은 모름이다** — 수신하지 못한 시간을 가동으로도 정지로도 적지 않는다(E4) */
  running: boolean | null;
  /** 그 시간에 걸린 이상 신호. 모르는 시간은 빈 배열이다 */
  signals: readonly EquipmentSignal[];
}

/** 방지시설이 그 시간에 멈춰 있었는가. `null`은 모름 */
export interface TreatmentCell {
  hourOffset: number;
  iso: string;
  idle: boolean | null;
}
