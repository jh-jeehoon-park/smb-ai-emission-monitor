import { describe, expect, it } from 'vitest';
import { DISCHARGE_LIMITS, type DischargeLimitTable } from '@/shared/config/discharge-limits';
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

/** 사업장마다 표를 받는다 — 이 검사는 전부 같은 표를 쓰지만 **하나를 돌려주는 자리가 아니다** */
const sameTable = (): DischargeLimitTable => DISCHARGE_LIMITS;

describe('buildSupervisionRows — 대기 중인 사업장은 판정하지 않는다', () => {
  it('대기 목록에 있으면 초과가 `null`이다', () => {
    const rows = buildSupervisionRows(
      sites,
      [],
      sameTable,
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
    const rows = buildSupervisionRows(sites, [], sameTable, empty);
    const counted = rows.filter((row) => row.overLimit === 0);

    expect(online.length, '이 시연 데이터에는 통신이 살아 있는 사업장이 있어야 한다').toBeGreaterThan(0);
    expect(counted.length).toBe(online.length);
  });

  /** 두절 사업장은 대기 여부와 무관하게 `null`이다 — 원래부터 판정하지 않는다 */
  it('두절 사업장은 대기 목록과 무관하게 `null`이다', () => {
    const offline = sites.filter((site) => !site.online).map((site) => site.id);
    if (offline.length === 0) return;

    const rows = buildSupervisionRows(sites, [], sameTable, empty);
    for (const row of rows.filter((r) => offline.includes(r.site.id))) {
      expect(row.overLimit).toBeNull();
    }
  });
});

/**
 * **관내 목록은 사업장마다 자기 기준으로 판정한다**
 * `[사용자 요청 2026-09-28: 설정 재설계 검토]`.
 *
 * 한때 이 함수가 표를 **하나** 받았고, 화면은 **지금 선택한 사업장**의 표를 넘겼다 —
 * A사업장을 골랐다는 이유로 B사업장이 A의 기준으로 초과 건수를 얻었다. 기준은 지역구분·
 * 배출량 규모로 갈리므로(`[공정자료 p.11]`) 그 자체가 틀린 판정이다.
 */
describe('buildSupervisionRows — 사업장마다 자기 기준을 쓴다', () => {
  const [first, second] = sites;

  /** 같은 계열에 **서로 다른 상한**을 준다 — 결과가 갈리지 않으면 표가 공유되고 있다는 뜻이다 */
  const limitFor = (max: number): DischargeLimitTable => ({
    pH: { min: null, max, source: '검사', unavailableReason: null, basis: 'legal' },
  });

  const points = [
    { iso: '2026-09-28T00:00:00.000Z', pH: 7 },
    { iso: '2026-09-28T00:01:00.000Z', pH: 9 },
  ] as unknown as Parameters<typeof buildSupervisionRows>[3] extends Map<string, infer P>
    ? P
    : never;

  it('한 사업장의 기준이 다른 사업장에 번지지 않는다', () => {
    const series = new Map(sites.map((site) => [site.id, points]));
    /* 첫 사업장은 상한 8(9가 넘는다) · 둘째는 상한 10(아무것도 안 넘는다) */
    const rows = buildSupervisionRows(
      sites,
      [],
      (siteId) => (siteId === first!.id ? limitFor(8) : limitFor(10)),
      series,
    );

    const a = rows.find((row) => row.site.id === first!.id)!;
    const b = rows.find((row) => row.site.id === second!.id)!;

    /* 두절 사업장이면 둘 다 `null`이라 이 검사가 아무것도 말하지 않는다 */
    if (!first!.online || !second!.online) return;

    expect(a.overLimit).toBe(1);
    expect(b.overLimit).toBe(0);
  });

  /**
   * **시연 임계값은 법정 초과 칸에 들어가지 않는다.** 두 축을 더하면 「법정 기준 초과 N건」이
   * 되는데 그 N 중 법령이 뒷받침하는 것이 하나도 없을 수 있다.
   */
  it('시연 임계값 초과는 다른 칸에 센다', () => {
    const series = new Map(sites.map((site) => [site.id, points]));
    const demo: DischargeLimitTable = {
      pH: { min: null, max: 8, source: '[시연 기본값]', unavailableReason: null, basis: 'provisional' },
    };
    const rows = buildSupervisionRows(sites, [], () => demo, series);
    const row = rows.find((r) => r.site.id === first!.id)!;

    if (!first!.online) return;
    expect(row.overLimit).toBeNull();
    expect(row.overProvisional).toBe(1);
  });
});
