'use client';

import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { STATUS_VISUAL } from '@/shared/config/status-visual';
import { cn } from '@/shared/lib/cn';
import { formatRelative } from '@/shared/lib/format';
import {
  ALARM_PRIORITY_LABELS,
  openAlarms,
  type Alarm,
  type AlarmPriority,
} from '@/entities/alarm';
import { ADMIN_ACCOUNTS } from '@/entities/user';
import { ALL_ALARMS, useAlarmStates } from '@/features/alarm-ack';
import { useSiteHref } from '@/features/site-selection';
import { ALARM_NAV_HREF } from '../config/navigation';
import { HEADER_ALARM_LIMIT } from '../config/constants';

/**
 * 헤더 알림.
 *
 * 알람을 보려면 알람 이력 화면으로 들어가야 했다 — 어느 화면에 있든 방금 무슨 일이
 * 있었는지 알 수 있어야 한다.
 *
 * **범위가 역할마다 다르다.** 시스템 관리자·지자체는 전 사업장, 사업장은 자사 1개소다.
 * 서버는 역할을 모르므로(첫 페인트 전 `data-role`로만 들어온다) 렌더 중에 분기하면
 * hydration이 깨진다 — 세 벌을 모두 그리고 CSS가 고른다. 사이드바 배지와 같은 방식이다.
 */
export function AlarmMenu() {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const { alarms, setState } = useAlarmStates(ALL_ALARMS);

  useEffect(() => {
    if (!open) return;

    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const acknowledge = (id: string) => setState(id, 'acknowledged');

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="알림"
        className="relative flex cursor-pointer items-center rounded-[4px] border border-border bg-surface px-2 py-1.5 text-fg-muted transition-colors duration-200 hover:border-border-strong hover:text-fg"
      >
        <Bell aria-hidden size={13} strokeWidth={1.9} />
        {/* 역할마다 숫자가 다르다. 세 벌을 그리고 CSS가 고른다 */}
        <CountBadge alarms={alarms} className="role-hide-site" />
        {ADMIN_ACCOUNTS.map((account, index) => (
          <CountBadge
            key={account.key}
            alarms={alarms}
            siteId={account.siteId}
            className={`admin-only-${index + 1}`}
          />
        ))}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1.5 w-[320px] rounded-[6px] border border-border bg-surface shadow-lg"
        >
          <AlarmPanel alarms={alarms} onAcknowledge={acknowledge} className="role-hide-site" />
          {ADMIN_ACCOUNTS.map((account, index) => (
            <AlarmPanel
              key={account.key}
              alarms={alarms}
              siteId={account.siteId}
              onAcknowledge={acknowledge}
              className={`admin-only-${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** 0건이면 그리지 않는다 — 배지가 '0'을 달고 있으면 확인할 것이 있는 듯 보인다 */
function CountBadge({
  alarms,
  siteId,
  className,
}: {
  alarms: Alarm[];
  siteId?: string;
  className: string;
}) {
  const count = openAlarms(alarms, siteId).length;
  if (count === 0) return null;

  return (
    <span
      className={cn(
        'num absolute -right-1 -top-1 min-w-[15px] rounded-full px-1 text-center text-[10px] leading-[15px] text-bg',
        className,
      )}
      style={{ backgroundColor: STATUS_VISUAL.critical.hex }}
    >
      {count}
    </span>
  );
}

function AlarmPanel({
  alarms,
  siteId,
  onAcknowledge,
  className,
}: {
  alarms: Alarm[];
  siteId?: string;
  onAcknowledge: (id: string) => void;
  className: string;
}) {
  const withSite = useSiteHref();
  const list = openAlarms(alarms, siteId);

  return (
    <div className={className}>
      <p className="border-b border-border px-3 py-2 text-[11px] text-fg-subtle">
        미확인 알람 <span className="num text-fg-muted">{list.length}</span>건
      </p>

      {list.length === 0 ? (
        <p className="px-3 py-6 text-center text-[12px] text-fg-subtle">미확인 알람이 없습니다</p>
      ) : (
        <ul>
          {list.slice(0, HEADER_ALARM_LIMIT).map((alarm) => (
            <li key={alarm.id} className="border-b border-border px-3 py-2.5 last:border-0">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span
                  className="shrink-0 rounded-[3px] px-1.5 py-0.5"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${priorityHex(alarm.priority)} 16%, transparent)`,
                    color: priorityHex(alarm.priority),
                  }}
                >
                  {ALARM_PRIORITY_LABELS[alarm.priority]}
                </span>
                <span className="min-w-0 flex-1 truncate text-fg-subtle">{alarm.siteName}</span>
                <span className="shrink-0 text-fg-subtle">
                  {formatRelative(alarm.raisedAtIso, DEMO_NOW_ISO)}
                </span>
              </div>

              <div className="mt-1 flex items-start justify-between gap-2">
                <p className="min-w-0 flex-1 text-[12px] leading-snug text-fg">{alarm.title}</p>
                {/* 여기서 처리하면 배지·사이드바·본문이 함께 준다 */}
                <button
                  type="button"
                  onClick={() => onAcknowledge(alarm.id)}
                  aria-label={`${alarm.title} 확인 처리`}
                  className="shrink-0 cursor-pointer rounded-[3px] border border-border px-1.5 py-0.5 text-[11px] text-fg-muted transition-colors duration-200 hover:border-border-strong hover:bg-surface-2 hover:text-fg"
                >
                  확인
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link
        href={withSite(ALARM_NAV_HREF)}
        className="block border-t border-border px-3 py-2 text-right text-[11px] text-fg-muted transition-colors duration-200 hover:text-fg"
      >
        전체 알람 이력 →
      </Link>
    </div>
  );
}

function priorityHex(priority: AlarmPriority): string {
  if (priority === 'urgent') return STATUS_VISUAL.critical.hex;
  if (priority === 'caution') return STATUS_VISUAL.warning.hex;
  return 'var(--fg-subtle)';
}
