'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { readJson, removeKey, writeJson } from '@/shared/lib/local-store';
import { PROCESS_STAGES_STORAGE_KEY } from '../config/constants';
import { parseStageSettings, type StageSetting, type StageSettingsBySite } from '../lib/storage';

interface ProcessSettingsStore {
  settings: StageSettingsBySite;
  setStage: (siteId: string, stageId: string, next: StageSetting) => void;
  reset: (siteId: string) => void;
}

const ProcessSettingsContext = createContext<ProcessSettingsStore | null>(null);

const EMPTY: StageSettingsBySite = {};

/**
 * 저장소가 바뀐 것을 React에 알린다.
 *
 * `useSyncExternalStore`는 스냅샷이 **참조로 같으면** 다시 그리지 않는다. 매번 `JSON.parse`
 * 하면 값이 같아도 새 객체가 나와 무한 렌더가 되므로 파싱 결과를 붙잡아 둔다.
 * 기준치 저장소(`limit-settings-context.tsx`)와 같은 구조다.
 */
let snapshot: StageSettingsBySite | null = null;
const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  /* 다른 탭의 변경도 받는다. 같은 탭은 아래 `emit`이 알린다 — 둘을 함께 두어야 다 반영된다 */
  window.addEventListener('storage', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
}

function emit(): void {
  snapshot = null;
  for (const listener of listeners) listener();
}

function getSnapshot(): StageSettingsBySite {
  snapshot ??= readJson(PROCESS_STAGES_STORAGE_KEY, parseStageSettings) ?? EMPTY;
  return snapshot;
}

/** **서버에는 저장소가 없다.** 빈 값을 주어 서버와 하이드레이션 첫 렌더가 같아지게 한다 */
const getServerSnapshot = () => EMPTY;

/**
 * 사업장별 공정 구성을 셸 전체가 공유한다.
 *
 * 회의가 방식을 정했다 — 최대 공정을 두고 필요한 단계만 켠다 `[회의 2026-08-20]`.
 * 그 선택이 공정도·단계 상세·설정 화면에서 같아야 하므로 한 곳에서 들고 나눈다.
 *
 * **첫 렌더는 반드시 비어 있다.** 서버는 localStorage를 모르므로 첫 렌더에서 저장값을 읽으면
 * 하이드레이션이 깨진다. 저장소를 React 밖의 외부 소스로 구독한다 — 기준치 저장소와 같다.
 *
 * 서버가 생기면 이 프로바이더가 **제거 대상**이 된다 — 공정 구성은 서버가 갖는다(A1).
 */
export function ProcessSettingsProvider({ children }: { children: ReactNode }) {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setStage = useCallback((siteId: string, stageId: string, next: StageSetting) => {
    /* 저장소가 정본이다 — React state를 따로 들면 두 곳이 갈린다 */
    const current = getSnapshot();
    const merged: StageSettingsBySite = {
      ...current,
      [siteId]: { ...current[siteId], [stageId]: next },
    };
    writeJson(PROCESS_STAGES_STORAGE_KEY, merged, new Date().toISOString());
    emit();
  }, []);

  const reset = useCallback((siteId: string) => {
    const current = getSnapshot();
    /* 그 사업장만 지운다 — 통째로 지우면 다른 사업장 설정이 함께 날아간다 */
    const rest = Object.fromEntries(
      Object.entries(current).filter(([id]) => id !== siteId),
    );
    if (Object.keys(rest).length === 0) removeKey(PROCESS_STAGES_STORAGE_KEY);
    else writeJson(PROCESS_STAGES_STORAGE_KEY, rest, new Date().toISOString());
    emit();
  }, []);

  const value = useMemo(() => ({ settings, setStage, reset }), [settings, setStage, reset]);

  return (
    <ProcessSettingsContext.Provider value={value}>{children}</ProcessSettingsContext.Provider>
  );
}

/**
 * 프로바이더 밖에서 부르면 던진다.
 *
 * 조용히 기본값으로 떨어지면 그 화면만 표준 5단계를 보게 되고, 같은 사업장이 화면마다 다른
 * 공정을 갖는다 — 그게 정확히 이 컨텍스트가 없애려던 문제다.
 */
export function useProcessSettingsStore(): ProcessSettingsStore {
  const store = useContext(ProcessSettingsContext);
  if (!store) {
    throw new Error('ProcessSettingsProvider 안에서만 쓸 수 있습니다');
  }
  return store;
}
