'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { STATUS_VISUAL, statusInk } from '@/shared/config/status-visual';
import { cn } from '@/shared/lib/cn';
import { BADGE_BASE } from '@/shared/ui/badge';
import { StatusBadge } from '@/shared/ui/status-badge';
import { VALUE_LG } from '@/shared/ui/type-scale';
import { CountUp, RiseItem, StaggerGroup } from '@/shared/ui/motion';
import type { Site } from '@/entities/site';

interface SiteWallboardBase {
  sites: Site[];
  /** 카드의 접근 이름. **무엇이 일어나는지**를 적는다 — 옮기는가 고르는가 */
  cardLabel: (site: Site) => string;
  /** 카드 아래 줄. 화면마다 담는 것이 다르다 — 알람 건수 · 추세선 */
  renderFooter: (site: Site) => ReactNode;
}

/**
 * **카드를 누르면 무엇이 일어나는가.** 두 화면이 서로 배타적이라 프롭도 갈라 둔다 —
 * 한쪽에만 쓰이는 값을 옵션으로 늘어놓으면 «둘 다 주거나 둘 다 안 주는» 호출이 타입을 통과한다.
 *
 * | 화면 | 누르면 | 요소 |
 * |---|---|---|
 * | 통합 관제 | **그 카드의 사업장 상세로 옮긴다** `[사용자 요청 2026-09-15]` | `<a>` |
 * | 관내 감독 | 아래 표·지도의 대상을 **고른다** | `<button>` |
 *
 * 옮기는 쪽이 링크여야 하는 이유는 새 탭·가운데 클릭·주소 복사가 브라우저의 일이기 때문이다.
 * `onClick`으로 `router.push`를 부르면 그 셋이 전부 사라진다.
 */
type SiteWallboardAction =
  | { action: 'link'; cardHref: (site: Site) => string }
  | {
      action: 'select';
      onCardClick: (id: string) => void;
      /** 고른 카드에 표시를 준다. **고르는 화면에만 있다** — 옮기는 카드에 선택 강조를 주면 머무는 것처럼 읽힌다 */
      selectedId?: string;
    };

type SiteWallboardProps = SiteWallboardBase & SiteWallboardAction;

/**
 * 사업장 카드 격자. 다사업장 통합 관제(FR-31~33)를 한 화면에 압축한 요소다.
 * 관제실 월보드처럼 전체를 훑고 이상한 곳으로 바로 들어가는 것이 목적이다.
 *
 * **두 화면이 같은 격자를 쓰고 담는 것만 다르다** `[사용자 지시 2026-08-24]` —
 * 통합 관제는 미확인 알람 건수를, 이상 탐지는 추세선을 아래 줄에 둔다. 격자·카드·점수·
 * 등급 뱃지는 같은 코드다: 두 벌로 만들면 한쪽만 고쳐져 같은 카드가 화면마다 달라진다.
 */
export function SiteWallboard(props: SiteWallboardProps) {
  const { sites, cardLabel, renderFooter } = props;
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
           * **한 줄로 세우고 옆으로 넘긴다** `[사용자 지시 2026-08-25]`. 기본은 다섯 장이다.
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
              const selected = props.action === 'select' && props.selectedId === site.id;
              const inside = <CardInside site={site} visual={visual} renderFooter={renderFooter} />;

              return (
                /*
                 * **한 화면에 몇 장인가**를 카드 폭으로 정한다 — 기본 5장, 좁아지면 3장·2장.
                 * 값은 `(100% - 사이 간격 합) / 장수`이고 간격은 `gap-3`(0.75rem)이다.
                 * `GAP_PX`가 같은 값을 숫자로 갖는다 — 한쪽만 바꾸면 인디케이터 칸 수가 어긋난다.
                 */
                <RiseItem
                  key={site.id}
                  className="shrink-0 basis-[calc((100%-0.75rem)/2)] snap-start @[520px]:basis-[calc((100%-1.5rem)/3)] @[860px]:basis-[calc((100%-3rem)/5)]"
                >
                  {props.action === 'link' ? (
                    /* 고르는 카드가 아니므로 선택 강조가 없다 — 눌러도 이 화면에 머물지 않는다 */
                    <Link
                      href={props.cardHref(site)}
                      aria-label={cardLabel(site)}
                      style={cardTint(visual)}
                      className={cardClass(false)}
                    >
                      {inside}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => props.onCardClick(site.id)}
                      aria-pressed={props.selectedId === undefined ? undefined : selected}
                      aria-label={cardLabel(site)}
                      style={cardTint(visual)}
                      className={cardClass(selected)}
                    >
                      {inside}
                    </button>
                  )}
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
              /*
               * 히트 영역은 **판 안쪽으로만** 넓힌다 — 바깥으로 넓히면 페이지가 가로로 밀린다.
               *
               * **걸터앉는 깊이도 좁은 화면에서 얕다**(20 → 12px). 패널 여백이 좁은 화면에서
               * 16px로 줄자 판 경계가 4px 밖으로 나왔고, 그만큼 화살표가 **뷰포트를 넘었다**
               * (실측: 768px에서 문서가 2px 밀렸다). `lg` 이상은 20px 그대로다.
               */
              className="left-0 -ml-3 -translate-x-1/2 before:-right-2 lg:-ml-5 lg:before:right-0"
            />
            <PagerArrow
              dir="next"
              disabled={page >= pages - 1}
              onClick={() => goTo(page + 1)}
              className="right-0 -mr-3 translate-x-1/2 before:-left-2 lg:-mr-5 lg:before:left-0"
            />
          </>
        )}
      </div>

      {pages > 1 && <CardPager page={page} pages={pages} onMove={goTo} />}
    </div>
  );
}

