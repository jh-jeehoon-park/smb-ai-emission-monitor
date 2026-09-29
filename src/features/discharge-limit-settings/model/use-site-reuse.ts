'use client';

import type { ReuseStatus } from '../config/constants';
import { classificationOf, useLimitSettingsStore } from './limit-settings-context';

export interface SiteReuse {
  /** `null`은 모름이다 — «재이용 없음»과 다르다 */
  status: ReuseStatus | null;
  /** 재이용량 일평균(㎥/일). 일부 재이용이고 양을 알 때만 값이 있다 */
  dailyM3: number | null;
}

/**
 * 그 사업장의 **처리수 재이용** `[사용자 결정 2026-09-29: 재이용 (가)]`.
 *
 * 유입·유출 화면이 «유입 − 유출»을 읽을 때 쓴다 — 재이용이 있는 사업장은 유출이 늘 적어,
 * 그 사실을 적지 않으면 물이 사라지는 것처럼 보인다. 값을 빼서 고치지 않는다: 재이용량은 일평균이고
 * 두 유량은 순간값이라 빼면 두 시간 축을 섞은 숫자가 된다.
 */
export function useSiteReuse(siteId: string): SiteReuse {
  const { reuse, reuseDailyM3 } = classificationOf(useLimitSettingsStore(), siteId);
  return { status: reuse, dailyM3: reuseDailyM3 };
}
