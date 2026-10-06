import { describe, expect, it } from 'vitest';
import { SCOPE_FILTERS } from '@/shared/config/scope';
import { GOV_HOME_SITE_ID, GOV_MUNICIPALITY } from '@/entities/user';
import { DEFAULT_SITE_ID, SITES, firstSiteIn, scopeLabelOf, siteIdsInScope, sitesIn, withinScope } from './index';

const ANDONG = { siteId: GOV_HOME_SITE_ID, municipality: GOV_MUNICIPALITY };

describe('관할 목록', () => {
  it('안동시에 사업장이 둘이다', () => {
    expect(sitesIn(GOV_MUNICIPALITY).map((s) => s.id)).toEqual(['S-01', 'S-04']);
  });

  /** 전국 243개 시·군·구 중 대부분이 그렇다 `[원문 p.33]` — 부르는 쪽이 빈 상태를 그린다 */
  it('사업장이 없는 관할은 빈 목록이다 — 오류가 아니다', () => {
    expect(sitesIn('없는시')).toEqual([]);
    expect(firstSiteIn('없는시')).toBeNull();
  });
});

/**
 * **`GOV_HOME_SITE_ID`는 값으로 적혀 있다.** `entities`끼리 서로를 읽을 수 없어
 * (FSD §8) `sitesIn()`으로 계산할 수 없었다 — `ADMIN_ACCOUNTS`가 `siteId`를 값으로 적어 둔
 * 것과 같은 사정이다. 그래서 **어긋나지 않는지를 여기서 확인한다.**
 */
describe('기초지자체 계정의 관할과 첫 사업장', () => {
  it('첫 사업장이 관할 안에 있다', () => {
    expect(sitesIn(GOV_MUNICIPALITY).map((s) => s.id)).toContain(GOV_HOME_SITE_ID);
  });

  /** 두절 사업장을 첫 화면으로 열면 상세가 빈 상태로 시작한다 */
  it('첫 사업장은 수신 중이다', () => {
    expect(SITES.find((s) => s.id === GOV_HOME_SITE_ID)?.online).toBe(true);
  });

  /** 관할 이름이 데이터와 어긋나면 목록이 비고 지도가 빈 상태로 떨어진다 */
  it('관할 이름이 사업장 데이터의 표기와 같다', () => {
    expect(SITES.some((s) => s.municipality === GOV_MUNICIPALITY)).toBe(true);
  });

  /**
   * **지도는 관할이 속한 시도 한 장을 그린다** `[사용자 결정 2026-08-26]`.
   * 시도를 사업장에서 읽으므로 관내가 두 시도에 걸치면 어느 쪽을 그릴지 정해지지 않는다.
   */
  it('관내 사업장이 모두 같은 시도에 있다', () => {
    const provinces = new Set(sitesIn(GOV_MUNICIPALITY).map((s) => s.province));
    expect(provinces.size).toBe(1);
  });

  /**
   * **`?site=`를 함께 박아야 하는 이유가 이것이다.**
   *
   * `useSelectedSiteId`의 허용 목록은 10개소 전부이고 기본값이 `DEFAULT_SITE_ID`인데,
   * 그 값이 **관할 밖**이다. 범위만 좁히고 `site`를 두면 상세 패널이 남의 사업장을 그린다 —
   * 라우트 가드가 `GOV_HOME_SITE_ID`를 박는 근거다.
   */
  it('기본 사업장은 관할 밖이다 — 그래서 가드가 site를 박는다', () => {
    expect(sitesIn(GOV_MUNICIPALITY).map((s) => s.id)).not.toContain(DEFAULT_SITE_ID);
    expect(GOV_HOME_SITE_ID).not.toBe(DEFAULT_SITE_ID);
  });
});

/**
 * **허용 목록만 고치면 조용히 틀린다.**
 *
 * 소비처가 `scope === 'site' ? 좁힘 : 전체`로 적혀 있으면 `SCOPE_FILTERS`에 값을 더해도
 * 새 범위가 **else(전 사업장)로 떨어진다** — 기초지자체가 전국을 보는데 화면 어디에도
 * 그 사실이 드러나지 않는다. 범위 판정을 한 함수가 갖게 해 그 실수를 막는다.
 */
describe('범위 좁히기', () => {
  const rows = SITES.map((site) => ({ siteId: site.id }));

  it('`all`은 거르지 않는다', () => {
    expect(siteIdsInScope('all', ANDONG)).toBeNull();
    expect(withinScope(rows, siteIdsInScope('all', ANDONG))).toHaveLength(SITES.length);
  });

  it('`site`는 그 사업장 하나다', () => {
    expect(withinScope(rows, siteIdsInScope('site', ANDONG))).toEqual([{ siteId: 'S-01' }]);
  });

  it('`municipality`는 관내뿐이다 — 전 사업장으로 떨어지지 않는다', () => {
    const kept = withinScope(rows, siteIdsInScope('municipality', ANDONG));
    expect(kept.map((r) => r.siteId)).toEqual(['S-01', 'S-04']);
    expect(kept.length).toBeLessThan(SITES.length);
  });

  /** 관할이 비었는데 전국으로 넓히면 볼 권한이 없는 사업장이 들어온다 */
  it('관할이 없으면 빈 목록이다 — 전국으로 넓히지 않는다', () => {
    const kept = withinScope(rows, siteIdsInScope('municipality', { siteId: 'S-01', municipality: null }));
    expect(kept).toEqual([]);
  });

  /** 라벨과 숫자가 갈리면 감독자가 관내 건수를 전국 건수로 읽는다 */
  it('범위마다 라벨이 다르다', () => {
    const within = { siteName: '안동 염색 1공장', municipality: GOV_MUNICIPALITY };
    const labels = SCOPE_FILTERS.map((scope) => scopeLabelOf(scope, within));
    expect(new Set(labels).size).toBe(SCOPE_FILTERS.length);
    expect(scopeLabelOf('municipality', within)).toBe('안동시 관내');
  });
});
