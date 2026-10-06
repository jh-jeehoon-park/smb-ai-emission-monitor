import { describe, expect, it } from 'vitest';
import {
  MUNICIPALITY_QUERY_KEY,
  SCOPE_OPTIONS,
  SCOPE_QUERY_KEY,
  SITE_QUERY_KEY,
  clearMunicipalityLock,
  hasMunicipalityLock,
  resetScopeToAllSites,
} from './scope';

const q = (search: string) => new URLSearchParams(search);
const asObject = (params: URLSearchParams) => Object.fromEntries(params.entries());

/** 기초지자체를 거치고 나면 URL이 이 모양이다 */
const GOV_URL = q('scope=municipality&municipality=안동시&site=S-01&period=24h');

describe('관할 잠금 — 좁은 범위에서 나오는 길', () => {
  /**
   * **실제로 난 증상이다** `[사용자 지적 2026-08-27]`. 시스템 관리자 → 기초지자체 →
   * 시스템 관리자로 되돌아오면 전 사업장 권한인데 관내 2개소만 보였다. 좁은 범위로
   * 들어가는 길만 있고 나오는 길이 없어 `scope=municipality`가 URL에 남아 있었다.
   */
  it('기초지자체를 거친 URL에서 관할이 걷힌다', () => {
    expect(hasMunicipalityLock(GOV_URL)).toBe(true);

    const cleared = clearMunicipalityLock(GOV_URL);
    expect(hasMunicipalityLock(cleared)).toBe(false);
    expect(cleared.get(SCOPE_QUERY_KEY)).toBeNull();
    expect(cleared.get(MUNICIPALITY_QUERY_KEY)).toBeNull();
  });

  it('선택 사업장과 다른 쿼리는 그대로 둔다', () => {
    const cleared = clearMunicipalityLock(GOV_URL);
    expect(cleared.get(SITE_QUERY_KEY)).toBe('S-01');
    expect(cleared.get('period')).toBe('24h');
  });

  /**
   * `scope` 키를 **역할 범위 잠금과 알람·리포트의 사용자 필터가 함께 쓴다.** 사용자가 고른
   * `선택 사업장`을 역할 전환이 지워 버리면 필터가 제멋대로 풀린다.
   *
   * 가를 수 있는 근거는 `SCOPE_OPTIONS`다 — 관할은 거기 없다(계정이 정하는 값이다).
   */
  it('사용자가 고른 범위는 지우지 않는다', () => {
    const picked = q('scope=site&site=S-05');
    expect(asObject(clearMunicipalityLock(picked))).toEqual({ scope: 'site', site: 'S-05' });

    const all = q('scope=all');
    expect(asObject(clearMunicipalityLock(all))).toEqual({ scope: 'all' });
  });

  it('세그먼트가 고를 수 있는 값에 관할이 없다 — 위 구분의 근거', () => {
    expect(SCOPE_OPTIONS.map((o) => o.value)).not.toContain('municipality');
  });

  it('걷을 것이 없으면 그대로다', () => {
    const clean = q('site=S-03&period=6h');
    expect(hasMunicipalityLock(clean)).toBe(false);
    expect(asObject(clearMunicipalityLock(clean))).toEqual({ site: 'S-03', period: '6h' });
  });

  /** `municipality`만 남은 반쪽 상태도 잠금으로 센다 — 그러지 않으면 다음 판정이 흔들린다 */
  it('짝이 깨진 관할 키도 걷는다', () => {
    const half = q('municipality=안동시&site=S-01');
    expect(hasMunicipalityLock(half)).toBe(true);
    expect(asObject(clearMunicipalityLock(half))).toEqual({ site: 'S-01' });
  });

  /**
   * 사업장을 거쳐 시스템 관리자로 돌아오면 `scope=site`가 남아 1개소만 보였다 — 관할 축에서
   * 난 것과 **같은 증상의 다른 축**이다. 역할 전환은 한 번의 분명한 동작이라 새 역할의 기본
   * 범위로 리셋한다.
   */
  it('역할 전환은 사용자가 고른 범위까지 되돌린다', () => {
    expect(asObject(resetScopeToAllSites(q('scope=site&site=S-02')))).toEqual({ site: 'S-02' });
    expect(asObject(resetScopeToAllSites(GOV_URL))).toEqual({ site: 'S-01', period: '24h' });
  });

  /** 가드는 그러지 않는다 — 알람·리포트의 세그먼트가 같은 키를 쓴다 */
  it('가드와 역할 전환이 다른 것을 걷는다', () => {
    const picked = q('scope=site');
    expect(clearMunicipalityLock(picked).get(SCOPE_QUERY_KEY)).toBe('site');
    expect(resetScopeToAllSites(picked).get(SCOPE_QUERY_KEY)).toBeNull();
  });

  it('원본을 고치지 않는다 — 호출부가 같은 params를 다시 읽는다', () => {
    const original = q('scope=municipality&municipality=안동시');
    clearMunicipalityLock(original);
    expect(original.get(SCOPE_QUERY_KEY)).toBe('municipality');
  });
});
