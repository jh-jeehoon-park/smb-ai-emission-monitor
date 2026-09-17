'use client';

import { useMemo, useState } from 'react';
import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { OPERATING_FILL } from '@/shared/config/operating-visual';
import { Panel } from '@/shared/ui/panel';
import { StatusBadge } from '@/shared/ui/status-badge';

import {
  EQUIPMENT_SIGNAL_LABELS,
  getEquipment,
  sortEquipment,
  type Equipment,
} from '@/entities/equipment';
import { SITES, getSite } from '@/entities/site';
import { allAlarmsForSite } from '@/features/alarm-ack';
import { useScopedSites, useSelectedSiteId } from '@/features/site-selection';
import { AlarmList } from '@/widgets/alarm-list';
import { EquipmentPanel } from '@/widgets/equipment-panel';
import { EquipmentDetailModal } from './equipment-detail-modal';
import { StatusHeatmap } from './status-heatmap';
import { cn } from '@/shared/lib/cn';
import { CROSS_SITE_RANK_LIMIT } from '../config/constants';
import { rankAcrossSites } from '../lib/rank-across-sites';
import { TABLE_HEAD_CELL, TABLE_HEAD_ROW, TABLE_ROOT, TABLE_ROW, TABLE_SCROLL } from '@/shared/ui/table';
import { InfoTip } from '@/shared/ui/tooltip';

const OFFLINE_SITE_COUNT = SITES.filter((site) => !site.online).length;

export function EquipmentView() {
  const { siteId } = useSelectedSiteId();
  const site = getSite(siteId);
  const [openId, setOpenId] = useState<string | null>(null);

  const view = useMemo(
    () => ({
      /*
       * **정렬 축은 `상태 나쁜 순` 하나다** `[사용자 요청 2026-09-08]`. 세그먼트로 셋 중
       * 하나를 고르게 했었는데, 넷뿐인 카드에서 순서를 바꿔 봐야 읽는 것이 달라지지 않고
       * 나머지 두 축(지속·신호 수)은 상세표가 열로 이미 보여 준다. 통합 관제·비용 절감이
       * 쓰는 것도 같은 `'status'`라 화면끼리 순서가 어긋나지 않게 된다.
       */
      items: sortEquipment(getEquipment(siteId), 'status'),
      /* 설비 상태에서 만든 알람이 여기 들어온다 — 손으로 쓴 목록에는 두 사업장만 있었다 */
      alarms: allAlarmsForSite(siteId).filter((a) => a.condition === 'equipment'),
    }),
    [siteId],
  );

  return (
    <div className="space-y-6">
      <Panel
        title="설비 상태 요약"
        /* 순서를 고를 수 없게 됐으니 무슨 순서인지는 적어 둔다 — 통합 관제·사업장 상세와 같은 문구다 */
        titleAside={<InfoTip label="정렬 기준" content="상태가 나쁜 설비부터 정렬합니다." />}
      >
        <EquipmentPanel items={view.items} online={site.online} onSelect={(eq) => setOpenId(eq.id)} />

        <EquipmentDetailModal
          equipment={view.items.find((eq) => eq.id === openId) ?? null}
          alarms={view.alarms}
          onClose={() => setOpenId(null)}
        />
      </Panel>

      <Panel
        title="설비별 상태 추이"
        titleAside={
          <InfoTip
            label="이 격자의 값"
            content="상태 이력 저장소가 없어 시연용으로 만든 값입니다(REQ-AD-019)."
          />
        }
      >
        <StatusHeatmap siteId={siteId} items={view.items} />
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel
          title="설비 상세"
          titleAside={
            <InfoTip label="센서 사양" content="진동 센서 사양은 원문에 없습니다." />
          }
        >
          {site.online ? (
            <EquipmentTable items={view.items} />
          ) : (
            <p className=" py-10 text-center text-[12px] text-fg-subtle">
              통신이 두절된 사업장입니다. 마지막 수신 이후의 설비 지표가 없어 표를 비워 둡니다.
            </p>
          )}
        </Panel>

        <Panel title="관련 알람">
          <AlarmList alarms={view.alarms} nowIso={DEMO_NOW_ISO} selectedSiteId={siteId} />
        </Panel>
      </div>

      {/* 정비 인력이 사업장을 가로지른다는 전제의 블록이다. 자사 1개소에는 해당하지 않고,
          상단 설비 표와 같은 설비가 그대로 다시 나와 중복이 된다 */}
      <Panel
        className="role-hide-site"
        title="이상 발생 설비 순위"
        titleAside={
          <InfoTip
            label="집계 범위"
            content={
              OFFLINE_SITE_COUNT > 0
                ? `통신 두절 ${OFFLINE_SITE_COUNT}개소는 수신값이 없어 제외합니다.`
                : '정비 인력은 사업장을 가로질러 움직이므로 전 사업장을 함께 셉니다.'
            }
          />
        }
      >
        <CrossSiteRanking selectedSiteId={siteId} />
      </Panel>
    </div>
  );
}

