'use client';

import { useMemo, useState } from 'react';
import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { STATUS_VISUAL, statusInk } from '@/shared/config/status-visual';
import { useQueryState } from '@/shared/lib/use-query-state';
import { Panel } from '@/shared/ui/panel';
import { SegmentedControl } from '@/shared/ui/segmented-control';
import { StatusBadge } from '@/shared/ui/status-badge';
import { getAlarmsForView } from '@/entities/alarm';
import {
  EQUIPMENT_SORT_KEYS,
  EQUIPMENT_SORT_OPTIONS,
  getEquipment,
  sortEquipment,
  type Equipment,
  type EquipmentSortKey,
} from '@/entities/equipment';
import { SITES, getSite } from '@/entities/site';
import { useSelectedSiteId } from '@/features/site-selection';
import { AlarmList } from '@/widgets/alarm-list';
import { EquipmentPanel } from '@/widgets/equipment-panel';
import { EquipmentDetailModal } from './equipment-detail-modal';
import { cn } from '@/shared/lib/cn';
import { CROSS_SITE_RANK_LIMIT, SORT_QUERY_KEY } from '../config/constants';
import { rankAcrossSites } from '../lib/rank-across-sites';

const DEFAULT_SORT: EquipmentSortKey = 'mpi';
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
      alarms: getAlarmsForView(siteId).filter((a) => a.condition === 'equipment'),
    }),
    [siteId, sortBy],
  );

  return (
    <div className="space-y-3">
      <Panel
        eyebrow={`RandomForest · 예지보전 · ${site.name}`}
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

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel
          eyebrow={site.online ? `${view.items.length}대` : '수신 없음'}
          title="설비 상세"
          action={
            <span className="text-[12px] text-fg-subtle">MPI 산정식은 원문에 없다(TBD-22)</span>
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
        className="role-hide-admin"
        eyebrow={`실증 ${SITES.length}개소 전체`}
        title="유지관리 우선순위 추천"
        action={
          <span className="text-[12px] text-fg-subtle">
            {OFFLINE_SITE_COUNT > 0
              ? `통신 두절 ${OFFLINE_SITE_COUNT}개소는 현재 지표가 없어 제외`
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
              <span className="num w-[76px] text-right text-[11px] text-fg-muted">
                고장 {row.equipment.failureProbability}%
              </span>
              <span className="num w-[56px] text-right text-[11px] text-fg-muted">
                {row.equipment.remainingUsefulLifeDays}일
              </span>
              <span className="num w-[44px] text-right text-[13px] text-fg">
                {row.equipment.maintenancePriorityIndex}
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
            <th className="px-3 py-2 text-right font-normal">고장 확률</th>
            <th className="px-3 py-2 text-right font-normal">잔여 수명</th>
            <th className="px-3 py-2 text-right font-normal">MPI</th>
            <th className="px-4 py-2 text-right font-normal">누적 가동</th>
          </tr>
        </thead>
        <tbody>
          {items.map((eq) => {
            const visual = STATUS_VISUAL[eq.status];
            return (
              <tr key={eq.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 text-fg">{eq.name}</td>
                <td className="px-3 py-2.5">
                  <StatusBadge level={eq.status} size="sm" />
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span className="num" style={{ color: statusInk(visual) }}>
                    {eq.failureProbability}%
                  </span>
                  {/* 숫자만으로는 4대의 차이가 눈에 안 들어온다. 같은 축의 막대를 곁들인다 */}
                  <span
                    aria-hidden
                    className="ml-2 inline-block h-[3px] w-14 overflow-hidden rounded-full bg-surface-3 align-middle"
                  >
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${eq.failureProbability}%`,
                        backgroundColor: visual.hex,
                        opacity: 0.8,
                      }}
                    />
                  </span>
                </td>
                <td className="num px-3 py-2.5 text-right text-fg-muted">
                  {eq.remainingUsefulLifeDays}일
                </td>
                <td className="num px-3 py-2.5 text-right text-fg">
                  {eq.maintenancePriorityIndex}
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
