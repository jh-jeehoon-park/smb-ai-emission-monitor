'use client';

import { cn } from '@/shared/lib/cn';
import { formatRelative } from '@/shared/lib/format';
import { RiseItem, StaggerGroup } from '@/shared/ui/motion';
import {
  ALARM_CONDITION_LABELS,
  ALARM_PRIORITY_LABELS,
  ALARM_STATE_LABELS,
  type Alarm,
  type AlarmPriority,
} from '@/entities/alarm';

/**
 * 우선순위 색은 상태 등급 색과 같은 팔레트를 쓰되, 두 축이 같다고 단정하지 않는다.
 * 등급 4단계와 우선순위 3단계의 대응 관계는 원문에 없다(TBD-21).
 */
const PRIORITY_STYLE: Record<AlarmPriority, { hex: string; chip: string; glyph: string }> = {
  urgent: {
    hex: 'var(--critical-ink)',
    chip: 'bg-chip-critical text-critical-ink border-critical/45',
    glyph: '■',
  },
  caution: {
    hex: 'var(--warning-ink)',
    chip: 'bg-chip-warning text-warning-ink border-warning/35',
    glyph: '▲',
  },
  // 정보 등급에 상태색을 주면 '정상'과 헷갈린다. 중립 잉크로 둔다.
  info: {
    hex: 'var(--fg-muted)',
    chip: 'bg-surface-3 text-fg-muted border-border-strong',
    glyph: '●',
  },
};

export function AlarmList({
  alarms,
  nowIso,
  selectedSiteId,
}: {
  alarms: Alarm[];
  nowIso: string;
  selectedSiteId: string;
}) {
  return (
    <StaggerGroup className="divide-y divide-border">
      {alarms.map((alarm, index) => {
        const style = PRIORITY_STYLE[alarm.priority];
        return (
          <RiseItem key={alarm.id}>
            {/*
             * 위 여백은 **첫 항목만 뺀다** — 패널이 이미 위쪽 여백을 주므로 첫 항목에 또 주면
             * 목록이 아래로 처진다.
             *
             * `first:pt-0`을 쓰지 않는 이유: 이 `article`은 `RiseItem` 안에 있어 **항상**
             * 자기 부모의 첫 자식이다. 그래서 모든 항목에 `pt-0`이 걸려 둘째 항목부터 위 여백이
             * 사라졌다. 순서를 아는 것은 부모뿐이므로 여기서는 index로 판단한다.
             */}
            <article
              className={cn(
                'group flex gap-3 pb-2.5 transition-colors duration-200 hover:bg-surface-2/60',
                index > 0 && 'pt-2.5',
              )}
            >
              <span
                aria-hidden
                className="mt-1 text-[8px] leading-none"
                style={{ color: style.hex }}
              >
                {style.glyph}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={cn(
                      'rounded-[3px] border px-1.5 py-px text-[11px] font-medium',
                      style.chip,
                    )}
                  >
                    {ALARM_PRIORITY_LABELS[alarm.priority]}
                  </span>
                  <span className="rounded-[3px] bg-surface-3 px-1.5 py-px text-[11px] text-fg-muted">
                    {ALARM_CONDITION_LABELS[alarm.condition]}
                  </span>
                  <span
                    className={cn(
                      'truncate text-[11px]',
                      alarm.siteId === selectedSiteId ? 'text-fg-muted' : 'text-fg-subtle',
                    )}
                  >
                    {alarm.siteName}
                  </span>
                </div>

                <p className="mt-1 text-[12px] font-medium text-fg">{alarm.title}</p>
                <p className="mt-1 line-clamp-2 max-w-[52ch] text-[12px] leading-relaxed text-fg-muted">
                  {alarm.detail}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="num text-[11px] text-fg-subtle">
                  {formatRelative(alarm.raisedAtIso, nowIso)}
                </p>
                <p
                  className={cn(
                    'mt-1 text-[11px]',
                    alarm.state === 'open' ? 'text-fg-muted' : 'text-fg-subtle',
                  )}
                >
                  {ALARM_STATE_LABELS[alarm.state]}
                </p>
              </div>
            </article>
          </RiseItem>
        );
      })}
    </StaggerGroup>
  );
}
