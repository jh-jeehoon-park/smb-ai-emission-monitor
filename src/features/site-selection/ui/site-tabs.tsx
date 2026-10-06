'use client';

import { useId } from 'react';
import { STATUS_VISUAL } from '@/shared/config/status-visual';
import { cn } from '@/shared/lib/cn';
import { SegPill } from '@/shared/ui/segmented-control';
import type { Site } from '@/entities/site';

/**
 * 사업장 탭. **아래 상세 영역이 어느 사업장의 것인지**를 정하는 유일한 조작이다
 * `[사용자 지시 2026-08-24]`.
 *
 * 예전에는 사업장 현황 카드를 눌러 골랐는데, 그 카드는 이제 전 사업장을 한눈에 보는
 * 개요이고 누르면 알람이 열린다 — 고르는 일과 훑는 일을 분리했다.
 *
 * **회색 본문 위에 놓인다** — 카드 밖이라 선택된 탭에 흰 면을 준다. 카드 안에서 쓰던
 * 회색 강조(`bg-surface-3`)는 본문 배경(#f1f4f8)과 붙어 어느 탭이 선택됐는지 보이지 않는다.
 *
 * 넘치면 **줄바꿈한다.** 가로 스크롤로 두면 나머지가 숨고, 넘치는 flex에 `justify-*`를
 * 걸면 시작 쪽이 스크롤로 닿지 않는 브라우저 버그까지 만난다. 본문 전폭(≥680px)에서는
 * 10개가 한 줄에 들어간다.
 */
export function SiteTabs({
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
  /* 알약은 목록마다 따로 움직인다 — 고정 문자열을 쓰면 두 탭줄이 서로에게 날아간다 */
  const pillId = useId();

  return (
    <div
      role="tablist"
      aria-label="사업장 선택"
      className={cn('flex max-w-full flex-wrap gap-1', className)}
    >
      {sites.map((site) => {
        const selected = site.id === selectedId;
        return (
          <button
            key={site.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(site.id)}
            className={cn(
              'relative flex shrink-0 cursor-pointer items-center gap-1.5 rounded-nested px-2.5 py-1.5 text-[12px]',
              'transition-colors duration-200',
              selected ? 'font-semibold text-accent' : 'text-fg-subtle hover:text-fg-muted',
            )}
          >
            {/*
             * 흰 알약이 고른 탭으로 **미끄러진다** `[사용자 지시 2026-08-24: 과하지 않은 동적 효과]`.
             * 색만 바뀌면 어디서 어디로 옮겼는지가 남지 않는다 — 움직임이 그 경로를 그린다.
             * 알약은 필터·차트 탭과 **같은 것**을 쓴다(`SegPill`) — 모서리만 이 줄에 맞춘다.
             * 감속 설정에서는 `MotionPreferences`가 이동을 즉시 끝낸다.
             */}
            {selected && <SegPill layoutId={pillId} />}
            {/*
             * 등급 점은 **탭 안에서만** 쓴다. 탭은 이름이 곧 라벨이라 색이 무엇을 뜻하는지
             * 라벨로 말할 자리가 없다 — 지도 범례가 그 몫을 한다. 등급 뱃지를 10개 넣으면
             * 탭 하나가 100px을 넘어 스크롤이 끝나지 않는다.
             */}
            <span
              aria-hidden
              className="relative size-1.5 shrink-0 rounded-full"
              style={{
                backgroundColor: site.status ? STATUS_VISUAL[site.status].hex : 'var(--missing)',
              }}
            />
            <span className="relative">{site.name}</span>
          </button>
        );
      })}
    </div>
  );
}
