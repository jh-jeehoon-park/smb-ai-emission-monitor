'use client';

import { ChevronRight } from 'lucide-react';
import { useLayoutEffect, useRef } from 'react';
import { cn } from '@/shared/lib/cn';
import { BADGE_BASE } from '@/shared/ui/badge';
import { Eyebrow } from '@/shared/ui/eyebrow';
import { StatusBadge } from '@/shared/ui/status-badge';
import type { Site } from '@/entities/site';
import { SITE_LIST_MAX_HEIGHT } from '../config/constants';

/**
 * 사업장 고르기 — **좁은 화면용 목록** `[사용자 요청 2026-09-18: 첨부 이미지]`.
 *
 * `SiteTabs`와 **같은 일을 하고 같은 상태를 쓴다**(`onSelect` → `?site=`). 자리만 갈린다:
 * `lg` 이상은 탭 줄, 그 아래는 이 목록이다.
 *
 * **세 화면이 함께 쓴다** — 통합 관제 · 이상 탐지 · 관내 감독 현황 `[사용자 요청 2026-09-21]`.
 * 셋이 같은 구성이라(제목 + 탭 + 긴 격자) 같은 낭비를 하고 있었다. 한때 통합 관제 전용이라
 * 적어 두었는데, 그러면 같은 부품이 자리마다 다르게 행동하게 된다.
 *
 * **탭 줄을 좁은 화면에서 그대로 쓸 수 없던 이유 셋.**
 *   · 10개가 **4행 132px**로 접혀 구역 머리가 부풀었다(390px 실측)
 *   · 알약 하나가 실높이 **26px**이라 손가락 최소(44px)를 크게 밑돌았다
 *   · 등급을 **점**으로만 말했다 — `SiteTabs`가 「뱃지를 10개 넣으면 탭이 100px을 넘는다」고
 *     적어 둔 그 제약인데, 한 줄에 하나씩 놓으면 그 제약이 사라져 **글자로** 적을 수 있다
 *
 * 그래서 좁은 화면에서는 **고른 것을 카드로 세우고 나머지를 한 줄씩** 늘어놓는다.
 *
 * **「전체 사업장 보기」를 두지 않는다** `[사용자 요청 2026-09-18]` — 열 곳을 전부 적으므로
 * 더 볼 것이 없다. 접어 두고 그 버튼을 두면 나머지가 한 번 더 눌러야 닿는 자리로 내려간다.
 */
