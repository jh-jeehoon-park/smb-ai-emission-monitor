import { describe, expect, it } from 'vitest';
import { ALARMS, countByPriorityIn, countOpen, getAlarmsForView, openAlarms } from './index';

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

  it('countOpen에 사업장을 주면 그 사업장의 미확인만 센다', () => {
    const expected = ALARMS.filter((a) => a.siteId === SITE && a.state === 'open').length;
    expect(countOpen(ALARMS, SITE)).toBe(expected);
    expect(countOpen(ALARMS, OTHER)).toBe(0);
  });

  it('사업장을 주지 않으면 준 목록 전체를 센다 — 범위는 목록이 정한다', () => {
    const total = ALARMS.filter((a) => a.state === 'open').length;
    expect(countOpen(ALARMS)).toBe(total);
    expect(countOpen(ALARMS, SITE)).toBeLessThan(total);
    /* 좁힌 목록을 주면 그만큼만 센다 — 인자를 안 줘도 새지 않는다 */
    expect(countOpen(getAlarmsForView(SITE))).toBe(countOpen(ALARMS, SITE));
  });

  it('openAlarms는 미확인만 최신순으로 준다', () => {
    const rows = openAlarms(ALARMS);
    expect(rows.every((a) => a.state === 'open')).toBe(true);
    expect(rows).toEqual([...rows].sort((a, b) => b.raisedAtIso.localeCompare(a.raisedAtIso)));
    expect(openAlarms(ALARMS, OTHER)).toEqual([]);
  });

  /** 확인 처리로 덮어쓴 상태를 그대로 반영해야 한다 — 정적 fixture를 읽으면 안 줄어든다 */
  it('상태를 덮어쓴 목록을 주면 그 결과로 센다', () => {
    const target = ALARMS.find((a) => a.state === 'open')!;
    const acked = ALARMS.map((a) => (a.id === target.id ? { ...a, state: 'acknowledged' as const } : a));
    expect(countOpen(acked)).toBe(countOpen(ALARMS) - 1);
  });

  it('countByPriorityIn에 사업장을 주면 그 사업장만 센다', () => {
    const all = countByPriorityIn(ALARMS);
    const mine = countByPriorityIn(ALARMS, 'open', SITE);
    const urgentMine = ALARMS.filter(
      (a) => a.siteId === SITE && a.state === 'open' && a.priority === 'urgent',
    ).length;

    expect(mine.urgent).toBe(urgentMine);
    expect(Object.values(mine).reduce((sum, n) => sum + n, 0)).toBeLessThan(
      Object.values(all).reduce((sum, n) => sum + n, 0),
    );
  });

  it('사업장을 주지 않으면 준 목록 전체를 센다 — 통합 관제가 쓴다', () => {
    const expected = { urgent: 0, caution: 0, info: 0 };
    for (const a of ALARMS) if (a.state === 'open') expected[a.priority] += 1;
    expect(countByPriorityIn(ALARMS)).toEqual(expected);
  });

  /** 세 우선순위가 항상 키로 있어야 한다 — 0건인 등급이 빠지면 화면이 undefined를 찍는다 */
  it('우선순위 세 키가 언제나 있다', () => {
    expect(Object.keys(countByPriorityIn([]))).toEqual(['urgent', 'caution', 'info']);
  });
});
