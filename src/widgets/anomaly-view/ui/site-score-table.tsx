'use client';

import { ChevronRight } from 'lucide-react';
import { STATUS_VISUAL, statusInk } from '@/shared/config/status-visual';
import { cn } from '@/shared/lib/cn';
import { BADGE_BASE } from '@/shared/ui/badge';
import { CountUp } from '@/shared/ui/motion';
import { Sparkline } from '@/shared/ui/sparkline';
import { StatusBadge } from '@/shared/ui/status-badge';
import { TABLE_HEAD_ROW } from '@/shared/ui/table';
import type { Site } from '@/entities/site';

interface SiteScoreTableProps {
  /** 이미 정렬된 목록. 순위 숫자는 이 순서를 그대로 쓴다 */
  sites: Site[];
  selectedId: string;
  /** 고르고 **아래 구역까지 데려간다** — 표만 바뀌면 무엇이 일어났는지 화면에 보이지 않는다 */
  onSelect: (id: string) => void;
  spark: (id: string) => (number | null)[];
}

/**
 * 전 사업장 이상 점수 — **표로 낸다** `[사용자 지시 2026-08-24]`.
 *
 * 통합 관제의 요약 카드와 같은 격자를 썼던 판본은 두 화면이 구분되지 않았다. 같은 값을 두 번
 * 보여 주는 것이 아니라 **읽는 방식이 다르다는 것**을 형태로 말해야 한다 — 저쪽은 훑는 개요라
 * 카드가 맞고, 이쪽은 상세 화면이라 순위·점수·추세를 **줄로 비교**하는 표가 맞다.
 *
 * 표라서 얻는 것: 순위 숫자가 열로 서고, 점수가 오른쪽 정렬로 자릿수를 맞추며, 추세선이 같은
 * 폭의 칸에 놓여 열 방향으로 비교된다. 카드 격자에서는 그 세 가지가 모두 흩어졌다.
 *
 * **줄 아무 데나 누르면** 아래 구역이 그 사업장으로 바뀐다 `[사용자 지시 2026-08-25]`.
 * `<tr>`에는 "누를 수 있는 줄"이라는 역할이 없으므로 그것만으로는 마우스 밖에 길이 없다 —
 * 그래서 오른쪽 `상세` 버튼을 남긴다. **줄 클릭은 편의, 버튼이 정식 조작**이다.
 */
