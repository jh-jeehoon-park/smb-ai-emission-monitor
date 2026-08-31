'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { STATUS_VISUAL, statusInk } from '@/shared/config/status-visual';
import { cn } from '@/shared/lib/cn';
import { BADGE_BASE } from '@/shared/ui/badge';
import { MeterBar } from '@/shared/ui/meter-bar';
import { StatusBadge } from '@/shared/ui/status-badge';
import { VALUE_LG } from '@/shared/ui/type-scale';
import { CountUp, RiseItem, StaggerGroup } from '@/shared/ui/motion';
import type { Site } from '@/entities/site';

interface SiteWallboardProps {
  sites: Site[];
  /** 카드를 눌렀을 때. 화면마다 하는 일이 다르다 — 알람 열기 · 사업장 고르기 */
  onCardClick: (id: string) => void;
  /** 버튼의 접근 이름. 무엇이 일어나는지를 적는다 */
  cardLabel: (site: Site) => string;
  /** 카드 아래 줄. 화면마다 담는 것이 다르다 — 알람 건수 · 추세선 */
  renderFooter: (site: Site) => ReactNode;
  /**
   * 고른 카드에 표시를 준다. **누르면 고르는 화면에서만 넘긴다** —
   * 누르면 모달이 열리는 화면에서 강조를 주면 카드가 선택된 것처럼 보인다.
   */
  selectedId?: string;
  /** 팝업을 여는 화면에서만 붙인다 */
  hasPopup?: boolean;
  /**
   * 카드마다 **그 사업장의 상세로 가는 링크**. 넘기지 않으면 화살표만 둔다.
   *
   * 카드 본체와 **다른 목적지**라서 따로 받는다 — 통합 관제의 본체는 알람 모달을 열고
   * 이 링크는 화면을 옮긴다. 주소는 부르는 쪽이 `useSiteHref(href, siteId)`로 만든다
   * (여기서 `?site=`를 이어 붙이면 `scope`·`municipality`가 날아간다, §8 `상세 이동` ②).
   */
  detailHref?: (site: Site) => string;
}

/**
 * 사업장 카드 격자. 다사업장 통합 관제(FR-31~33)를 한 화면에 압축한 요소다.
 * 관제실 월보드처럼 전체를 훑고 이상한 곳으로 바로 들어가는 것이 목적이다.
 *
 * **두 화면이 같은 격자를 쓰고 담는 것만 다르다** `[사용자 지시 2026-08-24]` —
 * 통합 관제는 미확인 알람 건수를, 이상 탐지는 추세선을 아래 줄에 둔다. 격자·카드·점수·
 * 등급 뱃지는 같은 코드다: 두 벌로 만들면 한쪽만 고쳐져 같은 카드가 화면마다 달라진다.
 */
