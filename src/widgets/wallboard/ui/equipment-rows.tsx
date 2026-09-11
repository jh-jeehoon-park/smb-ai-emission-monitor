'use client';

import {
  OPERATING_FILL,
  OPERATING_LABELS,
  operatingStateOf,
} from '@/shared/config/operating-visual';
import { PROVISIONAL_STATUS_LABELS } from '@/shared/config/provisional';
import { STATUS_VISUAL, statusInk } from '@/shared/config/status-visual';
import { cn } from '@/shared/lib/cn';
import { EQUIPMENT_SIGNAL_LABELS, type Equipment } from '@/entities/equipment';
import { WALL_LABEL, WALL_META } from '../config/constants';

/**
 * 설비 — **대당 한 줄.**
 *
 * `EquipmentPanel`을 쓰지 않는다. 위젯끼리는 서로 가져올 수 없고(FSD §8), 가져올 수 있더라도
 * 그쪽은 카드마다 잔여 시간·신호 목록·이동 링크를 담은 **책상용** 부품이라 이 화면의 오른쪽
 * 열에서는 세로를 넘긴다. 벽에서 필요한 것은 «네 대가 지금 어떤가» 한 눈이다.
 *
 * 레퍼런스의 설비 줄을 따라 **가동 점 · 이름 · 신호 · 등급**을 한 줄에 눕힌다 — 가동 여부는
 * 점이, 등급은 글자색이 맡아 **두 축이 한 색에 겹치지 않는다.**
 *
 * **대수는 시연값이다** `[TBD-48]` — 원문은 펌프·폭기장치·약품주입펌프라는 **종류**만 정하고
 * 대수를 정하지 않는다. 이 줄 수를 명세로 읽지 않는다.
 */
export function EquipmentRows({ items, online }: { items: Equipment[]; online: boolean }) {
  if (!online) {
    /* 두절이면 «정상»이 아니라 모른다 — 등급을 그리지 않는다(E4) */
    return (
      <p className={cn('m-auto text-center text-fg-subtle', WALL_META)}>
        통신이 두절되어 설비 상태를 확인할 수 없습니다
      </p>
    );
  }

  return (
    <ul className="flex min-h-0 flex-1 flex-col justify-between gap-2">
      {items.map((item) => {
        const visual = STATUS_VISUAL[item.status];
        const state = operatingStateOf(item.running);

        return (
          <li
            key={item.id}
            className="flex min-w-0 items-center gap-3 rounded-nested border border-border bg-surface-2 px-3.5 py-2.5"
          >
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: OPERATING_FILL[state] }}
            />
            <span className={cn('min-w-0 flex-1 truncate', WALL_LABEL)}>{item.name}</span>
            <span className={cn('shrink-0 text-fg-subtle', WALL_META)}>
              {item.signals.length > 0
                ? item.signals.map((signal) => EQUIPMENT_SIGNAL_LABELS[signal]).join(' · ')
                : OPERATING_LABELS[state]}
            </span>
            <span
              className="shrink-0 text-[17px] font-bold leading-none"
              style={{ color: statusInk(visual) }}
            >
              {PROVISIONAL_STATUS_LABELS[item.status]}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
