import { describe, expect, it } from 'vitest';
import { SITE_SCENARIOS } from '@/shared/config/demo-scenario';
import { PROVISIONAL_TREATMENT_STALL_SITES } from '@/shared/config/provisional';
import { ALARM_CONDITION_LABELS, PRIORITY_BY_LEVEL, buildTreatmentAlarms } from '@/entities/alarm';
import { ALL_ALARMS, allAlarmsForSite } from './lib/all-alarms';

const treatmentAlarms = (siteId: string) =>
  allAlarmsForSite(siteId).filter((a) => a.condition === 'treatmentStall');

const row = (code: string, changePercent: number | null, similar: boolean) => ({
  code,
  label: code,
  changePercent,
  similar,
});

/**
 * **유입과 유출이 거의 같으면 처리가 안 된 것이다** `[회의 2026-09-08]` `[사용자 요청 2026-09-10]`.
 *
 * 물의 양은 이것을 말하지 않는다 — 들어온 만큼 나가는 것은 정상이다. 처리가 됐는지를 말하는
 * 것은 수질이고, 그 차이가 이 알람의 근거다.
 */
describe('처리 미흡 알람', () => {
  it('유사 항목이 없으면 만들지 않는다 — 없는 사건을 알리지 않는다', () => {
    expect(buildTreatmentAlarms('S-01', '가', [row('TOC', -70, false)], null)).toHaveLength(0);
  });

  /**
   * **근거가 없으면 만들지 않는다**(E4). 두절이면 변화율이 전부 `null`로 오는데, 그것을
   * «유사»로 세면 통신이 끊긴 사업장이 전부 처리 미흡으로 뜬다 — 모름을 사실로 둔갑시킨다.
   */
  it('전부 결측이면 만들지 않는다', () => {
    const rows = [row('TOC', null, false), row('DO', null, false)];
    expect(buildTreatmentAlarms('S-01', '가', rows, null)).toHaveLength(0);
  });

  /** 사업장마다 하나다 — 항목마다 내면 한 번의 정체가 다섯 줄이 되어 목록을 덮는다 */
  it('유사 항목이 여럿이어도 알람은 하나다', () => {
    const rows = [row('TOC', 2, true), row('DO', -3, true), row('turbidity', 1, true)];
    const alarms = buildTreatmentAlarms('S-01', '가', rows, '2026-09-10T09:00:00Z');

    expect(alarms).toHaveLength(1);
    expect(alarms[0]!.id).toBe('TRA-S-01');
  });

  /** 유사 항목이 늘고 줄어도 같은 알람이라 확인 처리가 풀리지 않는다 */
  it('항목이 바뀌어도 id가 같다', () => {
    const one = buildTreatmentAlarms('S-01', '가', [row('TOC', 2, true)], null);
    const two = buildTreatmentAlarms(
      'S-01',
      '가',
      [row('TOC', 2, true), row('DO', 1, true)],
      null,
    );

    expect(one[0]!.id).toBe(two[0]!.id);
  });

  /** 우선순위를 직접 쓰면 등급과 어긋나는 길이 다시 열린다 `[INC-02]` */
  it('우선순위가 등급에서 파생된다', () => {
    const rows = [row('TOC', 2, true), row('DO', 1, true), row('turbidity', 3, true)];
    const alarm = buildTreatmentAlarms('S-01', '가', rows, null)[0]!;

    expect(alarm.priority).toBe(PRIORITY_BY_LEVEL[alarm.level]);
  });

  /** 유사 항목이 많을수록 무겁다 — 하나면 잡음일 수 있고 넷이면 공정 전체가 멈춘 정황이다 */
  it('유사 항목 수가 늘면 등급이 오른다', () => {
    const similar = (n: number) =>
      buildTreatmentAlarms(
        'S-01',
        '가',
        Array.from({ length: n }, (_, i) => row(`c${i}`, 1, true)),
        null,
      )[0]!.level;

    expect(similar(1)).toBe('caution');
    expect(similar(3)).toBe('warning');
    expect(similar(4)).toBe('critical');
  });

  /**
   * **모르는 시각에 지금 시각을 쓰지 않는다.** 방금 탐지된 것으로 읽혀 목록 맨 위로 올라간다 —
   * 설비 알람이 쓰는 `DETECTION_TIME_UNKNOWN`과 같은 규약이다.
   */
  it('탐지 시각을 모르면 아주 과거로 둔다', () => {
    const alarm = buildTreatmentAlarms('S-01', '가', [row('TOC', 2, true)], null)[0]!;
    expect(alarm.raisedAtIso).toBe('1970-01-01T00:00:00Z');
  });

  /** 임시 임계임을 상세가 스스로 밝힌다 — 우리가 정한 값이 확정 기준으로 읽히면 안 된다 */
  it('상세가 임시값임을 적는다', () => {
    const alarm = buildTreatmentAlarms('S-01', '가', [row('TOC', 2, true)], null)[0]!;
    expect(alarm.detail).toContain('TBD-59');
  });
});

describe('알람 목록에 합류한다', () => {
  /** 새 조건이 라벨 없이 들어오면 목록의 조건 칸이 코드로 찍힌다 */
  it('조건 라벨이 있다', () => {
    expect(ALARM_CONDITION_LABELS.treatmentStall).toBe('처리 상태 확인');
  });

  /**
   * **시연에서 실제로 떠야 한다.** 판정을 만들어 두고 화면에 한 번도 보이지 않으면 심사에서
   * 그 기능은 없는 것과 같다 — `PROVISIONAL_DEMO_LIMITS`가 같은 이유로 기준치를 낮춰 잡았다.
   */
  it('정체를 심은 사업장에서 뜬다', () => {
    for (const siteId of PROVISIONAL_TREATMENT_STALL_SITES) {
      expect(treatmentAlarms(siteId).length, siteId).toBe(1);
    }
  });

  /** 나머지 사업장에서는 뜨지 않는다 — 전부 뜨면 정상과 대비되지 않아 판정이 읽히지 않는다 */
  it('정상 사업장에서는 뜨지 않는다', () => {
    const normal = SITE_SCENARIOS.filter((s) => !PROVISIONAL_TREATMENT_STALL_SITES.includes(s.id));
    for (const site of normal) {
      expect(treatmentAlarms(site.id), site.id).toHaveLength(0);
    }
  });

  /** 헤더 배지·알람 이력·통합 관제가 전부 이 한 목록을 읽는다 */
  it('합친 목록에 실린다', () => {
    expect(ALL_ALARMS.filter((a) => a.condition === 'treatmentStall').length).toBe(
      PROVISIONAL_TREATMENT_STALL_SITES.length,
    );
  });
});
