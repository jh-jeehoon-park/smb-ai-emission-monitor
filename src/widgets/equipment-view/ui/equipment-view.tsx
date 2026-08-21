'use client';

import { useMemo, useState } from 'react';
import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { OPERATING_FILL } from '@/shared/config/operating-visual';
import { STATUS_VISUAL } from '@/shared/config/status-visual';
import { useQueryState } from '@/shared/lib/use-query-state';
import { Panel } from '@/shared/ui/panel';
import { SegmentedControl } from '@/shared/ui/segmented-control';
import { StatusBadge } from '@/shared/ui/status-badge';

import {
  EQUIPMENT_SIGNAL_LABELS,
  EQUIPMENT_SORT_KEYS,
  EQUIPMENT_SORT_OPTIONS,
  STATUS_TIMELINE_HOURS,
  getEquipment,
  sortEquipment,
  type Equipment,
  type EquipmentSortKey,
} from '@/entities/equipment';
import { SITES, getSite } from '@/entities/site';
import { allAlarmsForSite } from '@/features/alarm-ack';
import { useSelectedSiteId } from '@/features/site-selection';
import { AlarmList } from '@/widgets/alarm-list';
import { EquipmentPanel } from '@/widgets/equipment-panel';
import { EquipmentDetailModal } from './equipment-detail-modal';
import { StatusHeatmap } from './status-heatmap';
import { cn } from '@/shared/lib/cn';
import { CROSS_SITE_RANK_LIMIT, SORT_QUERY_KEY } from '../config/constants';
import { rankAcrossSites } from '../lib/rank-across-sites';

const DEFAULT_SORT: EquipmentSortKey = 'status';
const OFFLINE_SITE_COUNT = SITES.filter((site) => !site.online).length;

export function EquipmentView() {
  const { siteId } = useSelectedSiteId();
  const [sortBy, setSortBy] = useQueryState(SORT_QUERY_KEY, EQUIPMENT_SORT_KEYS, DEFAULT_SORT);
  const site = getSite(siteId);
  /* 선택은 id로 든다 — 정렬이 바뀌어도 같은 설비를 가리킨다 */
  const [openId, setOpenId] = useState<string | null>(null);

  const view = useMemo(
    () => ({
      items: sortEquipment(getEquipment(siteId), sortBy),
      /* 설비 상태에서 만든 알람이 여기 들어온다 — 손으로 쓴 목록에는 두 사업장만 있었다 */
      alarms: allAlarmsForSite(siteId).filter((a) => a.condition === 'equipment'),
    }),
    [siteId, sortBy],
  );

  return (
    <div className="space-y-3">
      <Panel
        eyebrow={`설비 이상 탐지 · ${site.name}`}
        title="설비 상태 요약"
        action={
          <SegmentedControl
            ariaLabel="설비 정렬 기준"
            options={EQUIPMENT_SORT_OPTIONS}
            value={sortBy}
            onChange={setSortBy}
          />
        }
      >
        <EquipmentPanel items={view.items} online={site.online} onSelect={(eq) => setOpenId(eq.id)} />

        <EquipmentDetailModal
          equipment={view.items.find((eq) => eq.id === openId) ?? null}
          alarms={view.alarms}
          onClose={() => setOpenId(null)}
        />
      </Panel>

      <Panel
        eyebrow={site.online ? `최근 ${STATUS_TIMELINE_HOURS}시간` : '수신 없음'}
        title="설비별 상태 추이"
        action={
          site.online ? (
            <span className="text-[12px] text-fg-subtle">
              상태 이력 저장소가 없어 시연용으로 만든 값이다(REQ-AD-019)
            </span>
          ) : null
        }
      >
        <StatusHeatmap siteId={siteId} items={view.items} />
      </Panel>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel
          eyebrow={site.online ? `${view.items.length}대` : '수신 없음'}
          title="설비 상세"
          action={
            <span className="text-[12px] text-fg-subtle">
              진동 센서 사양은 원문에 없다(TBD-49)
            </span>
          }
          bodyClassName="p-0"
        >
          {site.online ? (
            <EquipmentTable items={view.items} />
          ) : (
            <p className="px-4 py-10 text-center text-[12px] text-fg-subtle">
              통신이 두절된 사업장입니다. 마지막 수신 이후의 설비 지표가 없어 표를 비워 둡니다.
            </p>
          )}
        </Panel>

        <Panel
          eyebrow={`설비 이상 조건 ${view.alarms.length}건`}
          title="관련 알람"
          bodyClassName="px-4 py-3"
        >
          <AlarmList alarms={view.alarms} nowIso={DEMO_NOW_ISO} selectedSiteId={siteId} />
        </Panel>
      </div>

      {/* 정비 인력이 사업장을 가로지른다는 전제의 블록이다. 자사 1개소에는 해당하지 않고,
          상단 설비 표와 같은 설비가 그대로 다시 나와 중복이 된다 */}
      <Panel
        className="role-hide-site"
        eyebrow={`실증 ${SITES.length}개소 전체`}
        title="이상 발생 설비 순위"
        action={
          <span className="text-[12px] text-fg-subtle">
            {OFFLINE_SITE_COUNT > 0
              ? `통신 두절 ${OFFLINE_SITE_COUNT}개소는 수신값이 없어 제외`
              : '정비 인력은 사업장을 가로질러 움직인다'}
          </span>
        }
        bodyClassName="p-0"
      >
        <CrossSiteRanking selectedSiteId={siteId} />
      </Panel>
    </div>
  );
}