export function SiteList({
  sites,
  selectedId,
  onSelect,
  className,
}: {
  sites: Site[];
  selectedId: string;
  onSelect: (id: string) => void;
  className?: string;
}) {
  const selected = sites.find((site) => site.id === selectedId);
  const others = sites.filter((site) => site.id !== selectedId);
  const cardRef = useRef<HTMLDivElement>(null);
  const focusCardOnChange = useRef(false);

  /*
   * **고른 뒤 초점을 카드로 옮긴다** `[2026-09-30 검토]`. 누른 줄은 고르는 순간 목록에서 빠져
   * 카드로 올라가므로 **그 버튼이 사라진다** — 초점이 문서 맨 앞(`body`)으로 떨어져 키보드
   * 사용자는 처음부터 다시 Tab을 눌러야 했다(실측). 카드로 옮기면 보조기술이 새로 고른
   * 사업장을 읽고, 다음 Tab이 다시 목록으로 간다.
   *
   * **누르는 순간이 아니라 카드가 바뀐 뒤에 옮긴다.** 고르기는 `?site=`를 바꾸는 일이고 라우터가
   * 그것을 transition으로 그려, 누르는 순간의 카드는 **아직 떠나온 사업장**이다 — 거기서 초점을
   * 주면 보조기술이 옛 이름을 읽고 새 이름은 초점 안에서 말없이 바뀐다(리뷰에서 짚였다).
   * 그래서 표시만 남기고, `selectedId`가 바뀐 뒤 그리기 전에 옮긴다. 화면은 움직이지 않는다 —
   * 카드는 목록 바로 위에 있다.
   */
  useLayoutEffect(() => {
    if (!focusCardOnChange.current) return;
    focusCardOnChange.current = false;
    cardRef.current?.focus({ preventScroll: true });
  }, [selectedId]);

  const choose = (id: string) => {
    focusCardOnChange.current = true;
    onSelect(id);
  };

  return (
    /*
     * **흰 면 위에 산다** `[사용자 지적 2026-09-18: 이미지랑 영역 색상이 차이가 남]`.
     *
     * 이 목록이 놓이는 「선택 사업장 현황」은 **회색 구역면**(`--section-bg`)이고, 그 안의
     * 내용은 흰 카드로 서는 것이 §8의 어휘다 — 지도·이상 탐지·계측이 모두 그렇다. 목록만
     * 구역면에 바로 얹혀 있어 **두 가지가 어긋났다**(실측).
     *   · 줄이 자기 면 없이 회색 위에 떠 있어 카드 안의 내용으로 읽히지 않았다
     *   · 고른 곳의 면(`--accent-weak` = 흰면에 포인트색 8%)이 회색 구역면과 겹쳐
     *     **#ecf0f7 대 #e9eef4**, 즉 «고른 것»이라는 뜻을 나르던 색이 거의 사라졌다
     *
     * `lg` 이상에는 이 목록 자체가 없으므로(`lg:hidden`) **PC는 닿지 않는다.**
     */
    <div
      className={cn(
        'space-y-3 rounded-panel border border-card-border bg-surface p-4 shadow-panel',
        className,
      )}
    >
      {/*
       * **지금 고른 것은 누를 자리가 아니다** — 이미 그것을 보고 있다. 그래서 카드에는
       * 화살표를 두지 않고, 아래 줄들만 조작이다.
       *
       * 포인트색 면(`--accent-weak`)을 쓰는 것은 §8 `포인트색은 조작·선택에만`에 맞는다 —
       * 여기서 그 색이 뜻하는 것은 등급이 아니라 **지금 고른 것**이다.
       */}
      {selected && (
        <div
          ref={cardRef}
          tabIndex={-1}
          className="flex items-center justify-between gap-3 rounded-nested border border-accent/40 bg-accent-weak px-3.5 py-3"
        >
          <div className="min-w-0">
            <Eyebrow className="text-accent">현재 선택 사업장</Eyebrow>
            <p className="mt-0.5 truncate text-[16px] font-bold leading-tight text-fg">
              {selected.name}
            </p>
          </div>
          <SiteStatus site={selected} />
        </div>
      )}

      {others.length > 0 && (
        <div>
          {/*
           * **개수를 적는 이유는 스크롤이 보이지 않기 때문이다.** 세 줄만 두고 나머지를
           * 상자 안에 밀어 넣으면, 휴대폰의 겹침 스크롤바는 만지기 전까지 뜨지 않아 **넷째
           * 줄이 있다는 사실 자체가 화면에 없다.** 개수가 그것을 대신 말한다.
           */}
          <Eyebrow>{`다른 사업장 ${others.length}곳`}</Eyebrow>
          {/*
           * 한 줄이 한 사업장이다. **실높이 44px**을 지킨다(`py-3` 24 + 줄높이 20) —
           * 탭 알약의 26px이 손가락 최소를 밑돌던 것을 이 배치가 함께 고친다.
           *
           * **세 줄만 보이고 나머지는 상자 안에서 밀린다** `[사용자 요청 2026-09-18: 사업장이
           * 3개 이상일 때는 스크롤]`. 아홉 줄을 모두 펴면 그것만 413px(실측)이라 구역 머리가 다시
           * 부풀어, 탭 줄을 걷어 낸 이유가 되돌아간다.
           *
           * 상한만 주고 «셋 이상일 때만»을 따로 가르지 않는다 — 남는 곳이 셋 이하면 내용이
           * 상한보다 짧아 **스크롤바가 저절로 뜨지 않는다.** 조건을 코드로 또 적으면 같은
           * 규칙이 두 곳에 살게 된다.
           *
           * `overscroll-contain`은 상자 끝에서 스크롤이 페이지로 **넘어가지 않게** 한다 —
           * 없으면 목록을 넘기다 페이지가 함께 튄다.
           */}
          <div
            role="group"
            aria-label="사업장 선택"
            className={cn(
              'mt-1 divide-y divide-border',
              SITE_LIST_MAX_HEIGHT,
              'overflow-y-auto overscroll-contain',
            )}
          >
            {others.map((site) => (
              <button
                key={site.id}
                type="button"
                onClick={() => choose(site.id)}
                /*
                 * **초점 테두리를 안쪽에 그린다** `[2026-09-30 검토]`. 전역 규칙은 바깥 2px이라
                 * 이 스크롤 상자가 위·좌·우를 잘라 **줄 아래 선 하나**만 남았다 — 구분선과 같아
                 * 보여 초점이 어디 있는지 알 수 없었다(캡처로 잡았다).
                 */
                className="flex w-full cursor-pointer items-center justify-between gap-3 px-1 py-3 text-left transition-colors duration-200 hover:bg-surface-2 focus-visible:-outline-offset-2"
              >
                <span className="min-w-0 truncate text-[14px] text-fg">{site.name}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <SiteStatus site={site} />
                  <ChevronRight aria-hidden size={16} strokeWidth={1.9} className="text-fg-subtle" />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 등급 뱃지 — **두절은 등급이 아니라 수신 상태**라 등급색을 쓰지 않고 중립면에 둔다
 * (`site-wallboard`가 세운 표기를 그대로 따른다).
 */
function SiteStatus({ site }: { site: Site }) {
  if (!site.status) {
    return <span className={`${BADGE_BASE} shrink-0 bg-surface-3 text-fg-muted`}>통신 두절</span>;
  }
  return <StatusBadge level={site.status} className="shrink-0" />;
}