export function SiteWallboard({
  sites,
  onCardClick,
  cardLabel,
  renderFooter,
  selectedId,
  hasPopup = false,
  detailHref,
}: SiteWallboardProps) {
  const { trackRef, page, pages, goTo, onScroll } = useCardPager(sites.length);

  /* 몇 장이 보이는지는 뷰포트가 아니라 이 상자가 받은 폭을 따른다 — 레일이 넓어지면 알아서 줄어든다 */
  return (
    <div className="@container">
      {/*
       * **화살표는 판(Panel)의 바깥 테두리에 걸터앉는다** `[사용자 지시 2026-08-25]`.
       *
       * 아래 한 줄에 모아 두었던 판본은 조작이 카드에서 멀어 "이 줄을 넘긴다"가 잘 읽히지
       * 않았다. 판의 테두리를 반씩 물면 **무엇을 넘기는 것인지**가 자리로 말해진다.
       *
       * 자리는 두 걸음이다 — `-ml-5`가 트랙 가장자리에서 판 테두리까지(안쪽 여백 20px) 밀고,
       * `-translate-x-1/2`가 그 선 위에 단추의 가운데를 얹는다. 판에는 `overflow-hidden`이
       * 없어 밖으로 나온 절반(14px)이 잘리지 않고, 그 절반은 본문 좌우 여백(16~24px) 안에
       * 떨어진다 — 390px에서도 화면을 넘지 않는다.
       *
       * 트랙 **바깥**에 두어야 한다 — 안에 두면 스크롤 상자의 내용이라 카드와 함께 밀려 나간다.
       */}
      <div className="relative">
        <StaggerGroup>
          {/*
           * **한 줄로 세우고 옆으로 넘긴다** `[사용자 지시 2026-08-25]`. 기본은 네 장이다.
           *
           * 줄바꿈하던 격자는 열 장이 두 줄로 쌓여 카드 하나하나가 아니라 **덩어리**로 보였다.
           * 한 줄이면 눈이 왼쪽에서 오른쪽으로 한 번만 지나가고, 나머지는 넘겨서 본다.
           *
           * 넘기는 방법을 셋 다 남긴다 — 화살표·인디케이터·손가락(트랙 자체가 스크롤 상자다).
           * 스크롤바는 감춘다: 인디케이터가 같은 것을 더 정확히 말하고, 막대까지 있으면
           * 같은 사실이 두 번 그려진다.
           *
           * `snap`이 카드 경계에 세워 준다 — 넘긴 뒤 카드가 반쯤 잘려 서는 일이 없다.
           * `py-2 -my-1`은 hover 그림자의 자리다 — `overflow-x`는 세로도 함께 자르므로
           * (CSS 규정) 여백이 없으면 떠오른 카드의 아래 그림자가 잘린 선으로 남는다.
           * 8px을 안에서 벌고 4px을 밖에서 되돌려, 격자였을 때와 **자리가 거의 같다**.
           */}
          <div
            ref={trackRef}
            onScroll={onScroll}
            role="group"
            aria-label="사업장 카드"
            className={cn(
              'flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth py-2 -my-1',
              /* 막대를 감춘다 — 두 브라우저 계열이 방법이 달라 둘 다 적는다 */
              '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
              'motion-reduce:scroll-auto',
            )}
          >
            {sites.map((site) => {
              const visual = site.status ? STATUS_VISUAL[site.status] : null;
              const selected = selectedId === site.id;

              return (
                /*
                 * **한 화면에 몇 장인가**를 카드 폭으로 정한다 — 기본 4장, 좁아지면 3·2·1장.
                 * 값은 `(100% - 사이 간격 합) / 장수`이고 간격은 `gap-3`(0.75rem)이다.
                 * `GAP_PX`가 같은 값을 숫자로 갖는다 — 한쪽만 바꾸면 인디케이터 칸 수가 어긋난다.
                 *
                 * **5장에서 4장으로 내렸다** `[사용자 결정 2026-08-31]`. 세 칸 짜임(판정·정보·상세)이
                 * 카드 안에서 **163px을 먼저 가져간다**(왼쪽 여백 14 + 판정 열 60 + 사이 12 + 오른쪽
                 * 여백 12 + 세로선 1 + 상세 칸 64). 5장이면 카드가 222px이라 이름에 59px만 남아
                 * 열 곳이 전부 잘렸다.
                 *
                 * **단의 기준은 사업장 이름의 실측 폭이다.** 열 개 중 가장 긴 것이 `수원 전자부품
                 * 세정`·`광주 전자부품 세정` **103px**이고(14px bold, 브라우저에서 쟀다), 여유를
                 * 두어 **이름 칸 112px**를 하한으로 잡으면 카드는 275px 이상이어야 한다 —
                 * 장수를 하나 늘릴 때마다 `275n + 12(n-1)`이 필요하고 그것이 아래 셋이다.
                 *
                 * 뷰포트가 아니라 **이 상자가 받은 폭**으로 묻는다. 사이드바·여백이 먹고 남는
                 * 값이라 1536px 화면에서 상자는 1157px이다.
                 */
                <RiseItem
                  key={site.id}
                  className="shrink-0 basis-full snap-start @[565px]:basis-[calc((100%-0.75rem)/2)] @[850px]:basis-[calc((100%-1.5rem)/3)] @[1140px]:basis-[calc((100%-2.25rem)/4)]"
                >
                  {/*
                    * **카드가 두 곳으로 간다** `[사용자 요청 2026-08-31]` — 본체는 지금까지 하던
                    * 일을(통합 관제는 알람 모달), 오른쪽 칸은 그 사업장의 상세 화면을 연다.
                    *
                    * 그래서 겉이 `<button>`이 아니라 `<div>`다. 버튼 안에 버튼·링크를 넣을 수
                    * 없으므로(유효하지 않은 HTML) 본체를 **카드를 덮는 형제 버튼**으로 깔고
                    * 상세 칸을 그 위에 얹는다 — 흔히 stretched link라 부르는 짜임이다.
                    *
                    * 겹침 순서가 곧 조작의 경계다: 본체 버튼이 `z-[1]`로 내용 위를 덮고,
                    * 상세 칸만 `z-[2]`로 그 위에 선다. 뒤집히면 상세를 눌러도 본체가 먹는다.
                    */}
                  <div
                    /*
                     * **등급색은 면 그라데이션 하나로만 말한다** `[사용자 지시 2026-08-25]` —
                     * *"오른쪽 끝에서 번져 왼쪽으로 사라진다(12%→4%→투명). 색이 닿는 곳이 카드의
                     * 3분의 1뿐이라 이름이 놓인 왼쪽은 흰 면 그대로다."*
                     *
                     * **테두리에도 얹었다가 되돌렸다** `[사용자 요청 2026-08-31 → 되돌림]`. 첨부
                     * 이미지가 테두리를 등급색 17%로 물들이기에 그것을 따라 `--card-border`에 35%를
                     * 섞어 봤는데, 사용자가 **기존 테두리로 되돌리기로 정했다**. 되돌리면서 두
                     * 가지가 함께 풀린다 — ① 인라인 테두리가 클래스를 이겨 **고른 카드의 선택
                     * 테두리를 덮던 문제**(관내 감독에서 무엇을 골랐는지 사라졌다)가 원인째 없어지고
                     * ② hover 테두리(`border-accent/50`)를 되살릴 수 있다. 등급색을 테두리에 두는
                     * 동안에는 hover가 그것을 덮어 가리키는 사이 등급이 사라졌었다.
                     *
                     * 두절은 등급이 아니라 수신 상태라 깔지 않는다(E4) — 회색을 깔면 `정상`과
                     * 같은 축의 한 단으로 읽힌다.
                     */
                    style={
                      visual
                        ? {
                            backgroundImage: `linear-gradient(to left, color-mix(in srgb, ${visual.hex} 12%, transparent), color-mix(in srgb, ${visual.hex} 4%, transparent) 38%, transparent 68%)`,
                          }
                        : undefined
                    }
                    /*
                     * **세 칸이다** `[사용자 요청 2026-08-31: 첨부 이미지]` — 판정(왼쪽) · 무엇인가
                     * (가운데) · 어디로(오른쪽). 예전에는 이름이 왼쪽이고 판정이 가운데였는데,
                     * 카드 열 장을 훑는 목적이 **어디가 위험한가**라 그 답이 맨 왼쪽에 서야
                     * 눈이 한 열만 훑고 지나간다.
                     *
                     * **hover 신호가 세 단이다** `[사용자 지적·결정 2026-08-31]`.
                     *
                     *   그림자      이 카드를 가리키고 있다 (카드 어디든)
                     *   포인트 테두리 이 카드 **본체**를 누르면 열린다
                     *   칸 면·글자   이 **칸**을 누르면 다른 화면으로 간다 (아래 상세 칸)
                     *
                     * 셋으로 가른 이유는 **`:hover`가 자손에서 조상으로 번지기** 때문이다. 테두리를
                     * 카드에 `hover:`로 걸어 두었더니 상세 칸 위에서도 켜져, 알람 모달을 여는 자리와
                     * 화면을 옮기는 자리가 그림으로 갈리지 않았다. 그래서 **테두리만 본체 버튼에
                     * 매단다**(`:has(>button:hover)`) — 상세 칸은 그 버튼의 형제이고 `z-[2]`로 위에
                     * 있어 포인터가 칸에 있으면 `button:hover`가 거짓이 된다. 그림자는 카드에 그대로
                     * 두어 **어느 칸을 가리키든 이 카드가 뜬다.**
                     *
                     * 자식이 조상을 꾸미는 CSS 수단은 `:has()`뿐이다. JS 상태로 가르면 카드 열 장이
                     * hover마다 다시 그려진다. 이 저장소의 첫 `:has()` 사용이다.
                     *
                     * **면은 바꾸지 않는다** — 예전의 `hover:bg-surface-2`는 등급 틴트 위에 회색을
                     * 얹어, 상세 칸에서 지적된 것과 같은 «색이 안 어울린다»를 카드 전체에서 되풀이한다.
                     *
                     * `overflow-hidden`은 오른쪽 상세 칸의 면이 둥근 모서리를 넘지 않게 한다.
                     */
                    className={cn(
                      /* 카드 자신을 컨테이너로 둔다 — 줄바꿈 기준이 격자가 아니라 **이 카드의 폭**이다 */
                      '@container group relative flex h-full w-full items-stretch overflow-hidden rounded-nested border bg-surface text-left',
                      'transition-[border-color,box-shadow] duration-200',
                      selected
                        ? 'border-accent/40 bg-accent-weak'
                        : 'border-border hover:shadow-panel [&:has(>button:hover)]:border-accent/50',
                    )}
                  >
                    {/*
                     * 카드 본체. **내용 위를 덮는다** — 내용은 글이라 눌러도 할 일이 없고,
                     * 덮어 두면 카드의 어디를 눌러도 같은 곳으로 간다. 초점 고리는 이 버튼이
                     * 받으므로 모서리를 카드와 맞춰 고리가 카드를 두른다.
                     */}
                    <button
                      type="button"
                      onClick={() => onCardClick(site.id)}
                      aria-haspopup={hasPopup ? 'dialog' : undefined}
                      aria-pressed={selectedId === undefined ? undefined : selected}
                      aria-label={cardLabel(site)}
                      className="absolute inset-0 z-[1] cursor-pointer rounded-nested"
                    />

                    <div className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-3.5 pr-3">
                      {/*
                       * **판정 한 열** — 등급 뱃지 · 점수 · 막대가 위에서 아래로 선다. 셋은 같은
                       * 값의 세 표현이라 한 덩어리로 읽혀야 한다. 예전에는 이름 오른쪽 가운데에
                       * 점수와 뱃지를 나란히 두었는데 `[사용자 지시 2026-08-25]`, 카드 열 장을
                       * 훑는 목적이 **어디가 위험한가**라 그 답이 맨 왼쪽 한 열에 서는 편이 낫다.
                       *
                       * 폭은 **가장 긴 뱃지**가 정한다(`통신 두절`). 첨부 이미지는 44px인데 그쪽
                       * 라벨은 두 글자(`정상`)뿐이고, 우리는 두절을 등급으로 적지 않으므로
                       * 네 글자가 들어갈 자리가 있어야 한다 — 줄이면 그 말이 등급처럼 짧아져
                       * 같은 축으로 읽힌다(E4).
                       */}
                      <div className="flex w-[60px] shrink-0 flex-col items-center gap-1">
                        {site.status ? (
                          <StatusBadge level={site.status} />
                        ) : (
                          <span className={`${BADGE_BASE} bg-surface-3 text-fg-muted`}>
                            통신 두절
                          </span>
                        )}
                        <span
                          className={`num ${VALUE_LG}`}
                          style={{ color: visual ? statusInk(visual) : 'var(--fg-subtle)' }}
                        >
                          {site.anomalyScore === null ? '—' : <CountUp value={site.anomalyScore} />}
                        </span>
                        {/*
                         * 점수를 길이로도 보인다 — 숫자만으로는 26과 60의 거리가 눈에 안 잡힌다.
                         * **두절에는 그리지 않는다**: 값이 없는데 0 길이를 그리면 «가장 좋음»으로
                         * 읽힌다(E4). 부품은 XAI·주입량 막대와 같은 것을 쓰고 높이만 3px로 낮춘다.
                         */}
                        {site.anomalyScore !== null && visual && (
                          <MeterBar
                            percent={site.anomalyScore}
                            color={statusInk(visual)}
                            className="h-[3px] w-9"
                          />
                        )}
                      </div>

                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate text-[14px] font-bold leading-tight text-fg">
                          {site.name}
                        </span>
                        {renderFooter(site)}
                      </span>
                    </div>

                    {/*
                     * **상세 칸이 카드 한쪽을 통째로 쓴다** `[사용자 요청 2026-08-31: 첨부 이미지]`.
                     *
                     * 칩이던 판본은 이름 줄에 얹혀 있어 카드 안에서 자리를 다퉜다. 세로선으로
                     * 갈라 놓으면 «여기부터는 다른 곳으로 가는 조작»이 자리로 말해진다.
                     *
                     * **면은 반투명 카드면이고 hover는 명도만 움직인다** `[사용자 지적 2026-08-31:
                     * 카드 색상과 어울리지 않는다]`. 세 판본이 같은 이유로 기각됐다 — 불투명
                     * `bg-surface-2`는 등급색 그라데이션이 **가장 진한 자리**를 가려(`to left`라
                     * 오른쪽 끝이 12%다) 초록·붉은 카드에 회색 조각이 붙어 보였고, `bg-accent-weak`
                     * hover는 그 틴트를 파란 틴트로 통째로 갈아 끼웠고, `hover:text-accent`는 카드마다
                     * 등급색이 다른 자리에 **색상 축을 하나 더 얹었다.**
                     *
                     * 그래서 색상 축을 안 쓴다: 면 55%→85% · 글자 `--fg-muted`→`--fg`. 등급 틴트가
                     * hover 동안에도 그대로 흘러 초록 카드는 초록으로 남는다. 첨부 이미지가 흰 면에
                     * #F8FAFC를 얹어 한 단 낮춘 것과 같은 일을, **카드의 색조를 통과시키면서** 한다.
                     * (첨부 이미지의 초록 글자는 그쪽 포인트색이 초록이라서다. 우리에게 초록은
                     * `정상` 등급색이라 조작에 쓸 수 없다 — §8 `포인트색`.)
                     *
                     * **모션으로 대신하지 않는다.** `MotionPreferences`가 `reducedMotion="user"`라
                     * 감속 설정에서는 transform·layout이 꺼지고 끝 상태로 앉는다 — 끝 상태가 달라야
                     * 하는 것은 마찬가지이고, §8도 모션을 «진입 시 1회»로 정한다.
                     */}
                    {detailHref ? (
                      <>
                        <div aria-hidden className="my-auto h-10 w-px shrink-0 bg-border" />
                        <Link
                          href={detailHref(site)}
                          aria-label={`${site.name} 사업장 상세로 이동`}
                          className="relative z-[2] flex w-16 shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 bg-surface/55 text-[12px] font-medium text-fg-muted transition-colors duration-200 hover:bg-surface/85 hover:text-fg"
                        >
                          상세
                          <ChevronRight aria-hidden size={14} strokeWidth={2} />
                        </Link>
                      </>
                    ) : (
                      <ChevronRight
                        aria-hidden
                        size={18}
                        strokeWidth={2}
                        className="mr-3 shrink-0 self-center text-fg-subtle transition-colors duration-200 group-hover:text-accent"
                      />
                    )}
                  </div>
                </RiseItem>
              );
            })}
          </div>
        </StaggerGroup>

        {/* 한 화면에 다 들어오면 넘길 것이 없다 — 화살표도 인디케이터도 두지 않는다 */}
        {pages > 1 && (
          <>
            <PagerArrow
              dir="prev"
              disabled={page <= 0}
              onClick={() => goTo(page - 1)}
              className="left-0 -ml-5 -translate-x-1/2"
            />
            <PagerArrow
              dir="next"
              disabled={page >= pages - 1}
              onClick={() => goTo(page + 1)}
              className="right-0 -mr-5 translate-x-1/2"
            />
          </>
        )}
      </div>

      {pages > 1 && <CardPager page={page} pages={pages} onMove={goTo} />}
    </div>
  );
}

