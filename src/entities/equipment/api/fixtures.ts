import { getScenario, siteSeed } from '@/shared/config/demo-scenario';
import { toStatusLevel } from '@/shared/config/provisional';
import { clamp, createRng } from '@/shared/lib/prng';
import type { Equipment } from '../model/types';

/** RandomForest 예지보전 대상으로 원문이 명시한 설비는 펌프·폭기장치다(사업계획서 p.30) */
const EQUIPMENT_TEMPLATE = [
  { id: 'EQ-01', name: '폭기 블로워 #1', risk: 1, runtime: 12840 },
  { id: 'EQ-02', name: '유입 펌프 #2', risk: 0.62, runtime: 9310 },
  { id: 'EQ-03', name: '약품주입 펌프 A', risk: 0.36, runtime: 6420 },
  { id: 'EQ-04', name: '방류 펌프 #1', risk: 0.14, runtime: 4180 },
];

export function getEquipment(siteId: string): Equipment[] {
  const scenario = getScenario(siteId);
  const rng = createRng(siteSeed(siteId, 77123));
  // 수질이 흔들리는 사업장은 설비도 같이 의심스러워야 한다. 둘이 무관하면 화면이 따로 논다.
  const stress = 0.35 + (scenario.eventRise / 74) * 0.65;

  return EQUIPMENT_TEMPLATE.map((eq) => {
    const failureProbability = Math.round(clamp(eq.risk * stress * 70 + rng() * 12, 2, 96));
    const remainingUsefulLifeDays = Math.round(clamp(240 - failureProbability * 3.4, 5, 320));

    return {
      id: eq.id,
      name: eq.name,
      failureProbability,
      remainingUsefulLifeDays,
      /**
       * MPI 산정식이 원문에 없다(TBD-22). 여기서는 고장 확률과 잔여 수명을 섞은
       * 상대 지수일 뿐이며, 확정된 산식이 아니라는 점을 화면에도 적어 둔다.
       */
      maintenancePriorityIndex: Math.round(
        clamp(failureProbability * 0.8 + (320 - remainingUsefulLifeDays) * 0.12, 0, 100),
      ),
      status: toStatusLevel(failureProbability),
      runtimeHours: eq.runtime,
    };
  }).sort((a, b) => b.maintenancePriorityIndex - a.maintenancePriorityIndex);
}
