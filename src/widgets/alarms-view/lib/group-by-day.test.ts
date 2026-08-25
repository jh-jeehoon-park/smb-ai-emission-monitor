import { describe, expect, it } from 'vitest';
import type { Alarm } from '@/entities/alarm';
import { groupAlarmsByDay } from './group-by-day';

const alarm = (id: string, raisedAtIso: string) => ({ id, raisedAtIso }) as Alarm;

const NOW = '2026-08-24T06:00:00Z';

describe('알람 이력 하루 묶기', () => {
  it('같은 날은 한 묶음이고 순서를 그대로 둔다', () => {
    const groups = groupAlarmsByDay(
      [alarm('a', '2026-08-24T05:00:00Z'), alarm('b', '2026-08-24T01:00:00Z')],
      NOW,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]!.alarms.map((a) => a.id)).toEqual(['a', 'b']);
  });

  it('오늘·어제는 이름으로, 그 이전은 날짜로 적는다', () => {
    const groups = groupAlarmsByDay(
      [
        alarm('a', '2026-08-24T05:00:00Z'),
        alarm('b', '2026-08-23T05:00:00Z'),
        alarm('c', '2026-08-20T05:00:00Z'),
      ],
      NOW,
    );
    expect(groups.map((g) => g.label)).toEqual(['오늘', '어제', '8월 20일']);
  });

  /**
   * 목록은 최신 순으로 들어오지만 같은 날이 떨어져 있을 수 있다(필터가 섞은 경우).
   * 여기서 다시 정렬하면 호출한 쪽이 정한 순서와 어긋나므로 **경계에서만 끊는다.**
   */
  it('같은 날짜가 떨어져 있으면 각각 묶는다 — 재정렬하지 않는다', () => {
    const groups = groupAlarmsByDay(
      [
        alarm('a', '2026-08-24T05:00:00Z'),
        alarm('b', '2026-08-23T05:00:00Z'),
        alarm('c', '2026-08-24T01:00:00Z'),
      ],
      NOW,
    );
    expect(groups.map((g) => g.alarms.map((a) => a.id))).toEqual([['a'], ['b'], ['c']]);
  });

  it('빈 목록은 빈 묶음이다', () => {
    expect(groupAlarmsByDay([], NOW)).toEqual([]);
  });
});
