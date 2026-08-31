// @vitest-environment jsdom
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { provinceFocus } from '@/shared/lib/map-view';
import { DEFAULT_SITE_ID, SITES } from '@/entities/site';
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

/** 기본 사업장(구미)과 **다른 시도**라야 «되돌아왔을 때 어디로 갔는가»가 갈린다 */
const IN_GYEONGGI = SITES.find((s) => s.province === '경기도')!;

/**
 * **감속 설정을 켠 채로 본다.**
 *
 * 마운트 뒤의 축척은 560ms 보간을 거치는데(`useAnimatedFocus`), jsdom에서는 그 보간이
 * 진행되지 않는다 — `requestAnimationFrame`이 넘겨주는 프레임 시각이 `performance.now()`와
 * 기준이 달라 경과 시간이 늘 음수로 잡힌다. 기다려도 첫 값에 머문다.
 *
 * 감속 설정에서는 보간 시간이 0이라 **첫 프레임에 목표로 앉는다.** 흉내가 아니라 코드에 있는
 * 길이고, 사용자 환경이 이쪽이다. 이 파일 전체에 걸어 두면 첫 렌더만 보는 다른 검사도 그대로다.
 */
function preferReducedMotion() {
  const real = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    ...real(query),
    matches: query.includes('prefers-reduced-motion'),
  })) as typeof window.matchMedia;
  return () => {
    window.matchMedia = real;
  };
}

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

  /**
   * **기본 사업장으로 되돌아와도 확대가 풀리면 안 된다** `[사용자 지적 2026-08-31]`.
   *
   * 판단을 마운트 시점에 붙잡던 판본은 «들어온 순간의 사업장»과 같으면 전국으로 봤다. 첫
   * 방문의 그 값이 `DEFAULT_SITE_ID`(구미)라, 다른 곳을 눌렀다가 **구미를 다시 누르면**
   * 같아져서 확대가 풀렸다 — 열 곳 중 한 곳만 확대되지 않는 셈이다.
   *
   * **도착한 축척을 목표와 맞춘다.** `> 1`만 보면 **전국으로 내려가는 도중**도 참이라 결함을
   * 놓친다 — 처음에 그렇게 썼고 버그를 되살려도 통과했다.
   *
   * 거쳐 가는 사업장은 **경기도**다. 같은 시도를 거치면 세 번째 렌더에서 목표가 그대로라
   * 「움직이지 않았다」와 「제자리로 돌아왔다」가 구분되지 않는다.
   */
  it('다른 사업장을 거쳐 기본 사업장으로 돌아와도 확대가 유지된다', async () => {
    const restore = preferReducedMotion();
    try {
      const { container, rerender } = render(
        <SiteMapPanel sites={SITES} selectedId={DEFAULT_SITE_ID} onSelect={vi.fn()} />,
      );
      expect(zoomedGroup(container)).toBe(false);

      /* 무엇을 누르든 주소에 `?site=`가 박힌다 — 그것이 `siteChosen`이다 */
      rerender(
        <SiteMapPanel sites={SITES} selectedId={IN_GYEONGGI.id} onSelect={vi.fn()} siteChosen />,
      );
      await waitFor(() =>
        expect(mapScale(container)).toBeCloseTo(provinceFocus('경기도').scale, 3),
      );

      rerender(
        <SiteMapPanel sites={SITES} selectedId={DEFAULT_SITE_ID} onSelect={vi.fn()} siteChosen />,
      );
      await waitFor(() =>
        expect(mapScale(container)).toBeCloseTo(provinceFocus('경상북도').scale, 3),
      );
    } finally {
      restore();
    }
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
