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
import { LEGACY_PROCESS_STAGES_STORAGE_KEY, SITE_PROCESS_STORAGE_KEY } from '../config/constants';
import { migrateLegacy } from '../lib/seed';
import {
  parseLegacyStageSettings,
  parseSiteProcesses,
  type SiteProcess,
  type SiteProcessBySite,
} from '../lib/storage';

interface ProcessSettingsStore {
  settings: SiteProcessBySite;
  /** 그 사업장의 공정을 통째로 바꾼다. 조작은 `lib/edit.ts`의 순수 함수가 새 값을 만든다 */
  setProcess: (siteId: string, next: SiteProcess) => void;
  reset: (siteId: string) => void;
}

const ProcessSettingsContext = createContext<ProcessSettingsStore | null>(null);

const EMPTY: SiteProcessBySite = {};

/**
 * 저장소가 바뀐 것을 React에 알린다.
 *
 * `useSyncExternalStore`는 스냅샷이 **참조로 같으면** 다시 그리지 않는다. 매번 `JSON.parse`
 * 하면 값이 같아도 새 객체가 나와 무한 렌더가 되므로 파싱 결과를 붙잡아 둔다.
 */
let snapshot: SiteProcessBySite | null = null;
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

/**
 * **새 키가 없으면 옛 키를 옮겨 읽는다** `[사용자 요청 2026-09-29]`. 표준 단계를 켜고 끄던
 * 설정이 있던 사용자가 개편 뒤 첫 화면에서 그 설정을 잃지 않게 한다. 옮긴 결과는 첫 편집 때
 * 새 키에 쓰인다 — 읽기만으로 저장소를 고치지 않는다(렌더 중 부수효과).
 */
function getSnapshot(): SiteProcessBySite {
  snapshot ??=
    readJson(SITE_PROCESS_STORAGE_KEY, parseSiteProcesses) ??
    (() => {
      const legacy = readJson(LEGACY_PROCESS_STAGES_STORAGE_KEY, parseLegacyStageSettings);
      return legacy ? migrateLegacy(legacy) : null;
    })() ??
    EMPTY;
  return snapshot;
}

/** **서버에는 저장소가 없다.** 빈 값을 주어 서버와 하이드레이션 첫 렌더가 같아지게 한다 */
const getServerSnapshot = () => EMPTY;

/**
 * 사업장의 **공정 목록**을 셸 전체가 공유한다 — 공정 화면·설정 화면이 같은 값을 본다.
 *
 * **첫 렌더는 반드시 비어 있다**(표준 5단계로 그려진다). 서버는 localStorage를 모르므로 첫
 * 렌더에서 저장값을 읽으면 하이드레이션이 깨진다.
 *
 * 서버가 생기면 이 프로바이더가 **제거 대상**이 된다 — 공정 구성은 서버가 갖는다(A1).
 */
export function ProcessSettingsProvider({ children }: { children: ReactNode }) {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setProcess = useCallback((siteId: string, next: SiteProcess) => {
    /* 저장소가 정본이다 — React state를 따로 들면 두 곳이 갈린다 */
    const merged: SiteProcessBySite = { ...getSnapshot(), [siteId]: next };
    writeJson(SITE_PROCESS_STORAGE_KEY, merged, new Date().toISOString());
    emit();
  }, []);

  const reset = useCallback((siteId: string) => {
    /* 그 사업장만 지운다 — 통째로 지우면 다른 사업장 설정이 함께 날아간다 */
    const rest = Object.fromEntries(Object.entries(getSnapshot()).filter(([id]) => id !== siteId));
    if (Object.keys(rest).length === 0) removeKey(SITE_PROCESS_STORAGE_KEY);
    else writeJson(SITE_PROCESS_STORAGE_KEY, rest, new Date().toISOString());
    /* 옛 키가 남아 있으면 다음 읽기에서 되살아난다 — 되돌리기는 옛 설정까지 걷는다 */
    removeKey(LEGACY_PROCESS_STAGES_STORAGE_KEY);
    emit();
  }, []);

  const value = useMemo(() => ({ settings, setProcess, reset }), [settings, setProcess, reset]);

  return (
    <ProcessSettingsContext.Provider value={value}>{children}</ProcessSettingsContext.Provider>
  );
}

/** 프로바이더 밖에서 부르면 던진다 — 조용히 표준 공정으로 떨어지면 화면마다 공정이 갈린다 */
export function useProcessSettingsStore(): ProcessSettingsStore {
  const store = useContext(ProcessSettingsContext);
  if (!store) {
    throw new Error('ProcessSettingsProvider 안에서만 쓸 수 있습니다');
  }
  return store;
}