type StatusVisual = (typeof STATUS_VISUAL)[keyof typeof STATUS_VISUAL];

/**
 * **왼쪽에서 번지는 등급색** `[사용자 지시 2026-08-25: 첨부 이미지 래퍼런스]`.
 *
 * 위에서 아래로 깔았던 판본은 카드 열 장이 늘어서면 격자가 통째로 얼룩졌다.
 * **오른쪽 끝에서 번져 왼쪽으로 사라진다** `[사용자 지시 2026-08-25]` — 색이 닿는
 * 곳이 카드의 3분의 1뿐이라 이름이 놓인 왼쪽은 흰 면 그대로다. 등급을 말하는
 * 점수·뱃지가 오른쪽에 있어 **색이 그 값 뒤에서 번지는** 그림이 된다.
 *
 * 12% → 4% → 투명. 짙은 끝조차 흰 면과 1.08~1.20:1이라 "색이 스며 있다"만
 * 전한다. 그 위의 점수는 등급 잉크색이라 4.1:1 이상이다.
 *
 * 두절은 등급이 아니라 수신 상태라 깔지 않는다(E4) — 회색을 깔면 `정상`과
 * 같은 축의 한 단으로 읽힌다.
 */
function cardTint(visual: StatusVisual | null): CSSProperties | undefined {
  if (!visual) return undefined;
  return {
    backgroundImage: `linear-gradient(to left, color-mix(in srgb, ${visual.hex} 12%, transparent), color-mix(in srgb, ${visual.hex} 4%, transparent) 38%, transparent 68%)`,
  };
}

/**
 * **누르고 싶은 카드로 짠다** `[사용자 지시 2026-08-25]` — 내용은 왼쪽에 모으고
 * 화살표를 오른쪽 끝에 세로 가운데로 붙인다. 목록 행에서 ">"가 오른쪽 끝에 있으면
 * 그 줄을 누른다는 뜻이라는 것을 이미 아는 형태다.
 *
 * **hover는 세 가지가 함께 움직인다** `[사용자 지시 2026-08-25: 조금 더 티나게]` —
 * 테두리가 포인트색으로, 면이 옅은 회색으로, 카드가 그림자로 떠오른다.
 * 테두리만 진해지던 판본은 카드가 눌리는 것인지 알아채기 어려웠다.
 * 여전히 200ms에 걸쳐 이어지고 **화살표는 움직이지 않는다** — 위치가 변하면
 * 그 자체가 조작으로 읽힌다(색만 바뀐다).
 *
 * **`<a>`와 `<button>`이 같은 겉을 쓴다** — 링크인지 버튼인지는 화면마다 다르고
 * 카드의 생김새는 같아야 한다. 둘로 적으면 한쪽만 고쳐져 같은 카드가 화면마다 달라진다.
 */
function cardClass(selected: boolean): string {
  return cn(
    /* 카드 자신을 컨테이너로 둔다 — 줄바꿈 기준이 격자가 아니라 **이 카드의 폭**이다 */
    '@container group flex h-full w-full cursor-pointer items-center gap-2 rounded-nested border bg-surface px-4 py-3 text-left',
    'transition-[border-color,box-shadow,color] duration-200',
    selected
      ? 'border-accent/40 bg-accent-weak'
      : 'border-border hover:border-accent/50 hover:bg-surface-2 hover:shadow-panel',
  );
}

