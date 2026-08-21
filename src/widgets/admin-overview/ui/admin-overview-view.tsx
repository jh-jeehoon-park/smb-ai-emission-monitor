'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { PROVISIONAL_DISPLAY_DECIMALS, PROVISIONAL_STATUS_LABELS } from '@/shared/config/provisional';
import { STATUS_VISUAL, statusInk } from '@/shared/config/status-visual';
import { Panel } from '@/shared/ui/panel';
import { RiseItem, StaggerGroup } from '@/shared/ui/motion';
import { StatTile } from '@/shared/ui/stat-tile';
import { StatusBadge } from '@/shared/ui/status-badge';
import { countOpen } from '@/entities/alarm';
import { getAnomalySeries, getAnomalySummary } from '@/entities/anomaly';
import { EQUIPMENT_SIGNAL_LABELS, getEquipment, sortEquipment } from '@/entities/equipment';
import { energyIntensity, getMeasurementSeries } from '@/entities/measurement';
import { CHEMICAL_SAVING_RANGE, getOptimization } from '@/entities/optimization';
import { getSite } from '@/entities/site';
import { allAlarmsForSite, useAlarmStates } from '@/features/alarm-ack';
import { useSelectedSiteId, useSiteHref } from '@/features/site-selection';
import { AlarmList } from '@/widgets/alarm-list';
import { AnomalyPanel } from '@/widgets/anomaly-panel';
import { DailyRibbon, buildRibbon } from '@/widgets/daily-ribbon';
import { EquipmentPanel } from '@/widgets/equipment-panel';

/**
 * 사업장 사용자가 여기서 답을 얻어야 하는 세 질문 — 괜찮은가 / 얼마나 줄었나 / 뭘 해야 하나.
 *
 * 가운데가 **금액에서 절감률로** 바뀌었다 `[사용자 결정 2026-08-20: 금액은 전부 지우고 % 만
 * 남긴다]`. 사업장별 단가가 없어(`[TBD-41]`) 금액이 전부 원문 예시값이었다.
 */
/** 절감 현황을 뺐다 — 그 화면을 메뉴에서 감췄으므로 여기 링크만 남으면 유일한 입구가 된다 */
const SHORTCUTS = [
  { href: '/process', label: '수처리 공정' },
  { href: '/anomaly', label: '이상 탐지' },
  { href: '/prediction', label: '오염도 추정' },
] as const;

/**
 * 사업장의 자사 1개소 현황.
 *
 * `REQ-AD-004`(실시간 모니터링 + AI 예측 + 알람을 **한 화면에**, 원문 p.45)를 관리자 범위로
 * 채운다. 같은 요건을 담은 통합 관제(SCR-OP-001)는 다사업장 요건(REQ-AD-026·027·028)까지
 * 함께 안고 있어 사업장에 닫혀 있다 — 범위 중립인 부분만 여기서 되살린다.
 *
 * **통합 관제를 복제하지 않는다.** 수질 계측 그리드·예측 차트는 SCR-OP-003·004가 전폭으로
 * 보여준다. 여기 다시 넣으면 어느 쪽이 정본인지 흐려진다.
 */
