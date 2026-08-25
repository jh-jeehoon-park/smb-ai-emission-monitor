'use client';

import { useMemo, useState } from 'react';
import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { DISPLAY_TIMEZONE, formatDateTime, formatRelative } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { BADGE_BASE } from '@/shared/ui/badge';
import { SCOPE_FILTERS, SCOPE_OPTIONS, SCOPE_QUERY_KEY } from '@/shared/config/scope';
import { useQueryState } from '@/shared/lib/use-query-state';
import { STATUS_VISUAL, statusInk } from '@/shared/config/status-visual';
import { Panel } from '@/shared/ui/panel';
import { SegmentedControl } from '@/shared/ui/segmented-control';
import { StatTile } from '@/shared/ui/stat-tile';
import { StatusBadge } from '@/shared/ui/status-badge';
import {
  ALARM_CONDITION_LABELS,
  ALARM_PRIORITY_LABELS,
  ALARM_STATE_LABELS,
  raisedWhileNotDischarging,
  type Alarm,
  type AlarmPriority,
  type AlarmState,
} from '@/entities/alarm';
import { getSite } from '@/entities/site';
import { ALL_ALARMS, AlarmStateActions, useAlarmStates } from '@/features/alarm-ack';
import { groupAlarmsByDay } from '../lib/group-by-day';
import { AlarmDetailModal } from './alarm-detail-modal';
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
  urgent: 'bg-chip-critical text-critical-ink',
  caution: 'bg-chip-warning text-warning-ink',
  /* 원문 팔레트의 `정보 활성화` = 파랑. `알람 목록`의 우선순위 칩과 같은 값이다 */
  info: 'bg-chip-info text-info-ink',
};

