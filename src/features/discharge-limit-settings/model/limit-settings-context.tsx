'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { readJson, readUpdatedIso, removeKey, writeJson } from '@/shared/lib/local-store';
import { CLASSIFICATION_STORAGE_KEY, LIMIT_STORAGE_KEY } from '../config/constants';
import {
  parseClassification,
  parseSheets,
  type ClassificationBySite,
  type LimitSheets,
  type SiteClassification,
} from '../lib/storage';

interface LimitSettingsStore {
  sheets: LimitSheets;
  classification: ClassificationBySite;
  updatedIso: string | null;
  setSheets: (next: LimitSheets) => void;
  setClassification: (siteId: string, next: SiteClassification) => void;
  reset: () => void;
}

const LimitSettingsContext = createContext<LimitSettingsStore | null>(null);

const EMPTY_CLASSIFICATION: SiteClassification = { regionGrade: null, dischargeScale: null };
const EMPTY_SHEETS: LimitSheets = {};
const EMPTY_BY_SITE: ClassificationBySite = {};

/**
 * 저장소가 바뀐 것을 React에 알린다.
 *
 * `useSyncExternalStore`는 스냅샷이 **참조로 같으면** 다시 그리지 않는다. localStorage를 매번
 * `JSON.parse`하면 값이 같아도 새 객체가 나와 무한 렌더가 되므로, 파싱 결과를 붙잡아 두고
 * **쓰는 쪽이 무를 때만** 버린다.
 */
let snapshot: { sheets: LimitSheets; bySite: ClassificationBySite; updatedIso: string | null } | null =
  null;
const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  /*
   * 다른 탭에서 고친 설정도 받는다. `storage` 이벤트는 **다른 탭에서만** 오므로 같은 탭의
   * 변경은 아래 `emit`이 알린다 — 둘을 함께 두어야 두 경로가 다 반영된다.
   */
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

function getSnapshot() {
  snapshot ??= {
    sheets: readJson(LIMIT_STORAGE_KEY, parseSheets) ?? EMPTY_SHEETS,
    bySite: readJson(CLASSIFICATION_STORAGE_KEY, parseClassification) ?? EMPTY_BY_SITE,
    updatedIso: readUpdatedIso(LIMIT_STORAGE_KEY),
  };
  return snapshot;
}

/** **서버에는 저장소가 없다.** 빈 값을 주어 서버와 하이드레이션 첫 렌더가 같아지게 한다 */
const SERVER_SNAPSHOT = { sheets: EMPTY_SHEETS, bySite: EMPTY_BY_SITE, updatedIso: null };
const getServerSnapshot = () => SERVER_SNAPSHOT;

/**
 * 사용자가 설정한 방류 기준치와 사업장 분류를 셸 전체가 공유한다.
 *
 * **첫 렌더는 반드시 비어 있다.** 서버는 localStorage를 모르므로 첫 렌더에서 저장값을 읽으면
 * 서버 HTML과 클라이언트 첫 렌더가 갈려 하이드레이션이 깨진다 — 이 저장소에서 두 번 터졌다
 * (`app/layout.tsx` 주석).
 *
 * 그래서 저장소를 **React 밖의 외부 소스로 구독한다**(`useSyncExternalStore`). 헤더 시계가
 * 시간을 다루는 방식과 같다(`live-clock.tsx`) — effect에서 `setState`를 부르면 렌더가 한 번 더
 * 도는 데다 그 패턴 자체가 린트에 걸린다(`react-hooks/set-state-in-effect`).
 *
 * 테마·역할처럼 `<head>` 스크립트 + `data-*` + CSS로 가를 수 없다. CSS는 요소를 감출 뿐
 * **기준선의 y좌표와 초과 건수를 고칠 수 없다** — 값 자체가 달라지는 종류의 설정이다.
 * 한 프레임 `미확정`이 스치는 것은 허용한다. 그쪽이 틀린 기준선을 그리는 것보다 낫다.
 *
 * 서버가 생기면 이 프로바이더가 **제거 대상**이 된다 — 설정은 서버가 갖는다(A1).
 */
export function LimitSettingsProvider({ children }: { children: ReactNode }) {
  const store = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  /**
   * 갱신 시각은 **쓰는 쪽이 정한다.** `DEMO_NOW_ISO`(고정 시연 시각)를 쓰면 설정한 시각이
   * 아니라 시연 기준 시각이 찍혀 "언제 설정했는가"의 답이 되지 않는다. 여기서만 실제 시각을
   * 읽는다 — 렌더 중이 아니라 이벤트 안이라 하이드레이션과 무관하다.
   */
  const setSheets = useCallback((next: LimitSheets) => {
    writeJson(LIMIT_STORAGE_KEY, next, new Date().toISOString());
    emit();
  }, []);

  const setClassification = useCallback((siteId: string, next: SiteClassification) => {
    /* 저장소가 정본이다 — React state를 따로 들면 두 곳이 갈린다 */
    const merged = { ...getSnapshot().bySite, [siteId]: next };
    writeJson(CLASSIFICATION_STORAGE_KEY, merged, new Date().toISOString());
    emit();
  }, []);

  const reset = useCallback(() => {
    removeKey(LIMIT_STORAGE_KEY);
    removeKey(CLASSIFICATION_STORAGE_KEY);
    emit();
  }, []);

  const value = useMemo(
    () => ({
      sheets: store.sheets,
      classification: store.bySite,
      updatedIso: store.updatedIso,
      setSheets,
      setClassification,
      reset,
    }),
    [store, setSheets, setClassification, reset],
  );

  return <LimitSettingsContext.Provider value={value}>{children}</LimitSettingsContext.Provider>;
}

/**
 * 프로바이더 밖에서 부르면 던진다.
 *
 * 조용히 기본값으로 떨어지면 그 화면만 정적 표를 보게 되고, 같은 항목이 화면마다 다른 기준을
 * 갖는다 — 그게 정확히 이 컨텍스트가 없애려던 문제다. 붙이는 것을 잊으면 즉시 알아야 한다.
 */
export function useLimitSettingsStore(): LimitSettingsStore {
  const store = useContext(LimitSettingsContext);
  if (!store) {
    throw new Error('LimitSettingsProvider 안에서만 쓸 수 있습니다');
  }
  return store;
}

/** 그 사업장의 분류. 없으면 두 축이 비어 있다 — 기준표를 고를 수 없다는 뜻이다 */
export function classificationOf(store: LimitSettingsStore, siteId: string): SiteClassification {
  return store.classification[siteId] ?? EMPTY_CLASSIFICATION;
}