export function AdminOverviewView() {
  const { siteId } = useSelectedSiteId();
  const withSite = useSiteHref();
  const site = getSite(siteId);

  const detail = useMemo(() => {
    const series = getMeasurementSeries(siteId);
    const alarms = allAlarmsForSite(siteId);

    return {
      ribbon: buildRibbon(siteId, series, getAnomalySeries(siteId), alarms),
      anomalySummary: getAnomalySummary(siteId),
      alarms,
      equipment: sortEquipment(getEquipment(siteId), 'status'),
      optimization: getOptimization(siteId, energyIntensity(series)),
    };
  }, [siteId]);

  /* 확인 처리가 헤더·사이드바와 함께 반영되도록 공유 상태를 읽는다 */
  const { alarms } = useAlarmStates(detail.alarms);
  const openAlarms = countOpen(alarms);
  /* 절감률은 XMARL-PPO 산출값이다. 금액으로 환산하지 않는다 — 단가가 없다(`[TBD-41]`) */
  const chemicalRate = detail.optimization.online
    ? detail.optimization.dosing.savingRate
    : null;
  /* 정렬이 등급 나쁜 순이라 첫 항목이 지금 가장 나쁜 설비다 — 교체 시점이 아니라 이상이다 `[INC-107]` */
  const worstEquipment = detail.equipment[0];

  return (
    <div className="space-y-3">
      <Panel
        eyebrow={`${site.name} · ${site.region}`}
        title="일간 운전"
        action={
          <div className="flex items-center gap-2 text-[12px]">
            {site.status ? (
              <StatusBadge level={site.status} size="sm" />
            ) : (
              <span className="text-fg-subtle">수신 없음</span>
            )}
          </div>
        }
      >
        <DailyRibbon data={detail.ribbon} dateIso={DEMO_NOW_ISO} />
      </Panel>

      <StaggerGroup className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <RiseItem>
          <StatTile
            label="이상 점수"
            value={site.anomalyScore === null ? '—' : `${site.anomalyScore}`}
            note={site.status ? PROVISIONAL_STATUS_LABELS[site.status] : '통신 두절'}
            accent={site.status ? statusInk(STATUS_VISUAL[site.status]) : undefined}
          />
        </RiseItem>
        <RiseItem>
          <StatTile
            label="미확인 알람"
            value={`${openAlarms}건`}
            note={openAlarms > 0 ? '확인 필요' : '확인할 알람 없음'}
            accent={openAlarms > 0 ? statusInk(STATUS_VISUAL.critical) : undefined}
          />
        </RiseItem>
        <RiseItem>
          <StatTile
            label="약품비 절감률"
            value={
              chemicalRate === null
                ? '—'
                : `${chemicalRate.toFixed(PROVISIONAL_DISPLAY_DECIMALS.savingRate)}%`
            }
            note={
              chemicalRate === null
                ? '통신 두절로 산출 불가'
                : `목표 ${CHEMICAL_SAVING_RANGE[0]}~${CHEMICAL_SAVING_RANGE[1]}%`
            }
          />
        </RiseItem>
        <RiseItem>
          <StatTile
            label="이상 설비"
            value={worstEquipment ? worstEquipment.name : '—'}
            note={
              worstEquipment && site.online
                ? worstEquipment.signals.length === 0
                  ? '이상 신호 없음'
                  : worstEquipment.signals.map((s) => EQUIPMENT_SIGNAL_LABELS[s]).join(' · ')
                : '통신 두절로 수신 없음'
            }
            accent={
              worstEquipment && site.online
                ? statusInk(STATUS_VISUAL[worstEquipment.status])
                : undefined
            }
          />
        </RiseItem>
      </StaggerGroup>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel eyebrow="AutoEncoder · XAI" title="이상 탐지 결과">
          <AnomalyPanel summary={detail.anomalySummary} />
        </Panel>

        <Panel eyebrow={`미확인 ${openAlarms}건`} title="알람" bodyClassName="px-4 py-3">
          <AlarmList alarms={alarms} nowIso={DEMO_NOW_ISO} selectedSiteId={siteId} />
        </Panel>
      </div>

      <Panel
        eyebrow="설비 이상 탐지"
        title="설비 상태"
        action={<span className="text-[12px] text-fg-subtle">상태 나쁜 순</span>}
      >
        <EquipmentPanel items={detail.equipment} online={site.online} />
      </Panel>

      <nav className="flex flex-wrap gap-2" aria-label="상세 화면 바로가기">
        {SHORTCUTS.map((shortcut) => (
          <Link
            key={shortcut.href}
            href={withSite(shortcut.href)}
            className="rounded-[4px] border border-border bg-surface px-2.5 py-1.5 text-[12px] text-fg-muted transition-colors duration-200 hover:border-border-strong hover:bg-surface-2 hover:text-fg"
          >
            {shortcut.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
