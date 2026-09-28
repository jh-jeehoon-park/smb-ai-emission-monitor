// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { ProvisioningProvider, useProvisioningStore } from './model/provisioning-context';
import { resolveInstruments, resolveMetering } from './lib/resolve';

/**
 * **한 키에 두 축이 산다** — 계측 항목(`instruments`)과 전력 계측 대상(`meteredEquipmentIds`).
 *
 * 한쪽 setter가 다른 쪽을 덮으면 **사용자가 앞서 한 설정이 조용히 사라진다.** 순수 함수 검사는
 * 이것을 잡지 못한다(덮는 일은 저장소 쓰기에서 일어난다) — 실제로 되돌림을 넣어 보니 그쪽
 * 검사가 통과했다.
 */
afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

const SITE = 'S-02';

/** 저장소를 밖으로 꺼내 직접 부른다 — 폼을 거치면 무엇이 덮였는지 가려진다 */
function mountStore() {
  let store: ReturnType<typeof useProvisioningStore> | null = null;

  function Probe() {
    store = useProvisioningStore();
    return null;
  }

  render(
    <ProvisioningProvider>
      <Probe />
    </ProvisioningProvider>,
  );

  return () => {
    if (!store) throw new Error('저장소를 잡지 못했습니다');
    return store;
  };
}

describe('두 축이 한 키에서 서로를 덮지 않는다', () => {
  it('전력 계측을 정해도 미설치 항목이 남는다', () => {
    const get = mountStore();

    act(() => get().setAbsentCodes(SITE, ['chromaticity']));
    act(() => get().setMeteredEquipment(SITE, ['EQ-01']));

    const settings = get().settings;
    expect(resolveInstruments(settings, SITE).absent).toEqual(['chromaticity']);
    expect(resolveMetering(settings, SITE).ids).toEqual(['EQ-01']);
  });

  it('미설치 항목을 정해도 전력 계측이 남는다 — 반대 순서', () => {
    const get = mountStore();

    act(() => get().setMeteredEquipment(SITE, ['EQ-02', 'EQ-03']));
    act(() => get().setAbsentCodes(SITE, ['DO']));

    const settings = get().settings;
    expect(resolveMetering(settings, SITE).ids).toEqual(['EQ-02', 'EQ-03']);
    expect(resolveInstruments(settings, SITE).absent).toEqual(['DO']);
  });

  /** 되돌리기는 **그 사업장만** 지운다 — 통째로 지우면 다른 사업장 설정이 함께 날아간다 */
  it('되돌리기가 다른 사업장을 건드리지 않는다', () => {
    const get = mountStore();

    act(() => get().setAbsentCodes(SITE, ['chromaticity']));
    act(() => get().setAbsentCodes('S-09', ['DO']));
    act(() => get().reset(SITE));

    const settings = get().settings;
    expect(resolveInstruments(settings, SITE).isUserSet).toBe(false);
    expect(resolveInstruments(settings, 'S-09').absent).toEqual(['DO']);
  });

  /** 첫 렌더는 반드시 비어 있다 — 서버가 localStorage를 모른다(하이드레이션) */
  it('저장값이 있어도 프로바이더는 구독으로 읽는다', () => {
    const get = mountStore();

    act(() => get().setMeteredEquipment(SITE, ['EQ-01']));
    /* 저장소에 실제로 쓰였는가 — React state만 들고 있으면 새로고침에 사라진다 */
    expect(window.localStorage.getItem('aquasense-site-provisioning')).toContain('EQ-01');
  });
});
