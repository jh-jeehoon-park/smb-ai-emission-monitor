'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { AlarmState } from '@/entities/alarm';

interface AlarmStateStore {
  overrides: Record<string, AlarmState>;
  setState: (id: string, next: AlarmState) => void;
  reset: () => void;
  changedCount: number;
}

const AlarmStateContext = createContext<AlarmStateStore | null>(null);

/**
 * 확인·조치 결과를 **셸 전체가 공유한다.**
 *
 * 예전에는 화면마다 지역 `useState`를 들고 있어서, 알람 이력에서 확인 처리를 해도
 * 사이드바 배지와 대시보드 숫자는 그대로였다. 헤더 알림까지 더하면 "처리했는데 왜
 * 그대로인가"가 세 곳에서 생긴다 — 상태를 한 곳으로 올린다.
 *
 * 서버가 없어 저장할 곳이 없다. 새로고침하면 fixture 상태로 돌아간다 —
 * 시연용 상태 전이지 실제 처리 이력이 아니다.
 *
 * `overrides`는 서버·클라이언트 모두 `{}`로 시작하므로 hydration에 영향이 없다.
 */
export function AlarmStateProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Record<string, AlarmState>>({});

  const setState = useCallback((id: string, next: AlarmState) => {
    setOverrides((prev) => ({ ...prev, [id]: next }));
  }, []);

  const reset = useCallback(() => setOverrides({}), []);

  const value = useMemo(
    () => ({ overrides, setState, reset, changedCount: Object.keys(overrides).length }),
    [overrides, setState, reset],
  );

  return <AlarmStateContext.Provider value={value}>{children}</AlarmStateContext.Provider>;
}

/**
 * 프로바이더 밖에서 부르면 던진다.
 *
 * 조용히 지역 state로 떨어지면 그 화면만 다른 값을 보게 되고, 그게 정확히 이 컨텍스트가
 * 없애려던 문제다. 붙이는 것을 잊으면 즉시 알아야 한다.
 */
export function useAlarmStateStore(): AlarmStateStore {
  const store = useContext(AlarmStateContext);
  if (!store) throw new Error('AlarmStateProvider 안에서만 쓸 수 있다');
  return store;
}
