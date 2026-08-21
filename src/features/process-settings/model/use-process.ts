'use client';

import { useMemo } from 'react';
import { useSelectedSiteId } from '@/features/site-selection';
import { resolveProcess, type ResolvedProcess } from '../lib/resolve';
import { useProcessSettingsStore } from './process-settings-context';

/**
 * 지금 선택한 사업장에 **적용되는** 공정 구성.
 *
 * 위젯은 이 훅만 부르고 `PROCESS_STAGES`를 직접 읽지 않는다 — 직접 읽으면 사용자가 끈 단계가
 * 그 화면에만 남아 같은 사업장이 화면마다 다른 공정을 갖는다.
 *
 * **사업장을 인자로 받지 않는다.** 범위는 URL이 정하고(`?site=`) 라우트 가드가 역할별로
 * 고정한다 — 화면이 사업장을 따로 넘기면 두 정의가 갈린다. 기준치 훅과 같은 규약이다.
 */
export function useProcess(): ResolvedProcess {
  const { settings } = useProcessSettingsStore();
  const { siteId } = useSelectedSiteId();

  return useMemo(() => resolveProcess(settings, siteId), [settings, siteId]);
}
