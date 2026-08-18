'use client';

import { useMemo } from 'react';
import type { Alarm, AlarmState } from '@/entities/alarm';
import { useAlarmStateStore } from './alarm-state-context';

/**
 * 준 목록에 확인·조치 결과를 얹어 돌려준다.
 *
 * **상태는 셸이 들고 있다**(`AlarmStateProvider`). 화면마다 목록의 범위는 다르지만
 * — 전 사업장이냐 자사 1개소냐 — 확인 결과는 하나여야 한다. 여기서 각자 `useState`를
 * 들면 한 화면에서 처리한 것이 다른 화면에 보이지 않는다.
 */
export function useAlarmStates(source: readonly Alarm[]): {
  alarms: Alarm[];
  changedCount: number;
  setState: (id: string, next: AlarmState) => void;
  reset: () => void;
} {
  const { overrides, setState, reset, changedCount } = useAlarmStateStore();

  const alarms = useMemo(
    () => source.map((alarm) => (overrides[alarm.id] ? { ...alarm, state: overrides[alarm.id]! } : alarm)),
    [source, overrides],
  );

  return { alarms, changedCount, setState, reset };
}
