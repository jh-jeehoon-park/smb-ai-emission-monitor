import type { ScopeFilter, ScopeWithin } from '@/shared/config/scope';
import { SITES } from '../api/fixtures';
import type { Site } from '../model/types';

/**
 * 관할 시·군·구 안의 사업장.
 *
 * **0개소는 오류가 아니다.** 전국 243개 시·군·구 중 대부분이 그렇다 `[원문 p.33]` —
 * 부르는 쪽이 빈 목록을 빈 상태로 그린다(R19).
 */
export function sitesIn(municipality: string): Site[] {
  return SITES.filter((site) => site.municipality === municipality);
}

/**
 * 관할 안에서 고를 첫 사업장.
 *
 * **`DEFAULT_SITE_ID`를 쓸 수 없다.** 그 값은 `S-02`(구미)라 안동 관할 밖이고,
 * `?site=` 없이 들어온 기초지자체가 남의 사업장을 보게 된다 — 라우트 가드가 이 값을 박는다.
 */
export function firstSiteIn(municipality: string): string | null {
  return sitesIn(municipality)[0]?.id ?? null;
}

/**
 * 이 범위에서 보이는 사업장 id. **`null`이면 거르지 않는다**(전 사업장).
 *
 * 소비처가 `scope === 'site' ? 좁힘 : 전체` 삼항으로 적혀 있으면 허용 목록에 범위를 더해도
 * 새 값이 **else로 떨어져 조용히 틀린다** — 그 실수를 막으려고 함수로 둔다.
 * 관할이 비면 **빈 집합**이다. 전국으로 넓히지 않는다.
 */
export function siteIdsInScope(scope: ScopeFilter, within: ScopeWithin): Set<string> | null {
  if (scope === 'site') return new Set([within.siteId]);
  if (scope === 'municipality') {
    return new Set(within.municipality ? sitesIn(within.municipality).map((site) => site.id) : []);
  }
  return null;
}

/** 위 집합으로 목록을 좁힌다. `null`이면 그대로 둔다 */
export function withinScope<T extends { siteId: string }>(
  rows: readonly T[],
  ids: Set<string> | null,
): T[] {
  return ids === null ? [...rows] : rows.filter((row) => ids.has(row.siteId));
}

/**
 * 화면이 지금 무엇을 세고 있는지 적는 말.
 *
 * **범위마다 한 줄씩 나온다.** 두 갈래로 두면 관할 범위가 `전 사업장`이라 적혀
 * 거짓이 된다 — 숫자와 라벨이 갈리면 감독자가 관내 건수를 전국 건수로 읽는다.
 */
export function scopeLabelOf(
  scope: ScopeFilter,
  within: { siteName: string; municipality: string | null },
): string {
  if (scope === 'site') return within.siteName;
  if (scope === 'municipality') return within.municipality ? `${within.municipality} 관내` : '관할 미지정';
  return '전 사업장';
}
