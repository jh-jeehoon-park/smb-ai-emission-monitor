'use client';

import { useMemo } from 'react';
import { useSelectedSiteId } from '@/features/site-selection';
import { resolveMetering, type ResolvedMetering } from '../lib/resolve';
import { useProvisioningStore } from './provisioning-context';

/**
 * 지금 선택한 사업장에서 **전력을 재는 설비**.
 *
 * 사업장을 인자로 받지 않는다 — 범위는 URL이 정한다(`?site=`). 계측 항목 훅과 같은 규약이다.
 */
export function useMetering(): ResolvedMetering {
  const { settings } = useProvisioningStore();
  const { siteId } = useSelectedSiteId();

  return useMemo(() => resolveMetering(settings, siteId), [settings, siteId]);
}
