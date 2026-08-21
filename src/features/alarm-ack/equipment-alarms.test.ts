import { describe, expect, it } from 'vitest';
import { SITE_SCENARIOS } from '@/shared/config/demo-scenario';
import { ALARMS } from '@/entities/alarm';
import { getEquipment } from '@/entities/equipment';
import { ALL_ALARMS, allAlarmsForSite } from './lib/all-alarms';

const equipmentAlarms = (siteId: string) =>
  allAlarmsForSite(siteId).filter((a) => a.condition === 'equipment' && a.id.startsWith('EQA-'));

/**
 * **설비 카드와 알람이 갈리지 않아야 한다.** 손으로 쓴 알람은 열 사업장 중 두 곳에만 있어서,
 * 카드가 `진동 이상 · 3시간`을 띄우는데 `관련 알람`은 비어 있었다 `[사용자 지적 2026-08-21]`.
 * 한 곳은 폭기 블로워를 가리키는데 그 사업장에서 신호가 걸린 것은 유입 펌프였다.
 */
describe('설비 이상 알람은 설비 상태에서 나온다', () => {
  it('신호가 걸린 설비는 모두 알람을 갖는다', () => {
    for (const site of SITE_SCENARIOS) {
      const flagged = getEquipment(site.id).filter(
        (eq) => eq.signals.length > 0 && eq.status !== 'normal',
      );
      for (const eq of flagged) {
        expect(equipmentAlarms(site.id).some((a) => a.id.endsWith(eq.id))).toBe(true);
      }
    }
  });

  it('알람이 있으면 그 설비에 신호가 있다 — 없는 이상을 알리지 않는다', () => {
    for (const site of SITE_SCENARIOS) {
      const byId = new Map(getEquipment(site.id).map((eq) => [eq.id, eq]));
      for (const alarm of equipmentAlarms(site.id)) {
        const eq = byId.get(alarm.id.replace(`EQA-${site.id}-`, ''));
        expect(eq?.signals.length ?? 0).toBeGreaterThan(0);
      }
    }
  });

  /** 알람이 자기 등급을 새로 판정하면 같은 설비가 화면마다 다른 등급을 갖는다 `[INC-02]` */
  it('알람 등급이 설비 등급과 같다', () => {
    for (const site of SITE_SCENARIOS) {
      const byId = new Map(getEquipment(site.id).map((eq) => [eq.id, eq]));
      for (const alarm of equipmentAlarms(site.id)) {
        const eq = byId.get(alarm.id.replace(`EQA-${site.id}-`, ''));
        expect(alarm.level).toBe(eq?.status);
      }
    }
  });

  /** 시연에 설비 알람이 하나도 없으면 화면이 빈 채로 심사를 받는다 — 사용자가 지적한 상태다 */
  it('시연 전체에 설비 알람이 여러 사업장에 걸쳐 있다', () => {
    const sites = SITE_SCENARIOS.filter((s) => equipmentAlarms(s.id).length > 0);
    expect(sites.length).toBeGreaterThanOrEqual(5);
  });

  it('설비마다 알람이 하나다 — 둘이면 어느 쪽이 최신인지 알 수 없다', () => {
    const ids = ALL_ALARMS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('손으로 쓴 목록에는 생성 알람이 없다 — 합치는 곳이 한 곳이어야 한다', () => {
    expect(ALARMS.some((a) => a.id.startsWith('EQA-'))).toBe(false);
    expect(ALL_ALARMS.length).toBe(ALARMS.length + countGenerated());
  });
});

function countGenerated(): number {
  return SITE_SCENARIOS.reduce((sum, site) => sum + equipmentAlarms(site.id).length, 0);
}
