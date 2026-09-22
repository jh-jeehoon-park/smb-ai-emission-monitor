// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SITES } from '@/entities/site';
import { SITE_LIST_MAX_HEIGHT } from '../config/constants';
import { SiteList } from './site-list';

/**
 * 좁은 화면의 사업장 고르기 `[사용자 요청 2026-09-18: 첨부 이미지]`.
 *
 * 탭 줄을 대신하는 자리라 **고를 수 있는 곳이 줄어들면 안 된다** — 열 곳 중 한 곳도 닿지
 * 못하게 되는 것이 이 배치의 유일한 큰 위험이다(「전체 사업장 보기」를 두지 않기로 했으므로
 * 접어 둘 곳이 없다).
 */
afterEach(cleanup);

const draw = (selectedId = SITES[1]!.id, onSelect = vi.fn()) => {
  render(<SiteList sites={SITES} selectedId={selectedId} onSelect={onSelect} />);
  return onSelect;
};

describe('사업장 목록', () => {
  /** 열 곳이 전부 닿아야 한다 — 고른 한 곳은 카드로, 나머지는 줄로 */
  it('고른 곳은 카드에, 나머지는 전부 줄로 나온다', () => {
    draw(SITES[1]!.id);

    const rows = screen.getByRole('group', { name: '사업장 선택' }).children;
    expect(rows.length).toBe(SITES.length - 1);
    expect(screen.getByText('현재 선택 사업장')).toBeInTheDocument();
    expect(screen.getByText(SITES[1]!.name)).toBeInTheDocument();
  });

  /** 고른 곳이 목록에도 있으면 같은 것을 두 번 세는 셈이다 */
  it('고른 곳은 목록에 다시 나오지 않는다', () => {
    draw(SITES[1]!.id);

    const rows = [...screen.getByRole('group', { name: '사업장 선택' }).children];
    /* `toContain`은 비대칭 matcher를 보지 않아 그냥 통과한다 — 직접 훑는다 */
    expect(rows.some((r) => (r.textContent ?? '').includes(SITES[1]!.name))).toBe(false);
  });

  it('줄을 누르면 그 사업장을 고른다', () => {
    const onSelect = draw(SITES[1]!.id);

    fireEvent.click(screen.getByRole('button', { name: new RegExp(SITES[0]!.name) }));

    expect(onSelect).toHaveBeenCalledWith(SITES[0]!.id);
  });

  /**
   * **「전체 사업장 보기」를 두지 않는다** `[사용자 요청 2026-09-18]`. 열 곳을 전부 적으므로
   * 더 볼 것이 없고, 그 버튼을 두면 나머지가 한 번 더 눌러야 닿는 자리로 내려간다.
   */
  it('「전체 사업장 보기」를 두지 않는다', () => {
    draw();
    expect(screen.queryByText(/전체 사업장 보기/)).toBeNull();
  });

  /**
   * **두절은 등급이 아니라 수신 상태다** — 등급색을 쓰면 「정상」의 한 종류로 읽힌다.
   * `site-wallboard`가 세운 표기를 그대로 따른다.
   */
  it('통신 두절은 등급색이 아니라 중립면에 적는다', () => {
    const outage = SITES.find((s) => s.status === null);
    expect(outage, '두절 사업장이 fixture에 없다').toBeDefined();

    draw(SITES[1]!.id);

    const badge = screen.getByText('통신 두절');
    expect(badge.className).toContain('bg-surface-3');
  });

  /** 알약 26px이 손가락 최소를 밑돌던 것을 이 배치가 고친 것이므로, 그 값을 잠근다 */
  it('한 줄의 실높이가 44px을 채운다', () => {
    draw();
    const row = screen.getByRole('group', { name: '사업장 선택' }).firstElementChild!;
    /* jsdom은 레이아웃을 재 주지 않으므로 여백 값으로 확인한다 — `py-3`(24) + 줄높이 20 */
    expect(row.className).toContain('py-3');
  });
});

/**
 * **흰 면 위에 산다** `[사용자 지적 2026-09-18: 이미지랑 영역 색상이 차이가 남]`.
 *
 * 구역이 회색면(`--section-bg`)이라 면을 걷으면 줄이 회색 위에 뜨고, **고른 곳의
 * `--accent-weak`(#ecf0f7)가 그 회색(#e9eef4)에 묻혀** 「고른 것」이라는 뜻이 사라진다.
 */
describe('사업장 목록 — 흰 면', () => {
  it('구역면 위에 자기 카드 면을 갖는다', () => {
    draw();
    const root = screen.getByText('현재 선택 사업장').closest('div')!.parentElement!.parentElement!;

    expect(root.className).toContain('bg-surface');
    expect(root.className).toContain('rounded-panel');
    expect(root.className).toContain('border-card-border');
  });
});