/** `gap-3`의 픽셀 값. 위 `basis` 식과 **같은 간격**을 가리킨다 */
const GAP_PX = 12;

/**
 * 재기 전에 쓰는 장수. 위 `@[1140px]` 분기의 **4장과 같은 값**이다.
 *
 * 서버는 상자 폭을 모르므로 첫 렌더에는 잴 것이 없다. 1로 두면 인디케이터가 없다가
 * 하이드레이션 직후 나타나 화면이 한 번 밀린다 — 넓은 화면(대부분)에서는 이 값이 곧 정답이라
 * 밀림이 없고, 좁은 화면에서만 관측기가 곧바로 고친다. 서버와 첫 클라이언트 렌더가 같은
 * 값을 내므로 hydration도 어긋나지 않는다.
 */
const ASSUMED_PER_VIEW = 4;

/**
 * 옆으로 넘기는 상태.
 *
 * **몇 장이 보이는지를 JS가 정하지 않는다** — CSS가 정한 카드 폭을 **재서** 되짚는다.
 * 분기값(520·860px)을 양쪽에 두면 한쪽만 고쳐져 인디케이터 칸 수가 화면과 어긋난다.
 *
 * 페이지 이동은 `scrollTo`로만 한다. 부드럽게 움직일지는 CSS(`scroll-smooth` ·
 * `motion-reduce:scroll-auto`)가 정하므로 감속 설정도 그쪽 한 곳에서 지켜진다.
 */