/** 한 사업장 안에서만 줄을 세우면 어느 사업장부터 갈지는 알 수 없다(FR-21) */
function CrossSiteRanking({ selectedSiteId }: { selectedSiteId: string }) {
  const scopedSites = useScopedSites();
  /* 순위 대상이 곧 범위다 — 관할 밖 설비가 순위에 들어가면 감독 범위가 무너진다 */
  const rows = useMemo(() => rankAcrossSites(scopedSites, CROSS_SITE_RANK_LIMIT), [scopedSites]);

  return (
    <ol className="divide-y divide-border">
      {rows.map((row, index) => {
        return (
          <li
            key={`${row.siteId}-${row.equipment.id}`}
            /*
             * **목록 한 줄의 글자 단을 화면 전반과 맞춘다** `[사용자 지시 2026-08-25]` —
             * 설비명 14 bold(무엇인가) · 이상 신호 13 muted(그것의 내용) · 사업장·지속 12 subtle
             * (곁의 사실). 전부 12px이던 판본은 다섯 조각이 같은 무게로 늘어서 순위 목록인지
             * 표인지 알 수 없었다.
             *
             * 지금 보고 있는 사업장 줄은 옅은 면으로 남긴다 — 순위에서 내 자리를 찾는 것이
             * 이 목록의 첫 쓰임이다.
             */
            className={cn(
              'flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5',
              row.siteId === selectedSiteId && 'bg-surface-2',
            )}
          >
            {/* 순위 숫자는 값이라 굵게 — 1·2·3이 먼저 읽혀야 순위 목록으로 읽힌다 */}
            <span className="num w-5 shrink-0 text-[13px] font-bold text-fg-subtle">
              {index + 1}
            </span>

            <span className="min-w-0 flex-1 basis-[200px]">
              <span className="block truncate text-[14px] font-bold leading-snug text-fg">
                {row.equipment.name}
              </span>
              <span className="mt-0.5 block truncate text-[12px] text-fg-subtle">
                {row.siteName} · {row.region}
              </span>
            </span>

            {/* 수치는 한 덩어리로 묶어 좁은 화면에서 통째로 다음 줄로 내려가게 한다 */}
            <span className="flex shrink-0 items-center gap-3">
              <StatusBadge level={row.equipment.status} />
              <span className="w-[128px] text-right text-[13px] text-fg-muted">
                {row.equipment.signals.length === 0
                  ? '이상 없음'
                  : row.equipment.signals.map((sig) => EQUIPMENT_SIGNAL_LABELS[sig]).join(' · ')}
              </span>
              <span className="num w-[56px] text-right text-[12px] text-fg-subtle">
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
    <div className={TABLE_SCROLL}>
      <table className={`${TABLE_ROOT} min-w-[620px] text-[12px] text-center`}>
        <thead>
          <tr className={TABLE_HEAD_ROW}>
            <th className={TABLE_HEAD_CELL}>설비</th>
            <th className={TABLE_HEAD_CELL}>상태</th>
            <th className={TABLE_HEAD_CELL}>가동</th>
            <th className={TABLE_HEAD_CELL}>이상 신호</th>
            <th className={TABLE_HEAD_CELL}>이상 지속</th>
            <th className={TABLE_HEAD_CELL}>누적 가동</th>
          </tr>
        </thead>
        <tbody>
          {items.map((eq) => {
            const state = eq.running === null ? 'unknown' : eq.running ? 'on' : 'off';
            return (
              <tr key={eq.id} className={TABLE_ROW}>
                <td className="px-3 py-3.5 text-fg">{eq.name}</td>
                <td className="px-3 py-3.5">
                  <StatusBadge level={eq.status} />
                </td>
                <td className="px-3 py-3.5">
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
                <td className="px-3 py-3.5 text-fg-muted">
                  {eq.signals.length === 0
                    ? '없음'
                    : eq.signals.map((sig) => EQUIPMENT_SIGNAL_LABELS[sig]).join(' · ')}
                </td>
                <td className="num px-3 py-3.5 text-center text-fg-muted">
                  {eq.anomalyHours === null ? '—' : `${eq.anomalyHours}시간`}
                </td>
                <td className="num px-3 py-3.5 text-center text-fg-subtle">
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
