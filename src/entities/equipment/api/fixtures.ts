import { getScenario, siteSeed } from '@/shared/config/demo-scenario';
import { toEquipmentStatus } from '@/shared/config/provisional';
import { createRng } from '@/shared/lib/prng';
import { isMissingAt, timelineIsoAt } from '@/shared/lib/timeline';
import { STATUS_TIMELINE_HOURS, SAMPLES_PER_STATUS_CELL } from '../config/constants';
import type { Equipment, EquipmentSignal } from '../model/types';

/**
 * 대상 설비의 **종류**는 펌프·폭기장치·약품주입펌프 `[원문 p.30·62·63]`.
 * **대수는 어디에도 없다** — 4대는 시연값이다 `[TBD-48]`.
 */
const EQUIPMENT_TEMPLATE = [
  { id: 'EQ-01', name: '폭기 블로워 #1', risk: 1, runtime: 12840 },
  { id: 'EQ-02', name: '유입 펌프 #2', risk: 0.62, runtime: 9310 },
  { id: 'EQ-03', name: '약품주입 펌프 A', risk: 0.36, runtime: 6420 },
  { id: 'EQ-04', name: '방류 펌프 #1', risk: 0.14, runtime: 4180 },
];

/**
 * 어떤 신호가 걸렸는지. **`risk`가 클수록 잘 걸린다** — 수질이 흔들리는 사업장은 설비도
 * 같이 의심스러워야 한다. 둘이 무관하면 화면이 따로 논다.
 *
 * 값이 아니라 **여부**만 낸다. 진동 사양이 없어(`[TBD-49]`) 크기를 말할 수 없다.
 */
function signalsOf(risk: number, stress: number, rng: () => number): EquipmentSignal[] {
  const pressure = risk * stress;
  const out: EquipmentSignal[] = [];
  /* 진동이 먼저다 — 회의가 이상 탐지의 주 입력으로 지목한 것이다 */
  if (rng() < pressure * 0.85) out.push('vibration');
  if (rng() < pressure * 0.4) out.push('current');
  return out;
}

/**
 * 마지막 표본 구간을 보고 지금 돌고 있는지 정한다.
 *
 * **판정을 새로 만들지 않는다.** 결측 판정은 `isMissingAt`이 이미 갖고 있고, 그것을 여기서
 * 다시 만들면 같은 화면의 리본·시계열과 다른 말을 한다. 결측이면 `null`(모름)이다 — 통신이
 * 끊긴 시간을 정지로 적으면 가동률이 틀린 값이 된다(E4).
 */
function runningNow(siteId: string, risk: number, rng: () => number): boolean | null {
  const last = STATUS_TIMELINE_HOURS * SAMPLES_PER_STATUS_CELL - 1;
  if (isMissingAt(siteId, last)) return null;
  /* 위험이 큰 설비가 멈춰 있을 가능성이 높다 — 이상이 커지면 결국 세운다 */
  return rng() > risk * 0.18;
}

export function getEquipment(siteId: string): Equipment[] {
  const scenario = getScenario(siteId);
  const rng = createRng(siteSeed(siteId, 77123));
  const stress = 0.35 + (scenario.eventRise / 74) * 0.65;

  return EQUIPMENT_TEMPLATE.map((eq) => {
    const signals = signalsOf(eq.risk, stress, rng);
    const running = runningNow(siteId, eq.risk, rng);

    /*
     * 이상이 이어진 시간. **모르는 상태와 없는 상태를 가른다** — 가동 여부를 모르면
     * 지속도 모르는 것이고, 이상이 없으면 지속이 아예 없다. 둘을 같은 `null`로 두면
     * 화면이 "모름"과 "없음"을 구분하지 못한다.
     */
    const anomalyHours =
      signals.length === 0 ? null : running === null ? null : 1 + Math.floor(rng() * 8);
    const from = anomalyHours === null ? null : STATUS_TIMELINE_HOURS - anomalyHours;

    return {
      id: eq.id,
      name: eq.name,
      running,
      signals,
      anomalySinceIso: from === null ? null : timelineIsoAt(from * SAMPLES_PER_STATUS_CELL),
      anomalyHours,
      status: toEquipmentStatus(signals.length, anomalyHours),
      runtimeHours: eq.runtime,
    };
  });
}