function useCardPager(count: number) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(() => Math.max(1, Math.ceil(count / ASSUMED_PER_VIEW)));

  const read = useCallback(() => {
    const el = trackRef.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return null;

    const step = first.offsetWidth + GAP_PX;
    const perView = Math.max(1, Math.round((el.clientWidth + GAP_PX) / step));
    return { el, first, perView, span: step * perView };
  }, []);

  /*
   * 상자 폭이 바뀌면 보이는 장수가 바뀐다. `ResizeObserver`는 붙이는 즉시 한 번 부르므로
   * 첫 측정도 여기서 이루어진다 — 렌더 중에 상태를 넣지 않는다.
   * `count`가 바뀌면 다시 단다: 카드 수가 달라져도 상자 크기는 그대로라 관측기가 울지 않는다.
   */
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      const m = read();
      if (!m) return;
      setPages(Math.max(1, Math.ceil(count / m.perView)));
      setPage(Math.round(el.scrollLeft / m.span));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [count, read]);

  const onScroll = () => {
    const m = read();
    if (m) setPage(Math.round(m.el.scrollLeft / m.span));
  };

  const goTo = (next: number) => {
    const m = read();
    if (!m) return;

    /* 그 묶음의 **첫 카드 자리**로 간다 — 폭으로 계산하면 간격만큼 조금씩 밀린다 */
    const index = Math.min(Math.max(next, 0), pages - 1) * m.perView;
    const card = m.el.children[index] as HTMLElement | undefined;
    if (card) m.el.scrollTo({ left: card.offsetLeft - m.first.offsetLeft });
  };

  return { trackRef, page, pages, goTo, onScroll };
}

