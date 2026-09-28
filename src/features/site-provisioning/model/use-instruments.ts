'use client';

import { useMemo } from 'react';
import { useSelectedSiteId } from '@/features/site-selection';
import { resolveInstruments, type ResolvedInstruments } from '../lib/resolve';
import { useProvisioningStore } from './provisioning-context';

/**
 * 지금 선택한 사업장에 **적용되는** 계측기 구성.
 *
 * 위젯은 이 훅만 부르고 `WATER_QUALITY_CODES`로 보유 여부를 판단하지 않는다 — 직접 판단하면
 * 사용자가 끈 항목이 그 화면에만 남아 같은 사업장이 화면마다 다른 구성을 갖는다.
 *
 * **사업장을 인자로 받지 않는다.** 범위는 URL이 정하고(`?site=`) 라우트 가드가 역할별로
 * 고정한다 — 화면이 사업장을 따로 넘기면 두 정의가 갈린다. 공정·기준치 훅과 같은 규약이다.
 */
export function useInstruments(): ResolvedInstruments {
  const { settings } = useProvisioningStore();
  const { siteId } = useSelectedSiteId();

  return useMemo(() => resolveInstruments(settings, siteId), [settings, siteId]);
}
