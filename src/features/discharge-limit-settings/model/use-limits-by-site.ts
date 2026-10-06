'use client';

import { useMemo } from 'react';
import type { DischargeLimitTable } from '@/shared/config/discharge-limits';
import { resolveLimitTable } from '../lib/resolve';
import { EMPTY_CLASSIFICATION } from '../lib/storage';
import { classificationOf, useLimitSettingsStore } from './limit-settings-context';

/**
 * **여러 사업장의 기준을 한 번에** — 사업장마다 **자기 분류로 고른 표**를 돌려준다
 * `[사용자 요청 2026-09-28: 설정 재설계 검토]`.
 *
 * **한 화면이 여러 사업장을 판정하면 `useDischargeLimits()`를 쓰면 안 된다.** 그 훅은 지금
 * 선택한 사업장 하나의 표를 낸다 — 관내 감독 표가 그 표 하나로 관내 **전부**의 초과 건수를
 * 세고 있었다(`buildSupervisionRows(sites, …, limits.table, …)`). A사업장을 골랐다는 이유로
 * B사업장이 A의 기준으로 판정됐다.
 *
 * 기준은 지역구분·배출량 규모로 갈리므로(`[공정자료 p.11]`) **다른 분류의 사업장이 같은 표를
 * 받는 것은 그 자체가 틀린 판정이다.**
 *
 * 반환이 `Map`인 이유는 호출부가 목록을 돌며 찾기 때문이다. 없는 id를 물으면 `undefined`가
 * 아니라 **기본 표**가 나오도록 `limitsOf`를 함께 낸다 — 빠진 사업장이 조용히 판정에서
 * 빠지는 것보다 기본 표로 «판정 불가»가 되는 편이 낫다.
 */
export interface LimitsBySite {
  /** 사업장별 적용 표 */
  tables: ReadonlyMap<string, DischargeLimitTable>;
  /** 없으면 분류 없는 기본 표를 낸다 */
  limitsOf: (siteId: string) => DischargeLimitTable;
}

export function useDischargeLimitsBySite(siteIds: readonly string[]): LimitsBySite {
  const store = useLimitSettingsStore();

  /* 목록이 매 렌더 새 배열로 와도 내용이 같으면 다시 풀지 않는다 */
  const key = siteIds.join('|');

  return useMemo(() => {
    const ids = key === '' ? [] : key.split('|');
    const tables = new Map<string, DischargeLimitTable>();
    for (const id of ids) {
      tables.set(id, resolveLimitTable(store.sheets, classificationOf(store, id), store.updatedIso).table);
    }

    const fallback = resolveLimitTable(
      store.sheets,
      EMPTY_CLASSIFICATION,
      store.updatedIso,
    ).table;

    return { tables, limitsOf: (siteId: string) => tables.get(siteId) ?? fallback };
  }, [store, key]);
}