/**
 * 인디케이터 — 지금 어느 묶음인지, 모두 몇 묶음인지.
 *
 * **지금 칸만 알약으로 늘어난다** — 색만 다르면 점 다섯 개 중 어느 것이 켜졌는지 멀리서
 * 구분되지 않는다. 색은 포인트색이다(조작과 선택의 색).
 *
 * 화살표는 여기 없다 `[사용자 지시 2026-08-25]` — 판의 바깥 테두리에 걸터앉는다.
 */
function CardPager({
  page,
  pages,
  onMove,
}: {
  page: number;
  pages: number;
  onMove: (next: number) => void;
}) {
  return (
    <div className="mt-3 flex items-center justify-center gap-1.5">
      {Array.from({ length: pages }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onMove(i)}
          aria-label={`${i + 1}번째 묶음 보기`}
          aria-current={i === page ? 'true' : undefined}
          className={cn(
            'h-1.5 cursor-pointer rounded-full transition-[width,background-color] duration-200',
            i === page ? 'w-5 bg-accent' : 'w-1.5 bg-border-strong hover:bg-fg-subtle',
          )}
        />
      ))}
    </div>
  );
}

/**
 * 화살표 한 짝. 헤더의 아이콘 버튼과 같은 크기·모서리를 쓰되 **떠 있는 것**이라
 * 그림자와 불투명한 면을 갖는다(R12) — 판의 테두리를 물고 있어 비치면 두 겹이 겹쳐 읽힌다.
 *
 * **끝에 닿으면 색만 빠진다** `[사용자 지시 2026-08-25]`. 단추 전체를 흐리게 하던 판본은
 * 면·테두리·그림자까지 함께 옅어져 **판 위에서 반쯤 지워진 조각**처럼 보였다. 지금은 겉면을
 * 그대로 두고 **화살표 글리프만** 가라앉는다 — 자리는 그대로 있고 누를 수 없다는 것만 달라진다
 * (아예 감추면 남은 한쪽이 어느 방향인지 매번 다시 찾아야 한다).
 */