export function SiteScoreTable({ sites, selectedId, onSelect, spark }: SiteScoreTableProps) {
  return (
    /*
     * **열마다 폭을 못박는다** `[사용자 지시 2026-08-24: 두 줄로 내려가지 않게]`.
     *
     * `table-fixed`가 아니면 브라우저가 내용으로 폭을 정해, 사업장 이름이 긴 줄에서만 다른
     * 열이 좁아지고 등급 뱃지나 헤더 글자가 두 줄로 접혔다 — 줄마다 열 위치가 어긋난다.
     *
     * **추세 열은 280px, 그래프는 그 안에서 좌우 40px을 비운다** `[사용자 지시 2026-08-24]` —
     * 200px 그래프가 칸 가운데에 놓인다. 여백이 없던 판본은 선이 칸 경계에 닿아 옆 열의 숫자와
     * 붙어 보였다.
     *
     * 남는 자리는 **사업장 이름**이 받는다(폭을 비워 둔 유일한 열이다). 좁아지면 `min-w`(880px)
     * 에서 멈추고 가로 스크롤한다 — 열을 접으면 비교라는 목적이 사라진다. 880 = 고정 5열(756) +
     * 이름 최소 124px.
     */
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] table-fixed border-separate border-spacing-0 text-center text-[12px]">
        <caption className="sr-only">
          사업장별 이상 점수 — 점수 높은 순, 최근 24시간 추세 포함
        </caption>
        <thead>
          <tr className={TABLE_HEAD_ROW}>
            <th scope="col" className="w-[52px] px-3 py-3 text-center">
              순위
            </th>
            <th scope="col" className="px-3 py-3 text-center">
              사업장
            </th>
            {/* 업종·지역을 이름 아래 붙이지 않고 **한 열로 낸다** `[사용자 지시 2026-08-24]` */}
            <th scope="col" className="w-[156px] px-3 py-3 text-center">
              업종 · 지역
            </th>
            <th scope="col" className="w-[92px] px-3 py-3 text-center">
              등급
            </th>
            <th scope="col" className="w-[76px] px-3 py-3 text-center">
              점수
            </th>
            <th scope="col" className="w-[280px] px-3 py-3 text-center">
              최근 24시간 추세
            </th>
            {/* 열 이름이 있어야 그 칸의 버튼들이 무엇을 하는 묶음인지 읽힌다 */}
            <th scope="col" className="w-[96px] px-3 py-3 text-center">
              상세
            </th>
          </tr>
        </thead>
        <tbody>
          {sites.map((site, index) => {
            const selected = site.id === selectedId;
            const visual = site.status ? STATUS_VISUAL[site.status] : null;

            return (
              <tr
                key={site.id}
                onClick={() => onSelect(site.id)}
                className={cn(
                  'cursor-pointer',
                  '[&>*]:border-b [&>*]:border-border [&>*]:transition-colors [&>*]:duration-200',
                  /*
                   * **줄 전체가 눌린다** `[사용자 지시 2026-08-25]`. 칸마다 눌리는 곳을 찾지 않고
                   * 줄 아무 데나 누르면 아래 구역이 그 사업장으로 바뀐다.
                   *
                   * hover는 칸 배경을 한 단 올리고, 누르는 동안(`active`)은 한 단 더 내린다 —
                   * 눌렀다는 것이 손을 떼기 전에 보인다.
                   *
                   * **키보드·보조기술 경로는 오른쪽 `상세` 버튼이 맡는다.** `<tr>`에는
                   * "누를 수 있는 줄"이라는 역할이 없어 클릭만 걸면 마우스 밖에서는 길이 없다 —
                   * 줄 클릭은 편의이고 그 줄의 **정식 조작은 버튼**이다.
                   */
                  selected
                    ? '[&>*]:bg-accent-weak'
                    : 'hover:[&>*]:bg-surface-2 active:[&>*]:bg-surface-3',
                )}
              >
                <td className="num px-3 py-3 text-center text-fg-subtle">{index + 1}</td>

                {/* 이 열이 표의 주어다 — 다른 칸(12px)보다 한 단 크고 굵다 */}
                <th scope="row" className="px-3 py-3 text-center">
                  <span
                    className={cn(
                      'block max-w-full truncate text-[13px]',
                      selected ? 'font-bold text-accent' : 'font-semibold text-fg',
                    )}
                  >
                    {site.name}
                  </span>
                </th>

                <td className="truncate px-3 py-3 text-fg-muted">
                  {site.industry} · {site.region}
                </td>

                <td className="px-3 py-3">
                  {site.status ? (
                    <StatusBadge level={site.status} />
                  ) : (
                    /* 통신 두절은 등급이 아니라 수신 상태다 — 등급 팔레트를 쓰지 않는다 */
                    <span className={`${BADGE_BASE} bg-surface-3 text-fg-muted`}>통신 두절</span>
                  )}
                </td>

                <td
                  className="num px-3 py-3 text-center text-[15px] font-bold"
                  style={{ color: visual ? statusInk(visual) : 'var(--fg-subtle)' }}
                >
                  {/* 값이 없으면 0으로 채우지 않는다(E4) */}
                  {site.anomalyScore === null ? '—' : <CountUp value={site.anomalyScore} />}
                </td>

                {/* 좌우 40px을 비운다 — 선이 칸 경계에 닿으면 옆 열 숫자와 붙어 보인다 */}
                <td className="px-10 py-2">
                  <Sparkline
                    values={spark(site.id)}
                    color={visual ? visual.hex : 'var(--missing)'}
                    width={200}
                    height={36}
                    strokeWidth={2}
                    fluid
                    fill
                  />
                </td>

                {/*
                 * **줄마다 상세 보기 버튼을 둔다** `[사용자 지시 2026-08-24]`.
                 * 사업장명도 같은 일을 하지만(두 입구, 한 동작) 이름은 글자라 누를 수 있다는 것이
                 * 약하다 — 화살표가 붙은 버튼이 그 줄에서 무엇을 할 수 있는지 말한다.
                 */}
                <td className="px-3 py-3 text-center">
                  <button
                    type="button"
                    /* 줄에도 클릭이 걸려 있다 — 막지 않으면 같은 선택이 두 번 돈다 */
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect(site.id);
                    }}
                    aria-label={`${site.name} 상세 보기`}
                    className={cn(
                      'mx-auto flex cursor-pointer items-center gap-0.5 rounded-chip py-0.5 pl-1.5 pr-0.5',
                      'transition-colors duration-200 hover:bg-accent-weak hover:text-accent',
                      selected ? 'text-accent' : 'text-fg-subtle',
                    )}
                  >
                    상세
                    <ChevronRight aria-hidden size={14} strokeWidth={2} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
