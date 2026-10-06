'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import type { MeasurementItemCode } from '@/shared/config/measurement';
import { readJson, removeKey, writeJson } from '@/shared/lib/local-store';
import { SITE_PROVISIONING_STORAGE_KEY } from '../config/constants';
import { parseProvisioning, type ProvisioningBySite } from '../lib/storage';

interface ProvisioningStore {
  settings: ProvisioningBySite;
  setAbsentCodes: (siteId: string, next: MeasurementItemCode[]) => void;
  setMeteredEquipment: (siteId: string, next: string[]) => void;
  reset: (siteId: string) => void;
}

const ProvisioningContext = createContext<ProvisioningStore | null>(null);

const EMPTY: ProvisioningBySite = {};

/**
 * 저장소가 바뀐 것을 React에 알린다.
 *
 * `useSyncExternalStore`는 스냅샷이 **참조로 같으면** 다시 그리지 않는다. 매번 `JSON.parse`
 * 하면 값이 같아도 새 객체가 나와 무한 렌더가 되므로 파싱 결과를 붙잡아 둔다.
 * 공정 구성·기준치 저장소와 같은 구조다.
 */
let snapshot: ProvisioningBySite | null = null;
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

function getSnapshot(): ProvisioningBySite {
  snapshot ??= readJson(SITE_PROVISIONING_STORAGE_KEY, parseProvisioning) ?? EMPTY;
  return snapshot;
}

/** **서버에는 저장소가 없다.** 빈 값을 주어 서버와 하이드레이션 첫 렌더가 같아지게 한다 */
const getServerSnapshot = () => EMPTY;

/**
 * 사업장이 **무엇을 달았는가**를 셸 전체가 공유한다.
 *
 * 실증 현장조사가 사업장마다 계측 항목이 7·8·9종으로 갈리는 것을 보여 줬다 `[TBD-61]`.
 * 그 사실이 계측 격자·시계열·리포트에서 같아야 하므로 한 곳에서 들고 나눈다.
 *
 * **첫 렌더는 반드시 비어 있다.** 서버는 localStorage를 모르므로 첫 렌더에서 저장값을 읽으면
 * 하이드레이션이 깨진다 — 이 저장소가 두 번 밟은 함정이다.
 *
 * 서버가 생기면 이 프로바이더가 **제거 대상**이 된다 — 계측기 구성은 서버가 갖는다(A1).
 */
export function ProvisioningProvider({ children }: { children: ReactNode }) {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setAbsentCodes = useCallback((siteId: string, next: MeasurementItemCode[]) => {
    /* 저장소가 정본이다 — React state를 따로 들면 두 곳이 갈린다 */
    const current = getSnapshot();
    const merged: ProvisioningBySite = {
      ...current,
      /* 다른 축(전력 계측)을 덮지 않는다 — 한 키에 둘이 살므로 쓰는 쪽이 지켜야 한다 */
      [siteId]: {
        instruments: { absentCodes: next },
        meteredEquipmentIds: current[siteId]?.meteredEquipmentIds ?? [],
      },
    };
    writeJson(SITE_PROVISIONING_STORAGE_KEY, merged, new Date().toISOString());
    emit();
  }, []);

  const setMeteredEquipment = useCallback((siteId: string, next: string[]) => {
    const current = getSnapshot();
    const merged: ProvisioningBySite = {
      ...current,
      /* 계측 항목 축을 덮지 않는다 — 위 `setAbsentCodes`와 짝이다 */
      [siteId]: {
        instruments: current[siteId]?.instruments ?? { absentCodes: [] },
        meteredEquipmentIds: next,
      },
    };
    writeJson(SITE_PROVISIONING_STORAGE_KEY, merged, new Date().toISOString());
    emit();
  }, []);

  const reset = useCallback((siteId: string) => {
    const current = getSnapshot();
    /* 그 사업장만 지운다 — 통째로 지우면 다른 사업장 설정이 함께 날아간다 */
    const rest = Object.fromEntries(Object.entries(current).filter(([id]) => id !== siteId));
    if (Object.keys(rest).length === 0) removeKey(SITE_PROVISIONING_STORAGE_KEY);
    else writeJson(SITE_PROVISIONING_STORAGE_KEY, rest, new Date().toISOString());
    emit();
  }, []);

  const value = useMemo(
    () => ({ settings, setAbsentCodes, setMeteredEquipment, reset }),
    [settings, setAbsentCodes, setMeteredEquipment, reset],
  );

  return <ProvisioningContext.Provider value={value}>{children}</ProvisioningContext.Provider>;
}

/**
 * 프로바이더 밖에서 부르면 던진다.
 *
 * 조용히 «전부 보유»로 떨어지면 그 화면만 8종을 다 그리게 되고, 같은 사업장이 화면마다 다른
 * 계측 구성을 갖는다 — 그게 정확히 이 컨텍스트가 없애려던 문제다.
 */
export function useProvisioningStore(): ProvisioningStore {
  const store = useContext(ProvisioningContext);
  if (!store) {
    throw new Error('ProvisioningProvider 안에서만 쓸 수 있습니다');
  }
  return store;
}
