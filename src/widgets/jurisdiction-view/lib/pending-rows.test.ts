import { describe, expect, it } from 'vitest';
import { DISCHARGE_LIMITS } from '@/shared/config/discharge-limits';
import { SITES } from '@/entities/site';
import { buildSupervisionRows } from './supervision-rows';

/**
 * **대기 중에 «초과 0건»이라 주장하지 않는다** `[사용자 지적 2026-09-07]`.
 *
 * 첫 응답 전 계열은 비어 있는데(`pending`), `countOverLimit`은 기준이 있는 항목에서 빈
 * 배열을 «걸러 보니 0건»으로 센다 — **확인하지 않은 것이 안전으로 둔갑한다.** 같은 파일의
 * `countOverLimitIn` 주석이 미설정·두절에 대해 이미 금지해 둔 것이고, 계열을 비우면서
 * 그 목록에 «대기»가 하나 더 붙었다(**E4**).
 *
 * 이 검사는 그 자리를 지킨다 — 화면에서는 `0`과 `—`가 한 칸 차이라 눈으로 잡히지 않는다.
 */
const sites = SITES.slice(0, 3);
const online = sites.filter((site) => site.online);
const empty = new Map(sites.map((site) => [site.id, []]));

describe('buildSupervisionRows — 대기 중인 사업장은 판정하지 않는다', () => {
  it('대기 목록에 있으면 초과가 `null`이다', () => {
    const rows = buildSupervisionRows(
      sites,
      [],
      DISCHARGE_LIMITS,
      empty,
      new Set(sites.map((site) => site.id)),
    );

    for (const row of rows) {
      expect(row.overLimit, row.site.id).toBeNull();
    }
  });

  /**
   * **대기 목록이 비면 옛 동작이 그대로 드러난다.** 이 검사가 그 사실을 값으로 남긴다 —
   * 통신이 살아 있는 사업장의 빈 계열이 `0`으로 세어진다.
   */
  it('대기 목록을 주지 않으면 빈 계열이 `0`으로 세어진다 — 그래서 넘겨야 한다', () => {
    const rows = buildSupervisionRows(sites, [], DISCHARGE_LIMITS, empty);
    const counted = rows.filter((row) => row.overLimit === 0);

    expect(online.length, '이 시연 데이터에는 통신이 살아 있는 사업장이 있어야 한다').toBeGreaterThan(0);
    expect(counted.length).toBe(online.length);
  });

  /** 두절 사업장은 대기 여부와 무관하게 `null`이다 — 원래부터 판정하지 않는다 */
  it('두절 사업장은 대기 목록과 무관하게 `null`이다', () => {
    const offline = sites.filter((site) => !site.online).map((site) => site.id);
    if (offline.length === 0) return;

    const rows = buildSupervisionRows(sites, [], DISCHARGE_LIMITS, empty);
    for (const row of rows.filter((r) => offline.includes(r.site.id))) {
      expect(row.overLimit).toBeNull();
    }
  });
});
