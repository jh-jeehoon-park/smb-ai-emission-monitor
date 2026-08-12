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
  urgent: { hex: 'var(--critical)', chip: 'bg-critical/14 text-critical border-critical/45', glyph: '■' },
  caution: { hex: 'var(--warning)', chip: 'bg-warning/12 text-warning border-warning/35', glyph: '▲' },
  info: { hex: 'var(--missing)', chip: 'bg-surface-3 text-fg-muted border-border-strong', glyph: '●' },
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
      {alarms.map((alarm) => {
        const style = PRIORITY_STYLE[alarm.priority];
        return (
          <RiseItem key={alarm.id}>
            <article className="group flex gap-3 py-2.5 transition-colors duration-200 first:pt-0 hover:bg-surface-2/60">
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
