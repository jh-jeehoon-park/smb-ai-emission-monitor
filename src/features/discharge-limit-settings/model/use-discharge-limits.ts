'use client';

import { useMemo } from 'react';
import { useSelectedSiteId } from '@/features/site-selection';
import { resolveLimitTable, type ResolvedLimits } from '../lib/resolve';
import type { SiteClassification } from '../lib/storage';
import { classificationOf, useLimitSettingsStore } from './limit-settings-context';

export interface DischargeLimitsView extends ResolvedLimits {
  classification: SiteClassification;
}

/**
 * 지금 선택한 사업장에 **적용되는** 기준치.
 *
 * 위젯은 이 훅만 부르고 `DISCHARGE_LIMITS`를 직접 읽지 않는다 — 직접 읽으면 사용자가 설정한
 * 값이 그 화면에만 반영되지 않아 같은 항목이 화면마다 다른 기준을 갖는다.
 *
 * **사업장을 인자로 받지 않는다.** 범위는 URL이 정하고(`?site=`) 라우트 가드가 역할별로
 * 고정한다 — 화면이 사업장을 따로 넘기면 두 정의가 갈린다.
 */
export function useDischargeLimits(): DischargeLimitsView {
  const store = useLimitSettingsStore();
  const { siteId } = useSelectedSiteId();

  return useMemo(() => {
    const classification = classificationOf(store, siteId);
    return {
      ...resolveLimitTable(store.sheets, classification, store.updatedIso),
      classification,
    };
  }, [store, siteId]);
}
