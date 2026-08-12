'use client';

import { useCallback, useMemo, useState } from 'react';
import type { Alarm, AlarmState } from '@/entities/alarm';

/**
 * 확인·조치 결과를 브라우저 메모리에만 담는다. 서버가 없어 저장할 곳이 없고,
 * 새로고침하면 fixture 상태로 돌아간다 — 시연용 상태 전이지 실제 처리 이력이 아니다.
 */
export function useAlarmStates(source: Alarm[]): {
  alarms: Alarm[];
  changedCount: number;
  setState: (id: string, next: AlarmState) => void;
  reset: () => void;
} {
  const [overrides, setOverrides] = useState<Record<string, AlarmState>>({});

  const setState = useCallback((id: string, next: AlarmState) => {
    setOverrides((prev) => ({ ...prev, [id]: next }));
  }, []);

  const reset = useCallback(() => setOverrides({}), []);

  const alarms = useMemo(
    () =>
      source.map((alarm) =>
        overrides[alarm.id] ? { ...alarm, state: overrides[alarm.id] } : alarm,
      ),
    [source, overrides],
  );

  return { alarms, changedCount: Object.keys(overrides).length, setState, reset };
}