/**
 * **세 줄만 보이고 나머지는 상자 안에서 밀린다** `[사용자 요청 2026-09-18: 사업장이 3개
 * 이상일 때는 스크롤]`.
 *
 * 아홉 줄을 모두 펴면 그것만 420px이라 구역 머리가 다시 부풀어, 탭 줄을 걷어 낸 이유가
 * 되돌아간다. jsdom은 높이를 재 주지 않으므로 **상한과 산술**을 잠근다.
 */
describe('사업장 목록 — 세 줄 창', () => {
  it('상한이 세 줄의 실높이다', () => {
    const px = Number(/max-h-\[(\d+)px\]/.exec(SITE_LIST_MAX_HEIGHT)?.[1]);
    /* 첫 줄 46 + 구분선을 얹은 둘째·셋째 47씩 (실측) */
    expect(px).toBe(46 + 47 + 47);
  });

  it('상자가 그 상한에서 스스로 넘긴다', () => {
    draw();
    const box = screen.getByRole('group', { name: '사업장 선택' });

    expect(box.className).toContain(SITE_LIST_MAX_HEIGHT);
    expect(box.className).toContain('overflow-y-auto');
    /* 없으면 상자 끝에서 스크롤이 페이지로 넘어가 목록을 넘기다 화면이 함께 튄다 */
    expect(box.className).toContain('overscroll-contain');
  });

  /**
   * **개수를 적는 이유는 스크롤이 보이지 않기 때문이다.** 휴대폰의 겹침 스크롤바는 만지기
   * 전까지 뜨지 않아 넷째 줄이 있다는 사실 자체가 화면에 없다.
   */
  it('머리글이 상자 안에 몇 곳이 있는지 말한다', () => {
    draw(SITES[1]!.id);
    expect(screen.getByText(`다른 사업장 ${SITES.length - 1}곳`)).toBeInTheDocument();
  });

  /**
   * 상한만 주고 «셋 이상일 때만»을 따로 가르지 않는다 — 남는 곳이 셋 이하면 내용이 상한보다
   * 짧아 스크롤바가 저절로 뜨지 않는다. 조건을 코드로 또 적으면 같은 규칙이 두 곳에 산다.
   */
  it('남는 곳이 적어도 상자는 같은 하나다', () => {
    const three = SITES.slice(0, 3);
    render(<SiteList sites={three} selectedId={three[0]!.id} onSelect={vi.fn()} />);

    const box = screen.getByRole('group', { name: '사업장 선택' });
    expect(box.children.length).toBe(2);
    expect(box.className).toContain(SITE_LIST_MAX_HEIGHT);
  });
});

/**
 * **PC는 한 픽셀도 달라지지 않아야 한다** `[사용자 요청 2026-09-18]`.
 *
 * 폭을 렌더 중에 물으면 하이드레이션이 깨지므로 두 벌을 모두 그리고 CSS가 고른다. 그런데
 * 목록을 띠의 **형제**로 두면 `space-y-3`이 탭 줄을 «마지막»에서 밀어내며 없던 12px을 줘
 * **PC 띠가 118 → 130px로 자랐다**(실측). 한 겹으로 묶어야 그 일이 없다 — 그 겹이 사라지는
 * 되돌림을 여기서 막는다.
 */
describe.each([
  ['통합 관제', 'src/widgets/dashboard/ui/dashboard-view.tsx'],
  ['이상 탐지', 'src/widgets/anomaly-view/ui/anomaly-view.tsx'],
  ['관내 감독 현황', 'src/widgets/jurisdiction-view/ui/jurisdiction-view.tsx'],
])('%s — 폭으로 갈리고 PC는 그대로', (_name, path) => {
  const source = readFileSync(path, 'utf8');
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

  it('파일을 실제로 읽었다', () => {
    expect(code).toContain('<SiteList');
  });

  it('탭 줄은 `lg` 이상, 목록은 그 아래에서만 보인다', () => {
    expect(code).toMatch(/<SiteTabs[\s\S]*?className="hidden lg:flex"/);
    expect(code).toMatch(/<SiteList[\s\S]*?className="lg:hidden"/);
  });

  /** 둘 사이에 닫는 태그만 있어야 한다 — 형제로 흩어지면 띠의 자식 수가 늘어난다 */
  it('둘이 한 겹 안에 묶여 있다', () => {
    const between = code.slice(code.indexOf('<SiteTabs'), code.indexOf('<SiteList'));
    expect(between).not.toContain('</div>');
    expect(code).toMatch(/<div>\s*<SiteTabs/);
  });
});
