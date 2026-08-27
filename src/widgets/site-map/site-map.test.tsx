// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GOV_MUNICIPALITY } from '@/entities/user';
import { SITES, sitesIn } from '@/entities/site';
import { SiteMapPanel } from './index';

const ANDONG = sitesIn(GOV_MUNICIPALITY);
/** 관할이 속한 시도. 지도가 그리는 도형이 이것이다 */
const GOV_PROVINCE = ANDONG[0]!.province;

/** 도형마다 3D 층·면이 겹쳐 그려진다 — 이름 라벨 수로 센다 */
function shapeCount(container: HTMLElement): number {
  return container.querySelectorAll('text').length;
}

function renderJurisdiction() {
  return render(
    <SiteMapPanel
      sites={ANDONG}
      selectedId="S-01"
      onSelect={vi.fn()}
      municipality={GOV_MUNICIPALITY}
    />,
  );
}

/**
 * **관할 지도는 그 관할이 속한 시도 한 장을 그리고 핀만 관내로 좁힌다**
 * `[사용자 결정 2026-08-26]`.
 *
 * 한때 시·군·구 경계를 구워 관할 도형만 그렸는데 **낯선 형태가 홀로 떠 어디인지 읽히지
 * 않았다.** 그 방식은 뷰박스를 통째로 바꿔야 해서 화면 상수를 되돌리는 자리가 늘었고,
 * 그중 둘을 놓쳐 지도가 사라지고 툴팁이 6배가 됐다. 시도 도형은 눈에 익고 확대도
 * 기존 경로(`provinceFocus`)로 끝난다.
 */
describe('관할 지도', () => {
  it('관할이 속한 시도 한 장만 그린다', () => {
    const { container } = renderJurisdiction();
    expect(shapeCount(container)).toBe(1);
  });

  it('전국 지도는 시도를 여럿 그린다 — 관할 모드와 대비된다', () => {
    const { container } = render(
      <SiteMapPanel sites={SITES} selectedId="S-01" onSelect={vi.fn()} />,
    );
    expect(shapeCount(container)).toBeGreaterThan(1);
  });

  /** 관할 밖 사업장이 핀으로 찍히면 범위 정의가 무너진다 */
  it('핀은 관내 사업장만 찍는다', () => {
    const { container } = renderJurisdiction();
    /* 잡기 영역이 핀마다 하나씩 있다 */
    expect(container.querySelectorAll('circle[fill="transparent"]')).toHaveLength(ANDONG.length);
    expect(ANDONG.length).toBeLessThan(SITES.length);
  });

  /**
   * **면은 시도인데 관할은 시·군·구다.** 그 어긋남을 글이 메워야 한다 — 없으면
   * 경상북도 전체가 관할로 읽힌다(경북에는 6개소가 있고 관할은 안동 2곳이다).
   */
  it('면과 관할이 다르다는 사실을 글로 적는다', () => {
    renderJurisdiction();
    expect(screen.getByText(GOV_PROVINCE)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`관할 ${GOV_MUNICIPALITY}`))).toBeInTheDocument();
    expect(screen.getByText(/관할 밖 사업장은 표시하지 않습니다/)).toBeInTheDocument();
  });

  it('그림 대체 설명도 시도와 관할을 함께 적는다', () => {
    const { container } = renderJurisdiction();
    const label = container.querySelector('svg[role="img"]')!.getAttribute('aria-label')!;
    expect(label).toContain(GOV_PROVINCE);
    expect(label).toContain(GOV_MUNICIPALITY);
    expect(label).toContain('관할 밖 사업장은 표시하지 않습니다');
  });

  /** 고를 지역이 하나뿐이고 문구도 `전국`이라 관할 화면에서는 거짓이 된다 */
  it('관할 모드에는 시도 확대 줄이 없다', () => {
    renderJurisdiction();
    expect(screen.queryByRole('group', { name: '지도 확대 지역' })).toBeNull();
  });

  /**
   * 관내가 비면 어느 시도를 그릴지 알 수 없다 — **전국 지도로 떨어뜨리지 않는다.**
   * 관할 밖 사업장이 보이는 것이 이 역할에서는 그리기 문제가 아니라 범위 문제다(R19).
   */
  it('관내에 사업장이 없으면 지도를 그리지 않고 사유를 적는다', () => {
    const { container } = render(
      <SiteMapPanel sites={[]} selectedId="S-01" onSelect={vi.fn()} municipality="없는시" />,
    );
    expect(container.querySelector('svg')).toBeNull();
    expect(screen.getByText(/0개소는 오류가 아닙니다/)).toBeInTheDocument();
  });
});
