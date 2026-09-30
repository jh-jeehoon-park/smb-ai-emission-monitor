'use client';

import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { STATUS_VISUAL } from '@/shared/config/status-visual';
import { cn } from '@/shared/lib/cn';
import { useDismiss } from '@/shared/lib/use-dismiss';
import { ICON_BUTTON } from '@/shared/ui/action-button';
import { BADGE_BASE } from '@/shared/ui/badge';
import { formatRelative } from '@/shared/lib/format';
import {
  ALARM_PRIORITY_LABELS,
  openAlarms,
  type Alarm,
  type AlarmPriority,
} from '@/entities/alarm';
import { ADMIN_ACCOUNTS, GOV_SCOPE } from '@/entities/user';
import { siteIdsInScope, withinScope } from '@/entities/site';
import { ALL_ALARMS, useAlarmStates } from '@/features/alarm-ack';
import { useSiteHref } from '@/features/site-selection';
import { ALARM_NAV_HREF } from '../config/navigation';
import { HEADER_ALARM_LIMIT } from '../config/constants';
import styles from './alarm-menu.module.scss';

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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { alarms, setState } = useAlarmStates(ALL_ALARMS);
  const close = useCallback(() => setOpen(false), []);

  /* 바깥 누름·Esc·초점 복원은 세 팝오버가 같은 규약을 쓴다 — `shared/lib/use-dismiss.ts` */
  useDismiss({ open, onDismiss: close, boxRef, triggerRef });

  const acknowledge = (id: string) => setState(id, 'acknowledged');
  /* 관할은 셸이 손에 들고 있어야 한다 — 라우트 밖이라 URL을 읽지 못한다 */
  const inMunicipality = withinScope(alarms, siteIdsInScope('municipality', GOV_SCOPE));

  return (
    <div ref={boxRef} className={styles.root}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="알림"
        className={cn(ICON_BUTTON, styles.trigger)}
      >
        <Bell aria-hidden size={16} strokeWidth={1.9} />
        {/*
          * 역할마다 숫자가 다르다 — 시스템 관리자는 전 사업장, 기초지자체는 관할, 사업장은
          * 자사다. **셸은 `?scope=`를 읽지 못하므로** 값마다 한 벌씩 그리고 CSS가 고른다.
          */}
        <CountBadge alarms={alarms} className="role-hide-site role-hide-gov" />
        <CountBadge alarms={inMunicipality} className="role-hide-site role-hide-system" />
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
          className={styles.menu}
        >
          <AlarmPanel
            alarms={alarms}
            onAcknowledge={acknowledge}
            className="role-hide-site role-hide-gov"
          />
          <AlarmPanel
            alarms={inMunicipality}
            onAcknowledge={acknowledge}
            className="role-hide-site role-hide-system"
          />
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
      className={cn('num', styles.countBadge, className)}
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
      <p className={styles.panelHead}>
        미확인 알람 <span className={cn('num', styles.panelHeadCount)}>{list.length}</span>건
      </p>

      {list.length === 0 ? (
        <p className={styles.empty}>미확인 알람이 없습니다</p>
      ) : (
        <ul>
          {list.slice(0, HEADER_ALARM_LIMIT).map((alarm) => (
            <li key={alarm.id} className={styles.item}>
              <div className={styles.itemMeta}>
                <span
                  className={BADGE_BASE}
                  style={{
                    backgroundColor: `color-mix(in srgb, ${priorityHex(alarm.priority)} 16%, transparent)`,
                    color: priorityHex(alarm.priority),
                  }}
                >
                  {ALARM_PRIORITY_LABELS[alarm.priority]}
                </span>
                <span className={styles.itemSite}>{alarm.siteName}</span>
                <span className={styles.itemTime}>
                  {formatRelative(alarm.raisedAtIso, DEMO_NOW_ISO)}
                </span>
              </div>

              <div className={styles.itemBody}>
                <p className={styles.itemTitle}>{alarm.title}</p>
                {/* 여기서 처리하면 배지·사이드바·본문이 함께 준다 */}
                <button
                  type="button"
                  onClick={() => onAcknowledge(alarm.id)}
                  aria-label={`${alarm.title} 확인 처리`}
                  className={styles.acknowledge}
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
        className={styles.historyLink}
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
