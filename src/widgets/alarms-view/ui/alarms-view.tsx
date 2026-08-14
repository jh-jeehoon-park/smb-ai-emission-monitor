'use client';

import { useMemo } from 'react';
import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { DISPLAY_TIMEZONE, formatDateTime, formatRelative } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { SCOPE_FILTERS, SCOPE_OPTIONS, SCOPE_QUERY_KEY } from '@/shared/config/scope';
import { useQueryState } from '@/shared/lib/use-query-state';
import { STATUS_VISUAL, statusInk } from '@/shared/config/status-visual';
import { Panel } from '@/shared/ui/panel';
import { SegmentedControl } from '@/shared/ui/segmented-control';
import { StatTile } from '@/shared/ui/stat-tile';
import {
  ALARMS,
  ALARM_CONDITION_LABELS,
  ALARM_PRIORITY_LABELS,
  ALARM_STATE_LABELS,
  type Alarm,
  type AlarmPriority,
  type AlarmState,
} from '@/entities/alarm';
import { getSite } from '@/entities/site';
import { AlarmStateActions, useAlarmStates } from '@/features/alarm-ack';
import { useSelectedSiteId } from '@/features/site-selection';
import {
  PRIORITY_FILTERS,
  PRIORITY_OPTIONS,
  PRIORITY_QUERY_KEY,
  STATE_FILTERS,
  STATE_OPTIONS,
  STATE_QUERY_KEY,
} from '../config/constants';

/* 마크 색(--{level})은 3:1만 만족한다. 글자에는 4.5:1을 맞춘 --{level}-ink를 쓴다 */
const PRIORITY_CHIP: Record<AlarmPriority, string> = {
  urgent: 'border-critical/45 bg-chip-critical text-critical-ink',
  caution: 'border-warning/35 bg-chip-warning text-warning-ink',
  info: 'border-border-strong bg-surface-3 text-fg-muted',
};

const STATE_CHIP: Record<AlarmState, string> = {
  open: 'border-border-strong bg-surface-3 text-fg',
  acknowledged: 'border-border bg-surface-2 text-fg-muted',
  resolved: 'border-border bg-surface-2 text-fg-subtle',
};

/** 최신 알람이 위로. 이력 화면의 기본 관심은 방금 무슨 일이 있었는가다 */
function byRaisedAtDesc(a: Alarm, b: Alarm): number {
  return b.raisedAtIso.localeCompare(a.raisedAtIso);
}

