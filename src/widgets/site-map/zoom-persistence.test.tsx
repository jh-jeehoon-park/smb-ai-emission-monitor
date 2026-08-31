// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SITES } from '@/entities/site';
import { SiteMapPanel } from './index';

/**
 * **새로고침이 지도 확대를 풀면 안 된다** `[사용자 지적 2026-08-31]`.
 *
 * 통합 관제에서 사업장을 고르면 지도가 그 시도로 확대된다. 그런데 새로고침하면 탭과 주소는
 * 그대로인데 **지도만 전국으로 돌아갔다** — `SiteMap`이 «마운트 시점의 사업장»을 첫 방문으로
 * 보는데, 새로고침하면 주소에 남은 `?site=`가 바로 그 자리에 오기 때문이다.
 *
 * 규칙이 말하는 «처음»은 **아무것도 고르지 않은 첫 방문**이다 `[사용자 지시 2026-08-24]` —
 * 그때 한 시도로 확대돼 있으면 나머지 9개소가 화면 밖이라 «전 사업장 관제»가 성립하지 않는다.
 * 골라서 주소에 남긴 것은 그 «처음»이 아니다.
 *
 * **확대 여부는 지도 그룹의 `scale`로 읽는다.** 전국이면 1배이고 시도로 확대되면 그보다
 * 크다(`provinceFocus`). 애니메이션이 있어 최종값을 기다리지 않고 **1배가 아니기만** 확인한다.
 *
 * **`g[style*="scale"]`로 찾으면 안 된다** — 핀도 같은 모양의 변환을 갖고, 고른 핀은 1.28배라
 * 확대와 구분되지 않는다(처음에 그렇게 썼다가 두 경우가 똑같이 나왔다). 지도 그룹은 `svg`의
 * **직계 자식**이고 핀은 그 안에 있으므로 그 관계로 겨냥한다.
 */
function mapScale(container: HTMLElement): number | null {
  const svg = container.querySelector('svg[role="img"]');
  const group = svg
    ? [...svg.children].find(
        (child): child is SVGGElement =>
          child.tagName === 'g' && (child as SVGGElement).style.transform !== '',
      )
    : undefined;
  const m = group ? /scale\(([\d.]+)\)/.exec(group.style.transform) : null;
  return m ? Number(m[1]) : null;
}

function zoomedGroup(container: HTMLElement): boolean {
  const scale = mapScale(container);
  return scale !== null && scale > 1;
}

/** 경북에 있는 사업장 — 확대할 시도가 있어야 이 검사가 성립한다 */
const IN_GYEONGBUK = SITES.find((s) => s.province === '경상북도')!;

describe('지도 확대와 새로고침', () => {
  it('고르지 않고 들어오면 전국으로 연다', () => {
    const { container } = render(
      <SiteMapPanel sites={SITES} selectedId={IN_GYEONGBUK.id} onSelect={vi.fn()} />,
    );
    expect(zoomedGroup(container)).toBe(false);
  });

  /** 새로고침한 상태가 이것이다 — 주소가 사업장을 지목한 채 마운트된다 */
  it('주소가 사업장을 지목한 채 들어오면 그 시도로 확대한다', () => {
    const { container } = render(
      <SiteMapPanel sites={SITES} selectedId={IN_GYEONGBUK.id} onSelect={vi.fn()} siteChosen />,
    );
    expect(zoomedGroup(container)).toBe(true);
  });

  /** 두 경우가 **서로 다른 그림**이어야 한다 — 같으면 이 검사가 아무것도 못 잡는다 */
  it('두 경우가 실제로 다르다', () => {
    const plain = render(
      <SiteMapPanel sites={SITES} selectedId={IN_GYEONGBUK.id} onSelect={vi.fn()} />,
    );
    const chosen = render(
      <SiteMapPanel sites={SITES} selectedId={IN_GYEONGBUK.id} onSelect={vi.fn()} siteChosen />,
    );
    expect(zoomedGroup(plain.container)).not.toBe(zoomedGroup(chosen.container));
  });
});
