'use client';

import { COLLECTION_INTERVAL_MINUTES } from '@/shared/config/measurement';
import { cn } from '@/shared/lib/cn';
import { DISPLAY_TIMEZONE, formatDateTime } from '@/shared/lib/format';
import { WALL_META } from '../config/constants';
import { WallClock } from './wall-clock';

/**
 * 머리줄 — **셸이 하던 일을 대신한다.**
 *
 * 이 화면은 사이드바와 헤더를 그리지 않으므로 헤더가 갖고 있던 **사업장 이름 · 수신 원천 ·
 * 시각**이 사라진다. 셋은 장식이 아니라 규약이 요구하는 것이라(**E3** 원천 · **E5** 시간대와
 * 수집 주기) 여기서 **글자로** 적는다 — 툴팁에 접으면 마우스가 없는 이 화면에서는 닿을 수
 * 없다(§8 `보조 설명`의 현황판 예외).
 *
 * 레퍼런스를 따라 **한 줄 띠**다 — 카드가 아니라 화면 맨 위에 붙는 가로 띠이고, 오른쪽 끝에
 * 시계가 알약으로 앉는다. 사실 셋(원천·기준·주기)은 그 왼쪽에 칩으로 늘어선다.
 *
 * **시계와 기준 시각은 다른 값이다**(§8 `시각 표기`). 왼쪽 칩은 «계측이 마지막으로 관측된
 * 때», 오른쪽 알약은 «지금 몇 시»다. 이름을 따로 달아 둘이 섞이지 않게 한다.
 */
export function WallHeader({
  siteName,
  region,
  industry,
  sourceLabel,
  observedAtIso,
}: {
  siteName: string;
  region: string;
  industry: string;
  sourceLabel: string;
  observedAtIso: string;
}) {
  return (
    <header className="flex shrink-0 items-center gap-6 rounded-panel border border-card-border bg-surface px-6 py-4 shadow-panel">
      <span aria-hidden className="h-9 w-1 shrink-0 rounded-full bg-accent" />

      <div className="min-w-0">
        <h1 className="truncate text-[30px] font-bold leading-tight tracking-tight text-fg">
          {siteName}
        </h1>
        <p className={cn('mt-0.5 text-fg-subtle', WALL_META)}>
          {region} · {industry}
        </p>
      </div>

      <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
        <Chip label="원천">{sourceLabel}</Chip>
        <Chip label="기준">
          <span className="num">{`${formatDateTime(observedAtIso)} ${DISPLAY_TIMEZONE}`}</span>
        </Chip>
        <Chip label="주기">{`${COLLECTION_INTERVAL_MINUTES}분`}</Chip>
      </div>

      <WallClock className="shrink-0 rounded-chip bg-surface-2 px-4 py-2 text-[19px] font-bold text-fg" />
    </header>
  );
}

function Chip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-baseline gap-1.5 rounded-chip bg-surface-2 px-2.5 py-1.5',
        WALL_META,
      )}
    >
      <span className="text-fg-subtle">{label}</span>
      <span className="font-semibold text-fg-muted">{children}</span>
    </span>
  );
}
