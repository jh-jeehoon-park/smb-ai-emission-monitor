import { describe, expect, it } from 'vitest';
import {
  PROVISIONAL_EQUIPMENT_ANOMALY_RULE,
  PROVISIONAL_STATUS_LEVELS,
  toEquipmentStatus,
} from '@/shared/config/provisional';
import { TIMELINE_POINT_COUNT, isMissingAt } from '@/shared/lib/timeline';
import {
  EQUIPMENT_SIGNAL_LABELS,
  STATUS_TIMELINE_HOURS,
  getEquipment,
  getRunTimeline,
} from '@/entities/equipment';
import { SAMPLES_PER_STATUS_CELL } from './config/constants';

const online = getEquipment('S-02');
const offline = getEquipment('S-04');

/**
 * 회의가 예지보전을 내리게 했다 `[INC-107]`. **없어진 것을 테스트가 못박는다** —
 * 나중에 누군가 편의로 되살리면 여기서 걸린다. 원문 성과지표가 아직 그 값을 요구하므로
 * 되살리려는 힘이 계속 있다.
 */
describe('설비 — 내린 값이 돌아오지 않는다', () => {
  it('고장 확률·잔여 수명·MPI 필드가 없다', () => {
    for (const equipment of online) {
      expect(equipment).not.toHaveProperty('failureProbability');
      expect(equipment).not.toHaveProperty('remainingUsefulLifeDays');
      expect(equipment).not.toHaveProperty('maintenancePriorityIndex');
    }
  });

  it('대신 가동 상태와 이상 신호를 갖는다', () => {
    for (const equipment of online) {
      expect(equipment).toHaveProperty('running');
      expect(equipment).toHaveProperty('signals');
      expect(PROVISIONAL_STATUS_LEVELS).toContain(equipment.status);
    }
  });

  /** 신호는 진동·전류 둘뿐이다. 유량·전력은 설비 하나의 이상으로 돌릴 수 없다 */
  it('이상 신호가 정의된 둘 안에 있다', () => {
    const known = Object.keys(EQUIPMENT_SIGNAL_LABELS);
    for (const equipment of online) {
      for (const signal of equipment.signals) expect(known).toContain(signal);
    }
  });
});

describe('설비 등급 — 신호 개수와 지속으로 정한다', () => {
  const { criticalSignals, warningHours } = PROVISIONAL_EQUIPMENT_ANOMALY_RULE;

  it('신호가 없으면 정상이다', () => {
    expect(toEquipmentStatus(0, null)).toBe('normal');
    expect(toEquipmentStatus(0, 99)).toBe('normal');
  });

  it('신호가 둘 이상이면 위험이다 — 한 부위 문제로 보기 어렵다', () => {
    expect(toEquipmentStatus(criticalSignals, 0)).toBe('critical');
  });

  it('하나가 오래 이어지면 경고, 스쳐 지나가면 주의다', () => {
    expect(toEquipmentStatus(1, warningHours)).toBe('warning');
    expect(toEquipmentStatus(1, warningHours - 1)).toBe('caution');
  });

  /** 신호가 있는데 지속을 모르면 정상도 아니고 오래됐다고 단정할 수도 없다(E4) */
  it('지속을 모르면 주의에 둔다', () => {
    expect(toEquipmentStatus(1, null)).toBe('caution');
  });

  it('카드의 등급이 그 규칙과 같다 — 두 곳에서 따로 계산하지 않는다', () => {
    for (const equipment of online) {
      expect(equipment.status).toBe(
        toEquipmentStatus(equipment.signals.length, equipment.anomalyHours),
      );
    }
  });
});

describe('가동 격자', () => {
  const cells = getRunTimeline('S-02', online[0]!);

  it('24칸이다 — 원문 예시가 00시~24시를 시간 단위로 끊는다', () => {
    expect(cells).toHaveLength(STATUS_TIMELINE_HOURS);
  });

  /**
   * 격자가 시계열 창을 **남김없이** 덮어야 한다. 모자라면 마지막 시간이 조용히 잘리고,
   * 넘치면 없는 표본을 읽는다. 수집 주기나 창 길이가 바뀌면 여기서 먼저 걸린다.
   */
  it('칸 × 표본 수가 시계열 창과 정확히 맞는다', () => {
    expect(STATUS_TIMELINE_HOURS * SAMPLES_PER_STATUS_CELL).toBe(TIMELINE_POINT_COUNT);
  });

  /**
   * **결측은 이 파일이 새로 만들지 않는다.** 두 축을 각자 만들면 한 화면이 서로 다른 말을
   * 한다 — 리본·시계열과 같은 단일 원천을 따라야 한다.
   */
  it('한 시간 안에 결측이 하나라도 있으면 그 칸은 모름이다', () => {
    cells.forEach((cell, hour) => {
      const from = hour * SAMPLES_PER_STATUS_CELL;
      const anyMissing = Array.from({ length: SAMPLES_PER_STATUS_CELL }, (_, k) =>
        isMissingAt('S-02', from + k),
      ).some(Boolean);
      expect(cell.running === null).toBe(anyMissing);
    });
  });

  it('모르는 칸은 이상 신호도 비어 있다 — 모르면서 이상이라 적지 않는다', () => {
    for (const cell of cells) {
      if (cell.running === null) expect(cell.signals).toHaveLength(0);
    }
  });

  it('통신 두절 사업장은 전 칸이 모름이다 — 정지로 채우지 않는다(E4)', () => {
    const offlineCells = getRunTimeline('S-04', offline[0]!);
    expect(offlineCells.every((c) => c.running === null)).toBe(true);
  });

  /**
   * **마지막 칸이 곧 지금이다.** 카드·표는 `equipment.running`을 쓰므로 여기가 어긋나면
   * 한 화면이 현재 상태를 두 가지로 말한다.
   */
  it('마지막 칸이 카드의 현재 가동 상태와 같다', () => {
    for (const equipment of online) {
      const timeline = getRunTimeline('S-02', equipment);
      const now = timeline[timeline.length - 1]!;
      if (now.running === null) continue;
      expect(now.running).toBe(equipment.running);
    }
  });

  it('이상 구간이 카드의 지속 시간과 맞는다', () => {
    for (const equipment of online) {
      const marked = getRunTimeline('S-02', equipment).filter((c) => c.signals.length > 0).length;
      expect(marked).toBe(equipment.anomalyHours ?? 0);
    }
  });

  it('같은 설비는 몇 번을 불러도 같다 — 시드가 고정이다', () => {
    expect(getRunTimeline('S-02', online[0]!)).toEqual(cells);
  });
});

/**
 * **방지시설 가동 줄이 없어졌다** `[사용자 요청 2026-09-08]`. 격자 아래에 사업장 단위 축을
 * 한 줄 더 두었었는데, 그 사실이 뜻을 갖는 곳은 방류 여부와 나란히 놓이는 이상 탐지의
 * `방지시설 미가동 중 방류 의심`이다. 판정 자체(`isTreatmentIdleAt`)는 그대로 남아 있고
 * `idle-discharge.test.ts`가 지킨다 — 없어진 것은 이 화면의 표현뿐이다.
 */
describe('격자에 설비 아닌 행이 없다', () => {
  it('방지시설 줄을 만들던 함수가 없다', async () => {
    const slice = await import('@/entities/equipment');
    expect(slice).not.toHaveProperty('getTreatmentTimeline');
  });
});
