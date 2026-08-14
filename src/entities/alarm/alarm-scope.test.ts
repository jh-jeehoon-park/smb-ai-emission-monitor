import { describe, expect, it } from 'vitest';
import {
  ALARMS,
  countByPriority,
  countOpenAlarms,
  countOpenAlarmsAcrossSites,
  getAlarmsForView,
} from './index';

/**
 * 관리자는 자사 1개소만 본다(회의 2026-08-13). 그런데 알람 함수 셋이 사업장 인자를
 * 받고도 전 사업장을 돌려주고 있었다 — 범위 필터가 없어서가 아니라 **함수가 이름대로
 * 동작하지 않아서** 새는 것이라, 화면을 고치기 전에 여기서 막는다.
 */
const SITE = 'S-02';
const OTHER = 'S-09';

describe('알람 범위 — 사업장 인자를 주면 그 사업장만 나온다', () => {
  it('getAlarmsForView는 다른 사업장을 섞지 않는다', () => {
    const rows = getAlarmsForView(SITE);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((a) => a.siteId === SITE)).toBe(true);
  });

  it('알람이 없는 사업장은 빈 배열이다 — 0건을 다른 사업장으로 채우지 않는다', () => {
    expect(getAlarmsForView(OTHER)).toEqual([]);
  });

  it('최신순으로 정렬된다', () => {
    const rows = getAlarmsForView(SITE);
    const sorted = [...rows].sort((a, b) => b.raisedAtIso.localeCompare(a.raisedAtIso));
    expect(rows).toEqual(sorted);
  });

  it('countOpenAlarms는 그 사업장의 미확인만 센다', () => {
    const expected = ALARMS.filter((a) => a.siteId === SITE && a.state === 'open').length;
    expect(countOpenAlarms(SITE)).toBe(expected);
    expect(countOpenAlarms(OTHER)).toBe(0);
  });

  it('전 사업장 집계는 이름이 다른 함수로만 얻는다', () => {
    /* 무인자 호출로 전 사업장을 세면 호출부만 보고는 의도를 알 수 없다.
       이름이 범위를 말하게 해서 통합 관제(운영자 전용) 외에서 쓰이면 눈에 띄게 한다. */
    const total = ALARMS.filter((a) => a.state === 'open').length;
    expect(countOpenAlarmsAcrossSites()).toBe(total);
    expect(countOpenAlarms(SITE)).toBeLessThan(total);
  });

  it('countByPriority에 사업장을 주면 그 사업장만 센다', () => {
    const all = countByPriority('open');
    const mine = countByPriority('open', SITE);
    const urgentMine = ALARMS.filter(
      (a) => a.siteId === SITE && a.state === 'open' && a.priority === 'urgent',
    ).length;

    expect(mine.urgent ?? 0).toBe(urgentMine);
    expect(Object.values(mine).reduce((s, n) => s + n, 0)).toBeLessThan(
      Object.values(all).reduce((s, n) => s + n, 0),
    );
  });

  it('사업장을 주지 않으면 전 사업장을 센다 — 통합 관제가 쓴다', () => {
    expect(countByPriority('open')).toEqual(
      ALARMS.filter((a) => a.state === 'open').reduce<Record<string, number>>((acc, a) => {
        acc[a.priority] = (acc[a.priority] ?? 0) + 1;
        return acc;
      }, {}),
    );
  });
});
