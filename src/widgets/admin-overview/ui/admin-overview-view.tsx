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
import { countOpen, getAlarmsForView } from '@/entities/alarm';
import { getAnomalySeries, getAnomalySummary } from '@/entities/anomaly';
import { getEquipment, sortEquipment } from '@/entities/equipment';
import { energyIntensity, getMeasurementSeries } from '@/entities/measurement';
import { calcCostSavings, formatKrw, getOptimization } from '@/entities/optimization';
import { getSite } from '@/entities/site';
import { useAlarmStates } from '@/features/alarm-ack';
import { useSelectedSiteId, useSiteHref } from '@/features/site-selection';
import { AlarmList } from '@/widgets/alarm-list';
import { AnomalyPanel } from '@/widgets/anomaly-panel';
import { DailyRibbon, buildRibbon } from '@/widgets/daily-ribbon';
import { EquipmentPanel } from '@/widgets/equipment-panel';

/** 관리자가 여기서 답을 얻어야 하는 세 질문 — 괜찮은가 / 돈은 / 뭘 해야 하나 */
const SHORTCUTS = [
  { href: '/process', label: '수처리 공정' },
  { href: '/anomaly', label: '이상 탐지' },
  { href: '/prediction', label: '오염도 추정' },
  { href: '/cost-savings', label: '절감 현황' },
] as const;

/**
 * 관리자의 자사 1개소 현황.
 *
 * `REQ-AD-004`(실시간 모니터링 + AI 예측 + 알람을 **한 화면에**, 원문 p.45)를 관리자 범위로
 * 채운다. 같은 요건을 담은 통합 관제(SCR-OP-001)는 다사업장 요건(REQ-AD-026·027·028)까지
 * 함께 안고 있어 관리자에게 닫혀 있다 — 범위 중립인 부분만 여기서 되살린다.
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
    const alarms = getAlarmsForView(siteId);

    return {
      ribbon: buildRibbon(siteId, series, getAnomalySeries(siteId), alarms),
      anomalySummary: getAnomalySummary(siteId),
      alarms,
      equipment: sortEquipment(getEquipment(siteId), 'rul'),
      optimization: getOptimization(siteId, energyIntensity(series)),
    };
  }, [siteId]);

  /* 확인 처리가 헤더·사이드바와 함께 반영되도록 공유 상태를 읽는다 */
  const { alarms } = useAlarmStates(detail.alarms);
  const openAlarms = countOpen(alarms);
  /* 절감액은 SCR-AD-001과 **같은 함수**를 부른다. 두 화면이 다른 금액을 보이면 안 된다 */
  const savings = detail.optimization.online
    ? calcCostSavings(detail.optimization.dosing.savingRate, detail.optimization.energy.savingRate)
    : null;
  const nextReplacement = detail.equipment[0];

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
            label="월 절감 (예시 기준)"
            value={savings ? formatKrw(savings.monthlyKrw, PROVISIONAL_DISPLAY_DECIMALS.savingKrwEok) : '—'}
            note={savings ? '원문 예시 사업장 단가' : '통신 두절로 산출 불가'}
          />
        </RiseItem>
        <RiseItem>
          <StatTile
            label="교체 임박 설비"
            value={nextReplacement ? nextReplacement.name : '—'}
            note={
              nextReplacement && site.online
                ? `잔여 수명 ${nextReplacement.remainingUsefulLifeDays}일`
                : '통신 두절로 산출 불가'
            }
            accent={
              nextReplacement && site.online
                ? statusInk(STATUS_VISUAL[nextReplacement.status])
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
        eyebrow="RandomForest · 예지보전"
        title="설비 상태"
        action={<span className="text-[12px] text-fg-subtle">잔여 수명 짧은 순</span>}
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