function PagerArrow({
  dir,
  disabled,
  onClick,
  className,
}: {
  dir: 'prev' | 'next';
  disabled: boolean;
  onClick: () => void;
  /** 걸터앉을 자리. 좌우 어느 쪽인지는 부르는 쪽이 정한다 */
  className?: string;
}) {
  const Icon = dir === 'prev' ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'prev' ? '이전 사업장 보기' : '다음 사업장 보기'}
      className={cn(
        /* 카드 줄의 세로 가운데. 인디케이터 줄은 이 상자 밖이라 카드 높이만 기준이 된다 */
        'absolute top-1/2 z-10 -translate-y-1/2',
        'inline-flex size-7 shrink-0 items-center justify-center rounded-chip border border-border bg-surface text-fg-muted shadow-panel',
        'transition-colors duration-200',
        disabled
          ? 'cursor-not-allowed'
          : 'cursor-pointer hover:border-accent/50 hover:bg-accent-weak hover:text-accent',
        className,
      )}
    >
      {/* 흐려지는 것은 글리프뿐이다 — 면·테두리·그림자는 누를 때와 같다 */}
      <Icon
        aria-hidden
        size={16}
        strokeWidth={2}
        className={cn('transition-opacity duration-200', disabled && 'opacity-40')}
      />
    </button>
  );
}
