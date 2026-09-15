'use client';

import { useMemo, useState } from 'react';
import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { SCOPE_FILTERS, SCOPE_OPTIONS, SCOPE_QUERY_KEY } from '@/shared/config/scope';
import { useQueryState } from '@/shared/lib/use-query-state';
import { useMunicipality } from '@/shared/lib/use-scope';
import { STATUS_VISUAL, statusInk } from '@/shared/config/status-visual';
import { Panel } from '@/shared/ui/panel';
import { SegmentedControl } from '@/shared/ui/segmented-control';
import { StatTile } from '@/shared/ui/stat-tile';
import { InfoTip } from '@/shared/ui/tooltip';
import type { Alarm } from '@/entities/alarm';
import { getSite, scopeLabelOf, siteIdsInScope, withinScope } from '@/entities/site';
import { ALL_ALARMS, useAlarmStates } from '@/features/alarm-ack';
import { groupAlarmsByDay } from '../lib/group-by-day';
import { AlarmDetailModal } from './alarm-detail-modal';
import { AlarmRow } from './alarm-row';
import { useSelectedSiteId } from '@/features/site-selection';
import {
  PRIORITY_FILTERS,
  PRIORITY_OPTIONS,
  PRIORITY_QUERY_KEY,
  STATE_FILTERS,
  STATE_OPTIONS,
  STATE_QUERY_KEY,
} from '../config/constants';

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
  /* 관할은 계정이 정하고 라우트 가드가 URL에 박는다 — 여기서는 읽기만 한다 */
  const municipality = useMunicipality();

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
    () => withinScope(alarms, siteIdsInScope(scope, { siteId, municipality })),
    [alarms, scope, siteId, municipality],
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
  const scopeLabel = scopeLabelOf(scope, { siteName: site.name, municipality });

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

      {/* 줄마다 되풀이되던 설비 이상 사유를 여기 한 곳으로 올렸다 — §8 `보조 설명`(제목 옆 툴팁) */}
      <Panel
        title={`알람 이력 ${visible.length}건`}
        titleAside={
          <InfoTip
            label="설비 이상 줄을 읽는 법"
            content="설비 이상은 값의 크기를 내지 않고 이상 여부만 냅니다 — 진동 센서의 측정 범위·정확도가 원문에 없어, 숫자를 적으면 재지 않은 값을 주장하게 됩니다. 줄에는 이상이 얼마나 이어졌는지만 적습니다."
          />
        }
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
            채널(SMS·이메일·푸시)과 우선순위–등급 대응 관계는 원문에 정의가 없어 화면에
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
