import { describe, expect, it } from 'vitest';
import { ALARMS, countOpen, openAlarms, type Alarm, type AlarmState } from '@/entities/alarm';

/**
 * 확인 처리 결과가 **화면마다 다르면 안 된다.**
 *
 * 예전에는 알람 이력 화면만 지역 `useState`로 상태를 들고, 사이드바 배지·대시보드는
 * 정적 fixture를 읽었다. 처리해도 배지가 그대로였다. 이제 셸이 덮어쓰기 하나를 들고
 * 모든 소비자가 같은 것을 얹는다 — 그 얹는 규칙을 여기서 지킨다.
 *
 * 컨텍스트 자체는 React 밖에서 부를 수 없으므로, 훅이 하는 일과 같은 변환을 순수하게
 * 재현해 규칙을 검사한다.
 */
const apply = (source: readonly Alarm[], overrides: Record<string, AlarmState>): Alarm[] =>
  source.map((alarm) => (overrides[alarm.id] ? { ...alarm, state: overrides[alarm.id]! } : alarm));

describe('확인 상태 얹기', () => {
  const target = ALARMS.find((a) => a.state === 'open')!;

  it('덮어쓴 알람만 상태가 바뀐다', () => {
    const next = apply(ALARMS, { [target.id]: 'acknowledged' });
    expect(next.find((a) => a.id === target.id)!.state).toBe('acknowledged');
    expect(next.filter((a) => a.id !== target.id)).toEqual(
      ALARMS.filter((a) => a.id !== target.id),
    );
  });

  it('원본을 건드리지 않는다 — fixture는 새로고침 기준값이다', () => {
    apply(ALARMS, { [target.id]: 'resolved' });
    expect(ALARMS.find((a) => a.id === target.id)!.state).toBe('open');
  });

  it('덮어쓰기가 없으면 원본 그대로다', () => {
    expect(apply(ALARMS, {})).toEqual([...ALARMS]);
  });
});

/**
 * **같은 덮어쓰기를 서로 다른 범위의 목록에 얹어도 결과가 일관돼야 한다.**
 * 헤더 알림은 전 사업장, 자사 현황은 1개소를 보지만 처리 결과는 하나다.
 */
describe('범위가 달라도 같은 결과를 본다', () => {
  const target = ALARMS.find((a) => a.state === 'open')!;
  const overrides = { [target.id]: 'acknowledged' as const };

  it('전 사업장 집계가 1 줄어든다', () => {
    expect(countOpen(apply(ALARMS, overrides))).toBe(countOpen(ALARMS) - 1);
  });

  it('그 사업장만 보는 목록에서도 1 줄어든다', () => {
    const scoped = ALARMS.filter((a) => a.siteId === target.siteId);
    expect(countOpen(apply(scoped, overrides))).toBe(countOpen(scoped) - 1);
  });

  it('다른 사업장 집계는 그대로다', () => {
    const other = ALARMS.filter((a) => a.siteId !== target.siteId);
    expect(countOpen(apply(other, overrides))).toBe(countOpen(other));
  });

  it('처리한 알람은 미확인 목록에서 빠진다', () => {
    const before = openAlarms(ALARMS).map((a) => a.id);
    const after = openAlarms(apply(ALARMS, overrides)).map((a) => a.id);
    expect(before).toContain(target.id);
    expect(after).not.toContain(target.id);
  });
});

/**
 * 시연 데이터가 헤더 알림을 의미 있게 보여 줄 수 있어야 한다.
 * 미확인이 0이면 배지도 목록도 빈 화면이라 기능을 보여 줄 수 없다.
 */
describe('시연 데이터', () => {
  it('미확인 알람이 여러 건 있다', () => {
    expect(countOpen(ALARMS)).toBeGreaterThan(1);
  });

  it('미확인이 0인 사업장도 있다 — 빈 상태를 시연할 수 있다', () => {
    const sites = new Set(ALARMS.map((a) => a.siteId));
    const empty = [...sites].filter((id) => countOpen(ALARMS, id) === 0);
    expect(empty.length).toBeGreaterThan(0);
  });
});
