// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { PROVISIONAL_STATUS_LABELS } from '@/shared/config/provisional';
import { SITES } from '@/entities/site';
import { SiteScoreTable } from './site-score-table';

/**
 * 사업장별 이상 점수 — **좁은 화면에서 점수와 등급을 숨기지 않는다**
 * `[사용자 요청 2026-09-21: 나머지 전체 화면 반응형]`.
 *
 * 표는 `min-w-[880px]`이라 390px에서 가로로 밀린다. 그 자체는 규약대로지만, 실측으로
 * **보이는 것이 `순위 · 사업장 · 업종·지역` 세 열뿐이었고 이 표의 주어인 점수와 등급이
 * 564px 오른쪽에 숨어 있었다.** 밀면 나오지만 휴대폰의 겹침 스크롤바는 만지기 전까지
 * 뜨지 않아 그것이 있다는 사실 자체가 화면에 없다.
 */
afterEach(cleanup);

const spark = () => [10, 20, 30];

const draw = (onSelect = vi.fn()) => {
  render(
    <SiteScoreTable sites={SITES} selectedId={SITES[0]!.id} onSelect={onSelect} spark={spark} />,
  );
  return onSelect;
};

/** 두 벌 중 좁은 화면 쪽 — 표가 아니라 목록이다 */
const narrow = () => screen.getByRole('list');

describe('사업장별 이상 점수', () => {
  it('두 벌을 모두 그리고 CSS가 고른다', () => {
    const { container } = render(
      <SiteScoreTable
        sites={SITES}
        selectedId={SITES[0]!.id}
        onSelect={vi.fn()}
        spark={spark}
      />,
    );

    /* 폭을 렌더 중에 물으면 서버가 모르는 값이 마크업에 섞여 하이드레이션이 깨진다 */
    expect(container.querySelector('.hidden.lg\\:block')).not.toBeNull();
    expect(container.querySelector('.lg\\:hidden')).not.toBeNull();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(narrow()).toBeInTheDocument();
  });

  /** 열 곳이 전부 줄로 나와야 한다 — 표와 같은 순서, 같은 순위 */
  it('좁은 화면 목록이 표와 같은 수·같은 순서다', () => {
    draw();
    const rows = within(narrow()).getAllByRole('listitem');

    expect(rows).toHaveLength(SITES.length);
    expect(rows[0]!.textContent).toContain(SITES[0]!.name);
  });

  /**
   * **이 검사가 이번 작업의 본론이다.** 점수와 등급이 좁은 쪽 줄 안에 함께 있어야 한다 —
   * 가로로 밀어야만 보이면 그 값은 화면에 없는 것과 같다.
   */
  it('줄마다 점수와 등급이 함께 있다', () => {
    draw();

    for (const row of within(narrow()).getAllByRole('listitem')) {
      const site = SITES.find((s) => (row.textContent ?? '').includes(s.name));
      expect(site, `줄을 사업장과 맞출 수 없다: ${row.textContent}`).toBeDefined();

      const text = row.textContent ?? '';
      /* 값이 없으면 0으로 채우지 않는다(E4) — 두절은 `—`와 중립 뱃지다 */
      expect(text).toContain(site!.anomalyScore === null ? '—' : String(site!.anomalyScore));
      expect(text).toContain(
        site!.status === null ? '통신 두절' : PROVISIONAL_STATUS_LABELS[site!.status],
      );
    }
  });

  it('줄을 누르면 그 사업장을 고른다', () => {
    const onSelect = draw();
    const rows = within(narrow()).getAllByRole('listitem');
    const target = SITES[3]!;

    within(rows[3]!).getByRole('button').click();

    expect(onSelect).toHaveBeenCalledWith(target.id);
  });

  /**
   * 표에서는 `<tr>` 클릭이 편의이고 `상세` 버튼이 정식 조작이었다. 목록에서는 **줄 자체가
   * 버튼**이라 키보드·보조기술 경로가 그것 하나로 끝난다 — 이름을 잃으면 그 경로가 끊긴다.
   */
  it('줄마다 보조기술이 읽을 이름이 있다', () => {
    draw();
    /* 넓은 쪽 표도 같은 이름의 버튼을 낸다 — 좁은 쪽만 보고 센다 */
    const list = within(narrow());
    for (const site of SITES) {
      expect(list.getByRole('button', { name: `${site.name} 상세 보기` })).toBeInTheDocument();
    }
  });
});