export function AlarmsView() {
  const { siteId } = useSelectedSiteId();
  const site = getSite(siteId);

  const [priority, setPriority] = useQueryState(PRIORITY_QUERY_KEY, PRIORITY_FILTERS, 'all');
  const [state, setState] = useQueryState(STATE_QUERY_KEY, STATE_FILTERS, 'all');
  const [scope, setScope] = useQueryState(SCOPE_QUERY_KEY, SCOPE_FILTERS, 'all');

  const source = useMemo(() => [...ALARMS].sort(byRaisedAtDesc), []);
  const { alarms, changedCount, setState: setAlarmState, reset } = useAlarmStates(source);

  /**
   * 범위 판정을 **한 곳에서만** 한다. 목록과 상단 타일이 각자 범위를 계산하던 탓에
   * 세그먼트를 '선택 사업장'으로 바꿔도 타일 숫자는 전 사업장 그대로였다.
   *
   * 관리자에게 남의 사업장 합계가 보이면 자사 1개소라는 전제가 깨진다(회의 2026-08-13).
   */
  const inScope = useMemo(
    () => (scope === 'site' ? alarms.filter((a) => a.siteId === siteId) : alarms),
    [alarms, scope, siteId],
  );

  const visible = useMemo(
    () =>
      inScope.filter((alarm) => {
        if (priority !== 'all' && alarm.priority !== priority) return false;
        if (state !== 'all' && alarm.state !== state) return false;
        return true;
      }),
    [inScope, priority, state],
  );

  /* 타일의 'N건 중'이 범위와 어긋나면 안 된다. 라벨도 같은 판정에서 만든다 */
  const scopeLabel = scope === 'site' ? site.name : '전 사업장';

  /**
   * 확인·조치를 누르면 이 숫자가 바로 움직인다 — 목록만 바뀌면 처리한 티가 나지 않는다.
   * 우선순위·상태 필터는 **일부러** 반영하지 않는다. 그 필터로 걸러낸 건도 세션 집계에는
   * 남아야 한다.
   */
  const tally = useMemo(
    () => ({
      open: inScope.filter((a) => a.state === 'open').length,
      urgent: inScope.filter((a) => a.priority === 'urgent' && a.state !== 'resolved').length,
      resolved: inScope.filter((a) => a.state === 'resolved').length,
    }),
    [inScope],
  );

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label="미확인"
          value={`${tally.open}건`}
          note={`${scopeLabel} ${inScope.length}건 중`}
          accent={tally.open > 0 ? statusInk(STATUS_VISUAL.warning) : undefined}
        />
        <StatTile
          label="미조치 긴급"
          value={`${tally.urgent}건`}
          note="조치 완료 전"
          accent={tally.urgent > 0 ? statusInk(STATUS_VISUAL.critical) : undefined}
        />
        <StatTile label="조치 완료" value={`${tally.resolved}건`} note="이번 세션 기준" />
      </div>

      <Panel
        eyebrow={scopeLabel}
        title={`알람 이력 ${visible.length}건`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {/* 관리자는 자사 1개소뿐이라 고를 것이 없다. 가드가 scope=site로 고정한다 */}
            <div className="role-hide-admin">
              <SegmentedControl
                ariaLabel="사업장 범위"
                options={SCOPE_OPTIONS}
                value={scope}
                onChange={setScope}
              />
            </div>
            <SegmentedControl
              ariaLabel="알람 우선순위"
              options={PRIORITY_OPTIONS}
              value={priority}
              onChange={setPriority}
            />
            <SegmentedControl
              ariaLabel="처리 상태"
              options={STATE_OPTIONS}
              value={state}
              onChange={setState}
            />
          </div>
        }
        bodyClassName="p-0"
      >
        {visible.length === 0 ? (
          <p className="px-4 py-10 text-center text-[12px] text-fg-subtle">
            조건에 맞는 알람이 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((alarm) => (
              <li key={alarm.id}>
                <AlarmRow alarm={alarm} onChange={setAlarmState} />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel eyebrow="시연 안내" title="상태 전이">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-[68ch] text-[12px] leading-relaxed text-fg-muted">
            확인·조치 버튼은 <strong className="text-fg">이 브라우저 안에서만</strong> 상태를
            바꿉니다. 서버가 없어 처리 이력이 저장되지 않으며 새로고침하면 되돌아갑니다. 알람 발송
            채널(SMS·이메일·푸시)과 우선순위–등급 대응 관계는 원문에 정의가 없어(TBD-21) 화면에
            임의로 만들지 않았습니다.
          </p>
          {changedCount > 0 && (
            <button
              type="button"
              onClick={reset}
              className="cursor-pointer whitespace-nowrap rounded-[3px] border border-border px-2.5 py-1.5 text-[11px] text-fg-muted transition-colors duration-200 hover:border-border-strong hover:text-fg"
            >
              변경 {changedCount}건 되돌리기
            </button>
          )}
        </div>
      </Panel>
    </div>
  );
}

function AlarmRow({
  alarm,
  onChange,
}: {
  alarm: Alarm;
  onChange: (id: string, next: AlarmState) => void;
}) {
  return (
    <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5 px-4 py-2.5">
      <span
        className={cn(
          'mt-0.5 shrink-0 rounded-[3px] border px-1.5 py-0.5 text-[11px]',
          PRIORITY_CHIP[alarm.priority],
        )}
      >
        {ALARM_PRIORITY_LABELS[alarm.priority]}
      </span>

      <div className="min-w-0 flex-1 basis-[220px]">
        <p className="text-[12px] text-fg">{alarm.title}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-fg-subtle">{alarm.detail}</p>
      </div>

      <div className="w-[124px] shrink-0 text-[11px] text-fg-subtle">
        <p className="truncate text-fg-muted">{alarm.siteName}</p>
        <p className="truncate">{ALARM_CONDITION_LABELS[alarm.condition]}</p>
      </div>

      <div className="w-[120px] shrink-0 text-right text-[11px] text-fg-subtle">
        <p className="num">{formatDateTime(alarm.raisedAtIso)}</p>
        <p>
          {formatRelative(alarm.raisedAtIso, DEMO_NOW_ISO)} · {DISPLAY_TIMEZONE}
        </p>
      </div>

      <div className="flex w-[176px] shrink-0 items-center justify-end gap-2">
        <span
          className={cn(
            'whitespace-nowrap rounded-[3px] border px-1.5 py-0.5 text-[11px]',
            STATE_CHIP[alarm.state],
          )}
        >
          {ALARM_STATE_LABELS[alarm.state]}
        </span>
        <AlarmStateActions alarm={alarm} onChange={onChange} />
      </div>
    </div>
  );
}