/**
 * 카드 안쪽. **두 묶음이다** `[사용자 지시 2026-08-25]`.
 *
 *  ① 이름 + 미확인 알람 — 이 사업장이 무엇이고 무슨 일이 있는가
 *  ② 점수 + 등급 뱃지 — 그 판정
 *
 * 이름과 점수를 한 줄에 묶고 알람을 그 아래 두었던 판본은, 점수가 이름 옆에
 * 붙어 있어 카드 가운데를 비워 두고도 **가운데 정렬이 되지 않았다.**
 * 두 묶음으로 가르면 ①이 남는 폭을 갖고 ②가 그 옆 가운데에 선다.
 *
 * 좁은 카드(190px 미만)에서는 위아래로 쌓는다 — 카드 폭은 열이 늘어도
 * 150~205px 사이라 뷰포트가 아니라 **카드 폭**으로 묻는다.
 */
function CardInside({
  site,
  visual,
  renderFooter,
}: {
  site: Site;
  visual: StatusVisual | null;
  renderFooter: (site: Site) => ReactNode;
}) {
  return (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-1.5 @[190px]:flex-row @[190px]:items-center @[190px]:gap-3">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[14px] font-bold leading-tight text-fg">{site.name}</span>
          {renderFooter(site)}
        </span>

        {/*
         * 등급 뱃지를 **점수 옆에** 둔다 — 점수와 등급은 같은 판정의 두 표현이라
         * 붙어 있어야 한 값으로 읽힌다. 통신 두절은 등급이 아니라 수신 상태라
         * 등급색을 쓰지 않고 중립면에 둔다.
         */}
        <span className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <span
            className={`num ${VALUE_LG}`}
            style={{ color: visual ? statusInk(visual) : 'var(--fg-subtle)' }}
          >
            {site.anomalyScore === null ? '—' : <CountUp value={site.anomalyScore} />}
          </span>
          {site.status ? (
            <StatusBadge level={site.status} />
          ) : (
            <span className={`${BADGE_BASE} bg-surface-3 text-fg-muted`}>통신 두절</span>
          )}
        </span>
      </span>

      <ChevronRight
        aria-hidden
        size={18}
        strokeWidth={2}
        className="shrink-0 text-fg-subtle transition-colors duration-200 group-hover:text-accent"
      />
    </>
  );
}

/** `gap-3`의 픽셀 값. 위 `basis` 식과 **같은 간격**을 가리킨다 */
const GAP_PX = 12;

/**
 * 재기 전에 쓰는 장수. 위 `@[860px]` 분기의 **5장과 같은 값**이다.
 *
 * 서버는 상자 폭을 모르므로 첫 렌더에는 잴 것이 없다. 1로 두면 인디케이터가 없다가
 * 하이드레이션 직후 나타나 화면이 한 번 밀린다 — 넓은 화면(대부분)에서는 이 값이 곧 정답이라
 * 밀림이 없고, 좁은 화면에서만 관측기가 곧바로 고친다. 서버와 첫 클라이언트 렌더가 같은
 * 값을 내므로 hydration도 어긋나지 않는다.
 */
const ASSUMED_PER_VIEW = 5;

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
          /*
           * **점은 6px인데 누르는 자리는 그보다 넓다** `[사용자 요청 2026-09-21]`. 점을 키우면
           * 인디케이터가 조작 버튼처럼 무거워진다 — `before`로 위아래·좌우만 넓혀 **보이는
           * 크기는 그대로 두고** 손가락이 닿게 한다. 줄 간격(`gap-1.5`)보다 넓어도 겹치는
           * 것은 투명한 히트 영역뿐이라 서로의 점을 가리지 않는다.
           */
          className={cn(
            'relative h-1.5 cursor-pointer rounded-full transition-[width,background-color] duration-200',
            'before:absolute before:-inset-x-1 before:-inset-y-[17px] before:content-[""] lg:before:content-none',
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
        /*
         * 보이는 크기는 28px인데 누르는 자리는 44px 높이다 — 셸 헤더의 `ICON_BUTTON`과 같은 짜임.
         *
         * **위아래로만 넓힌다.** 이 버튼은 `-ml-5`/`-mr-5`로 **판 밖에 걸터앉아 있어서**,
         * 사방으로 넓히면 그 8px이 페이지 밖으로 나간다 — 실측으로 768px에서 문서가 8px
         * 밀렸다(§8이 못박은 «가로 스크롤 없음»을 어긴다). 좌우는 쓰는 쪽이 **안쪽으로만**
         * 넓힌다(아래 `before:-right-2`·`before:-left-2`).
         *
         * **`relative`를 붙이지 않는다**: 이미 `absolute`라 스스로 기준면이고, 둘 다 적으면
         * `twMerge`가 뒤엣것만 남겨 **버튼이 흐름 안으로 돌아온다**(실측: 그 상태로 넓은
         * 화면의 통합 관제가 2,630 → 2,658px로 자랐다).
         */
        'before:absolute before:-inset-y-2 before:inset-x-0 before:content-[""] lg:before:content-none',
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
