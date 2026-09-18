// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

/**
 * 헤더의 **수신 점** `[사용자 요청 2026-09-18: 모바일 헤더 반응형]`.
 *
 * 헤더에 문구를 그대로 펴던 것(`계측 서버 수신 중 · 1분 주기`, 142px)을 점 하나로 줄였다.
 * 줄여도 잃는 것이 적은 이유는 **실패를 본문 `TelemetryNotice`가 크게 말하기 때문**이고,
 * 그래서 이 점이 지켜야 하는 것은 셋이다.
 *
 * 1. **색만으로 나르지 않는다**(§8 `접근성`) — 정상은 채운 점 + 파동, 나머지는 속 빈 원
 * 2. **누르면 글로 말한다** — 터치에서도 열려야 한다(그래서 Radix Tooltip이 아니다)
 * 3. **어느 사업장의 수신인가** — 선택기가 헤더를 떠나 그 자리가 비었다
 *
 * 마크업이 아니라 **보이는 것**을 본다 — 클래스 이름을 바꿔도 뜻이 같으면 통과해야 하고,
 * 반대로 클래스가 남아 있어도 상태 갈래가 무너지면 잡아야 한다.
 */
const series = vi.hoisted(() => ({
  current: { status: 'live' as string, failure: null as string | null, intervalSeconds: 60 },
}));
const site = vi.hoisted(() => ({
  current: { name: '구미 염색 2공장', region: '경북 구미', online: true },
}));

vi.mock('@/entities/measurement', () => ({
  TELEMETRY_STATUS_LABELS: { live: '계측 서버 수신 중' },
  intervalLabel: (s: number) => (s >= 60 ? `${s / 60}분` : `${s}초`),
  telemetrySourceLabel: (status: string) => (status === 'fallback' ? '내장 데이터' : '수신 확인 중'),
  useSiteSeries: () => series.current,
}));
vi.mock('@/entities/site', () => ({ getSite: () => site.current }));
vi.mock('@/features/site-selection', () => ({ useSelectedSiteId: () => ({ siteId: 'S-02' }) }));

const { ReceiveIndicator } = await import('./receive-indicator');

function draw(next: Partial<typeof series.current>, online = true) {
  series.current = { status: 'live', failure: null, intervalSeconds: 60, ...next };
  site.current = { ...site.current, online };
  return render(<ReceiveIndicator />);
}

/** 점은 장식이라 `aria-hidden`이다 — 마크업으로 찾되 «무엇을 뜻하는가»는 글자로 검사한다 */
const dot = (root: HTMLElement) => root.querySelector('button > span') as HTMLElement;

afterEach(cleanup);

describe('수신 점 — 색 말고도 갈린다', () => {
  it('정상이면 채운 점이 파동과 함께 돈다', () => {
    const { container } = draw({ status: 'live' });
    expect(dot(container).className).toContain('live-pulse');
  });

  /**
   * **파동은 «지금 받고 있다»는 뜻이다.** 폴백·두절에도 돌면 화면이 거짓을 말한다 —
   * 내장 데이터를 보고 있는데 서버가 살아 있다고 읽힌다.
   */
  it.each([
    ['폴백', { status: 'fallback' as const }, true],
    ['두절', { status: 'live' as const }, false],
  ])('%s이면 파동이 돌지 않고 속이 빈다', (_label, next, online) => {
    const { container } = draw(next, online);
    expect(dot(container).className).not.toContain('live-pulse');
    expect(dot(container).className).toContain('border');
  });

  /**
   * 정상일 때 `text-normal-ink`가 남아야 한다 — `.live-pulse::before`가
   * `background: currentColor`라, 색 클래스를 걷으면 **파동이 검게 뜬다.**
   */
  it('정상일 때 글자색이 남아 파동이 그 색을 쓴다', () => {
    const { container } = draw({ status: 'live' });
    expect(container.querySelector('button')!.className).toContain('text-normal-ink');
  });
});

describe('수신 점 — 누르면 글로 말한다', () => {
  /** 두절과 폴백은 색이 다르지만, 그 구분을 나르는 것은 **글자**다 */
  it.each([
    ['정상', {}, true, '계측 서버 수신 중 · 1분 주기'],
    ['폴백', { status: 'fallback' as const }, true, '내장 데이터'],
    ['두절', {}, false, '수신 두절'],
  ])('%s 상태가 버튼 이름에 들어 있다', (_label, next, online, text) => {
    draw(next, online);
    expect(screen.getByRole('button').getAttribute('aria-label')).toBe(`수신 상태 — ${text}`);
  });

  /**
   * **터치에서도 열려야 한다.** Radix Tooltip은 호버·포커스로만 열려 좁은 화면에서 무용지물이라
   * 쓰지 않았다 — 눌러서 열리는지가 그 판단이 살아 있는지를 말한다.
   */
  it('누르면 상태와 사업장 이름이 글자로 뜬다', () => {
    draw({});
    expect(screen.queryByText(/구미 염색 2공장/)).toBeNull();

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText('계측 서버 수신 중 · 1분 주기')).toBeTruthy();
    /* 선택기가 헤더를 떠나 «지금 어느 사업장인가»가 헤더에서 사라졌다 — 이 줄이 메운다 */
    expect(screen.getByText(/구미 염색 2공장 · 경북 구미/)).toBeTruthy();
  });

  it('다시 누르면 닫힌다', () => {
    draw({});
    const button = screen.getByRole('button');

    fireEvent.click(button);
    fireEvent.click(button);

    expect(screen.queryByText(/구미 염색 2공장/)).toBeNull();
  });
});
