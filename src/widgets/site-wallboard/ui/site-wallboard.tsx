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
import styles from './site-wallboard.module.scss';

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

  return (
    <div className={styles.root}>
      {/*
       * **화살표는 판(Panel)의 바깥 테두리에 걸터앉는다** `[사용자 지시 2026-08-25]`.
       *
       * 아래 한 줄에 모아 두었던 판본은 조작이 카드에서 멀어 "이 줄을 넘긴다"가 잘 읽히지
       * 않았다. 판의 테두리를 반씩 물면 **무엇을 넘기는 것인지**가 자리로 말해진다.
       *
       * 트랙 **바깥**에 두어야 한다 — 안에 두면 스크롤 상자의 내용이라 카드와 함께 밀려 나간다.
       */}
      <div className={styles.rail}>
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
           */}
          <div
            ref={trackRef}
            onScroll={onScroll}
            role="group"
            aria-label="사업장 카드"
            className={styles.track}
          >
            {sites.map((site) => {
              const visual = site.status ? STATUS_VISUAL[site.status] : null;
              const selected = props.action === 'select' && props.selectedId === site.id;
              const inside = <CardInside site={site} visual={visual} renderFooter={renderFooter} />;

              return (
                <RiseItem key={site.id} className={styles.slot}>
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
              className={styles.arrowPrev}
            />
            <PagerArrow
              dir="next"
              disabled={page >= pages - 1}
              onClick={() => goTo(page + 1)}
              className={styles.arrowNext}
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
  return cn(styles.card, selected ? styles.cardSelected : styles.cardIdle);
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
      <span className={styles.body}>
        <span className={styles.identity}>
          <span className={styles.name}>{site.name}</span>
          {renderFooter(site)}
        </span>

        {/*
         * 등급 뱃지를 **점수 옆에** 둔다 — 점수와 등급은 같은 판정의 두 표현이라
         * 붙어 있어야 한 값으로 읽힌다. 통신 두절은 등급이 아니라 수신 상태라
         * 등급색을 쓰지 않고 중립면에 둔다.
         */}
        <span className={styles.verdict}>
          <span
            className={cn('num', VALUE_LG)}
            style={{ color: visual ? statusInk(visual) : 'var(--fg-subtle)' }}
          >
            {site.anomalyScore === null ? '—' : <CountUp value={site.anomalyScore} />}
          </span>
          {site.status ? (
            <StatusBadge level={site.status} />
          ) : (
            <span className={cn(BADGE_BASE, styles.offlineBadge)}>통신 두절</span>
          )}
        </span>
      </span>

      <ChevronRight
        aria-hidden
        size={18}
        strokeWidth={2}
        className={styles.chevron}
      />
    </>
  );
}

/** 트랙 `gap`(0.75rem)의 픽셀 값. 모듈의 카드 폭(`flex-basis`) 식과 **같은 간격**을 가리킨다 */
const GAP_PX = 12;

/**
 * 재기 전에 쓰는 장수. 모듈의 `860px` 컨테이너 분기가 정한 **5장과 같은 값**이다.
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
 * 페이지 이동은 `scrollTo`로만 한다. 부드럽게 움직일지는 CSS(`scroll-behavior` ·
 * 감속 설정 분기)가 정하므로 감속 설정도 그쪽 한 곳에서 지켜진다.
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
    <div className={styles.pager}>
      {Array.from({ length: pages }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onMove(i)}
          aria-label={`${i + 1}번째 묶음 보기`}
          aria-current={i === page ? 'true' : undefined}
          className={cn(styles.dot, i === page ? styles.dotCurrent : styles.dotIdle)}
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
      className={cn(styles.arrow, disabled ? styles.arrowDisabled : styles.arrowEnabled, className)}
    >
      {/* 흐려지는 것은 글리프뿐이다 — 면·테두리·그림자는 누를 때와 같다 */}
      <Icon
        aria-hidden
        size={16}
        strokeWidth={2}
        className={cn(styles.glyph, disabled && styles.glyphDisabled)}
      />
    </button>
  );
}