/** 한 사업장 안에서만 줄을 세우면 어느 사업장부터 갈지는 알 수 없다(FR-21) */
function CrossSiteRanking({ selectedSiteId }: { selectedSiteId: string }) {
  const rows = useMemo(() => rankAcrossSites(CROSS_SITE_RANK_LIMIT), []);

  return (
    <ol className="divide-y divide-border">
      {rows.map((row, index) => {
        const visual = STATUS_VISUAL[row.equipment.status];
        return (
          <li
            key={`${row.siteId}-${row.equipment.id}`}
            className={cn(
              'flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2',
              row.siteId === selectedSiteId && 'bg-surface-2',
            )}
          >
            <span className="num w-5 shrink-0 text-[11px] text-fg-subtle">{index + 1}</span>
            <span
              aria-hidden
              className="h-6 w-[3px] shrink-0 rounded-full"
              style={{ backgroundColor: visual.hex }}
            />
            <span className="min-w-0 flex-1 basis-[180px] text-[12px] text-fg">
              {row.equipment.name}
              <span className="ml-2 text-[11px] text-fg-subtle">
                {row.siteName} · {row.region}
              </span>
            </span>

            {/* 수치는 한 덩어리로 묶어 좁은 화면에서 통째로 다음 줄로 내려가게 한다 */}
            <span className="flex shrink-0 items-center gap-3">
              <StatusBadge level={row.equipment.status} size="sm" />
              <span className="w-[112px] text-right text-[11px] text-fg-muted">
                {row.equipment.signals.length === 0
                  ? '이상 없음'
                  : row.equipment.signals.map((sig) => EQUIPMENT_SIGNAL_LABELS[sig]).join(' · ')}
              </span>
              <span className="num w-[56px] text-right text-[11px] text-fg-muted">
                {row.equipment.anomalyHours === null ? '—' : `${row.equipment.anomalyHours}시간`}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function EquipmentTable({ items }: { items: Equipment[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] border-collapse text-[12px]">
        <thead>
          <tr className="border-b border-border text-[11px] text-fg-subtle">
            <th className="px-4 py-2 text-left font-normal">설비</th>
            <th className="px-3 py-2 text-left font-normal">상태</th>
            <th className="px-3 py-2 text-left font-normal">가동</th>
            <th className="px-3 py-2 text-left font-normal">이상 신호</th>
            <th className="px-3 py-2 text-right font-normal">이상 지속</th>
            <th className="px-4 py-2 text-right font-normal">누적 가동</th>
          </tr>
        </thead>
        <tbody>
          {items.map((eq) => {
            const state = eq.running === null ? 'unknown' : eq.running ? 'on' : 'off';
            return (
              <tr key={eq.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 text-fg">{eq.name}</td>
                <td className="px-3 py-2.5">
                  <StatusBadge level={eq.status} size="sm" />
                </td>
                <td className="px-3 py-2.5">
                  <span className="flex items-center gap-1.5 text-fg-muted">
                    {/* 색이 뜻을 갖는 축이라 점을 곁들인다. 등급 색이 아니라 가동 색이다 */}
                    <span
                      aria-hidden
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: OPERATING_FILL[state] }}
                    />
                    {RUN_LABEL[state]}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-fg-muted">
                  {eq.signals.length === 0
                    ? '없음'
                    : eq.signals.map((sig) => EQUIPMENT_SIGNAL_LABELS[sig]).join(' · ')}
                </td>
                <td className="num px-3 py-2.5 text-right text-fg-muted">
                  {eq.anomalyHours === null ? '—' : `${eq.anomalyHours}시간`}
                </td>
                <td className="num px-4 py-2.5 text-right text-fg-subtle">
                  {eq.runtimeHours.toLocaleString('ko-KR')}h
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const RUN_LABEL = { on: '가동', off: '정지', unknown: '모름' } as const;