/* 상태는 등급이 아니다 — 상태색을 쓰지 않고 중립 면의 밝기로 셋을 가른다 */
const STATE_CHIP: Record<AlarmState, string> = {
  open: 'bg-surface-3 text-fg',
  acknowledged: 'bg-surface-2 text-fg-muted',
  resolved: 'bg-surface-2 text-fg-subtle',
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

  const source = useMemo(() => [...ALL_ALARMS].sort(byRaisedAtDesc), []);
  const { alarms, changedCount, setState: setAlarmState, reset } = useAlarmStates(source);
  /* 선택은 id로 들고 목록에서 되찾는다 — 알람 객체를 들면 확인 처리 뒤 상태가 옛 값으로 굳는다 */
  const [openId, setOpenId] = useState<string | null>(null);

  /**
   * 범위 판정을 **한 곳에서만** 한다. 목록과 상단 타일이 각자 범위를 계산하던 탓에
   * 세그먼트를 '선택 사업장'으로 바꿔도 타일 숫자는 전 사업장 그대로였다.
   *
   * 사업장에 남의 사업장 합계가 보이면 자사 1개소라는 전제가 깨진다(회의 2026-08-20).
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

  /* 목록 순서는 그대로 두고 날짜 경계에서만 끊는다 */
  const groups = useMemo(() => groupAlarmsByDay(visible, DEMO_NOW_ISO), [visible]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-3">
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
        title={`알람 이력 ${visible.length}건`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {/* 사업장은 자사 1개소뿐이라 고를 것이 없다. 가드가 scope=site로 고정한다 */}
            <div className="role-hide-site">
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
      >
        {visible.length === 0 ? (
          <p className="py-10 text-center text-[12px] text-fg-subtle">
            조건에 맞는 알람이 없습니다.
          </p>
        ) : (
          /*
           * **하루가 한 묶음이다** `[사용자 지시 2026-08-25]`. 16건이 한 덩어리로 이어지면
           * "언제 일어난 일인가"를 줄마다 다시 읽어야 한다 — 이력의 첫 질문은 시점이므로
           * 날짜가 목록의 위계를 만든다.
           *
           * 그룹 머리는 스크롤 중에도 붙어 있다(`sticky`) — 긴 하루를 내려가는 동안 지금 보는
           * 날이 화면 밖으로 나가면 묶은 의미가 없다. 카드 여백을 음수로 되돌려 띠가 카드 폭을
           * 채우고, 그 위로 지나가는 줄이 비치지 않게 불투명 면을 깐다.
           */
          <div className="space-y-4">
            {groups.map((group) => (
              <section key={group.date}>
                <div className="sticky top-[calc(var(--header-h)_+_0.5rem)] z-10 -mx-5 flex items-center justify-between gap-2 border-b border-border bg-surface px-5 pb-1.5 pt-1">
                  <h3 className="text-[12px] font-bold text-fg">{group.label}</h3>
                  <span className="num text-[12px] text-fg-subtle">{group.alarms.length}건</span>
                </div>
                <ul className="divide-y divide-border">
                  {group.alarms.map((alarm) => (
                    <li key={alarm.id}>
                      <AlarmRow
                        alarm={alarm}
                        onChange={setAlarmState}
                        onOpen={() => setOpenId(alarm.id)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Panel>

      <AlarmDetailModal
        alarm={alarms.find((a) => a.id === openId) ?? null}
        onClose={() => setOpenId(null)}
        onChange={setAlarmState}
      />

      <Panel title="상태 전이">
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
              className="cursor-pointer whitespace-nowrap rounded-[3px] border border-border px-2.5 py-1.5 text-[12px] text-fg-muted transition-colors duration-200 hover:border-border-strong hover:text-fg"
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
  onOpen,
}: {
  alarm: Alarm;
  onChange: (id: string, next: AlarmState) => void;
  onOpen: () => void;
}) {
  return (
    /*
     * **알람 목록 카드와 같은 위계를 쓴다** `[사용자 지시 2026-08-25]` — 제목 → 상세 → 메타.
     * 이력 화면만 뱃지 넷을 앞뒤로 늘어놓던 판본은 같은 알람이 화면마다 다른 부품으로 보였다.
     *
     * 이 화면에만 있는 것은 오른쪽의 **처리 조작**(확인·조치)이다. 그것만 따로 세우고 나머지
     * 분류(등급·조건·우선순위·사업장·시각)는 제목 아래 메타 줄로 내린다.
     */
    <div className="flex flex-wrap items-start gap-x-3 gap-y-2 py-3">
      <div className="min-w-0 flex-1 basis-[280px]">
        {/*
         * 제목을 버튼으로 둔다 — 행 전체를 누르게 하면 안쪽 확인·조치 버튼과 조작이 겹친다.
         * 키보드로도 순서대로 닿는다.
         */}
        <button
          type="button"
          onClick={onOpen}
          className="cursor-pointer text-left text-[14px] font-bold leading-snug text-fg underline decoration-transparent underline-offset-2 transition-colors duration-200 hover:text-accent hover:decoration-accent"
        >
          {alarm.title}
        </button>
        <p className="mt-1.5 line-clamp-2 max-w-[60ch] text-[13px] leading-relaxed text-fg-muted">
          {alarm.detail}
        </p>

        {/*
         * **메타는 두 갈래다** `[사용자 지시 2026-08-25]`. 뱃지 셋과 글자 넷이 한 줄에 섞여
         * 있던 판본은 일곱 조각이 모두 같은 무게로 늘어서 무엇부터 읽어야 할지 알 수 없었다.
         *
         *  · **분류**(등급·조건·우선순위) — 뱃지. 색이 뜻을 가지므로 앞에 선다
         *  · **정황**(사업장·시각) — 맨 글자. 읽을 때만 필요한 값이라 뒤로 물린다
         *
         * 둘 사이는 세로선으로 가른다 — 간격만으로는 줄바꿈됐을 때 어디까지가 분류인지 사라진다.
         */}
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
          {/*
           * **등급과 우선순위는 다른 축이다** `[원문 발표 p.20 그림]` — 그 표가
           * `등급 · 구분 · 발생 시간 · 우선순위` 순서로 둘을 양 끝에 둔다. 대응 규칙은 원문에
           * 없어 추정이다 `[INC-02]`(근거는 `assumptions.md` §3.1). 한 줄에 두되 **사이에
           * 조건 칩을 끼워** 위험(빨강)과 긴급(빨강)이 붙어 한 덩어리로 보이지 않게 한다.
           */}
          <StatusBadge level={alarm.level} />
          <span className={cn(BADGE_BASE, 'bg-surface-3 text-fg-muted')}>
            {ALARM_CONDITION_LABELS[alarm.condition]}
          </span>
          <span className={cn(BADGE_BASE, 'font-medium', PRIORITY_CHIP[alarm.priority])}>
            {ALARM_PRIORITY_LABELS[alarm.priority]}
          </span>

          <span aria-hidden className="h-3 w-px shrink-0 bg-border" />

          <span className="flex flex-wrap items-center gap-x-1.5 text-[12px] text-fg-subtle">
            <span className="truncate">{alarm.siteName}</span>
            <span aria-hidden>·</span>
            <span className="num">
              {formatDateTime(alarm.raisedAtIso)} {DISPLAY_TIMEZONE}
            </span>
            <span aria-hidden>·</span>
            <span className="num">{formatRelative(alarm.raisedAtIso, DEMO_NOW_ISO)}</span>
          </span>

          {/* 방류하지 않는 동안의 수질값은 배출 수질이 아니다. 배출기준 초과로 읽히면 안 된다 */}
          {raisedWhileNotDischarging(alarm) && (
            <span
              className={cn(BADGE_BASE, 'bg-chip-caution')}
              style={{ color: statusInk(STATUS_VISUAL.caution) }}
            >
              비방류 중 발생
            </span>
          )}
        </div>
      </div>

      {/* 이 화면의 본업 — 처리 상태와 그 조작. 오른쪽 끝에 고정해 세로로 훑힌다 */}
      <div className="flex shrink-0 items-center gap-2">
        <span className={cn(BADGE_BASE, 'whitespace-nowrap', STATE_CHIP[alarm.state])}>
          {ALARM_STATE_LABELS[alarm.state]}
        </span>
        <AlarmStateActions alarm={alarm} onChange={onChange} />
      </div>
    </div>
  );
}
