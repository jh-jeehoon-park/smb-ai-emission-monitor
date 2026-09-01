'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useMemo } from 'react';
import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { COLLECTION_INTERVAL_MINUTES } from '@/shared/config/measurement';
import { PROVISIONAL_DISPLAY_DECIMALS, PROVISIONAL_STATUS_LABELS } from '@/shared/config/provisional';
import { STATUS_VISUAL, statusInk } from '@/shared/config/status-visual';
import { DISPLAY_TIMEZONE } from '@/shared/lib/format';
import { getOutageWindow } from '@/shared/lib/timeline';
import { Panel } from '@/shared/ui/panel';
import { RiseItem, StaggerGroup } from '@/shared/ui/motion';
import { StatTile } from '@/shared/ui/stat-tile';
import { StatusBadge } from '@/shared/ui/status-badge';
import { countOpen } from '@/entities/alarm';
import { getAnomalySeries, getAnomalySummary } from '@/entities/anomaly';
import { EQUIPMENT_SIGNAL_LABELS, getEquipment, sortEquipment } from '@/entities/equipment';
import {
  FLOW_SERIES_CODES,
  WATER_SERIES_CODES,
  WINDOW_HOURS,
  energyIntensity,
  outageNotice,
  useSiteSeries,
} from '@/entities/measurement';
import { CHEMICAL_SAVING_RANGE, getOptimization } from '@/entities/optimization';
import { getSite } from '@/entities/site';
import { ROLES } from '@/entities/user';
import { allAlarmsForSite, useAlarmStates } from '@/features/alarm-ack';
import { useSelectedSiteId, useSiteHref } from '@/features/site-selection';
import { useDischargeLimits } from '@/features/discharge-limit-settings';
import { AlarmList } from '@/widgets/alarm-list';
import { AnomalyPanel } from '@/widgets/anomaly-panel';
import { DailyRibbon, buildRibbon } from '@/widgets/daily-ribbon';
import { EquipmentPanel } from '@/widgets/equipment-panel';
import { WaterQualityGrid } from '@/widgets/water-quality-grid';
/* 셸의 라우트 표를 읽는다 — 첫 화면의 정의를 여기서 다시 적으면 두 곳이 갈린다 */
import { homeHrefFor, navLabelOf } from '@/widgets/app-shell/config/navigation';
import { InfoTip } from '@/shared/ui/tooltip';
import { ACTION_BUTTON_QUIET } from '@/shared/ui/action-button';

/**
 * 사업장 사용자가 여기서 답을 얻어야 하는 세 질문 — 괜찮은가 / 얼마나 줄었나 / 뭘 해야 하나.
 *
 * 가운데가 **금액에서 절감률로** 바뀌었다 `[사용자 결정 2026-08-20: 금액은 전부 지우고 % 만
 * 남긴다]`. 사업장별 단가가 없어(`[TBD-41]`) 금액이 전부 원문 예시값이었다.
 */
/** 이 화면의 경로. 사업장에게는 이것이 첫 화면이라 돌아갈 길을 그리지 않는다 */
const OVERVIEW_HREF = '/overview';

/** 절감 현황을 뺐다 — 그 화면을 메뉴에서 감췄으므로 여기 링크만 남으면 유일한 입구가 된다 */
const SHORTCUTS = [
  { href: '/process', label: '수처리 공정' },
  { href: '/anomaly', label: '이상 탐지' },
  { href: '/prediction', label: '오염도 추정' },
] as const;

/**
 * 사업장 1개소의 상세. **세 역할이 함께 쓴다** `[사용자 요청 2026-08-28]` — 사업장의 첫
 * 화면이자, 통합 관제·관내 감독에서 하나를 골라 `상세 보기`로 들어오는 곳이다.
 *
 * `REQ-AD-004`(실시간 모니터링 + AI 예측 + 알람을 **한 화면에**, 원문 p.45)를 1개소 범위로
 * 채운다. 같은 요건을 담은 통합 관제(SCR-OP-001)는 다사업장 요건(REQ-AD-026·027·028)까지
 * 함께 안고 있어 사업장에 닫혀 있다 — 범위 중립인 부분만 여기서 되살린다.
 *
 * **통합 관제를 복제하지는 않되 수질 그리드는 예외다.** 앞선 판본은 그리드·예측 차트를 둘 다
 * 빼면서 *"SCR-OP-003·004가 전폭으로 보여준다"* 를 근거로 삼았는데, 그 전제는 **사이드바로
 * 바로 갈 수 있는 사업장 역할**이었다. 통합 관제에서 넘어온 사람은 그 자리에서 수질 8종을
 * 보고 있었으므로 여기서 잃는다 — 판정의 **근거**를 감추고 판정만 보이는 꼴이라 E3와도
 * 어긋난다. 예측 차트·이상 타임라인은 바로가기가 잇고 전용 화면이 정본이라는 근거가 산다.
 */
export function AdminOverviewView() {
  const { siteId } = useSelectedSiteId();
  const withSite = useSiteHref();
  const site = getSite(siteId);
  /* 사용자가 설정한 기준치 — `site`의 두 축을 직접 읽으면 설정 후에도 `미확인`이 남는다 */
  const limits = useDischargeLimits();

  const { points: series } = useSiteSeries(siteId);

  const detail = useMemo(() => {
    const alarms = allAlarmsForSite(siteId);

    return {
      series,
      outage: getOutageWindow(siteId),
      ribbon: buildRibbon(siteId, series, getAnomalySeries(siteId), alarms),
      anomalySummary: getAnomalySummary(siteId),
      alarms,
      equipment: sortEquipment(getEquipment(siteId), 'status'),
      optimization: getOptimization(siteId, energyIntensity(series)),
    };
  }, [siteId, series]);

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
    <div className="space-y-6">
      {/*
        * **돌아갈 길** `[사용자 요청 2026-08-28]`. 이 화면은 시스템 관리자·기초지자체의
        * 사이드바에 없어(메뉴 노출은 사업장뿐), 그 둘이 들어오면 **활성 항목이 하나도 없고
        * 나갈 길도 보이지 않는다.**
        *
        * **역할마다 한 벌씩 그리고 CSS가 고른다.** 서버는 `data-role`을 모르므로 렌더 중에
        * 역할로 분기하면 하이드레이션이 깨진다 — 인사말·사이드바 메뉴와 같은 방식이다.
        * 한때 `homeHrefFor(useRole().role)`로 하나만 그렸는데, 서버가 기본 역할로 그린
        * 링크를 사업장 사용자의 클라이언트가 지워 **서버 HTML과 어긋났다.**
        *
        * 목적지는 `homeHrefFor`가 안다 — 첫 화면의 정의를 여기서 다시 적지 않는다.
        * **사업장에게는 이 화면이 그 첫 화면이라** 자기 자신을 가리키게 되므로 그리지 않는다.
        *
        * `role-only-*`가 `display: block`을 강제하므로 **정렬은 안쪽에서** 한다
        * (바깥에 flex를 걸면 죽는다 — `site-selector.tsx`가 그 함정을 기록해 두었다).
        */}
      {ROLES.map((each) => {
        const target = homeHrefFor(each);
        if (target === OVERVIEW_HREF) return null;

        return (
          <div key={each} className={`role-only-${each}`}>
            <Link
              href={withSite(target)}
              className="inline-flex items-center gap-0.5 text-[12px] text-fg-subtle transition-colors duration-200 hover:text-accent"
            >
              <ChevronLeft aria-hidden size={16} strokeWidth={2} />
              {navLabelOf(target)}(으)로 돌아가기
            </Link>
          </div>
        );
      })}

      <Panel
        /*
         * **어느 사업장인지 화면이 말한다** `[사용자 요청 2026-08-28]`. 자사 1개소일 때는
         * 자명했지만 이제 시스템 관리자·기초지자체가 남의 사업장을 열 수 있다 —
         * `<h1>`은 `사업장 상세`라는 화면명뿐이라 여기가 그것을 적는 첫 자리다.
         */
        title={`일간 운전 · ${site.name}`}
        action={
          <div className="flex items-center gap-2 text-[12px]">
            {site.status ? (
              <StatusBadge level={site.status} />
            ) : (
              <span className="text-fg-subtle">수신 없음</span>
            )}
          </div>
        }
      >
        <DailyRibbon data={detail.ribbon} dateIso={DEMO_NOW_ISO} />
      </Panel>

      <StaggerGroup className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel title="이상 탐지 결과">
          <AnomalyPanel summary={detail.anomalySummary} />
        </Panel>

        <Panel title="알람">
          <AlarmList alarms={alarms} nowIso={DEMO_NOW_ISO} selectedSiteId={siteId} />
        </Panel>
      </div>

      {/*
        * **판정의 근거를 함께 둔다** `[사용자 결정 2026-08-28]`. 통합 관제·관내 감독에서
        * 넘어오는 화면이 되면서, 출발지에 있던 수질 8종이 여기 없으면 **보던 것을 잃는다.**
        * 근거를 감추고 판정만 보이면 **E3**과 어긋난다 — `SCR-GU-001` §7.1이 같은 이유로
        * 판정 셋을 뺐다가 철회했다.
        *
        * 예측·이상 타임라인은 더하지 않는다 — 전용 화면이 정본이고 아래 바로가기가 잇는다.
        */}
      <Panel
        title="수질·설비 실시간 계측"
        titleAside={
          <InfoTip
            label="조회 조건과 결측 표시"
            content={`최근 ${WINDOW_HOURS}시간 · ${COLLECTION_INTERVAL_MINUTES}분 주기 · ${DISPLAY_TIMEZONE}. ${outageNotice(site.online, detail.outage)}`}
          />
        }
      >
        {/* 유량을 소절로 가른다 — 농도와 부피/시간을 한 격자에 두면 옆 칸과 비교된다는 신호를 준다 */}
        <WaterQualityGrid
          data={detail.series}
          sections={[
            { title: '수질 8종', codes: WATER_SERIES_CODES },
            {
              title: '유량 — 들어온 양과 나간 양',
              codes: FLOW_SERIES_CODES,
              diff: { of: ['inflow', 'flow'], label: '유입 − 유출' },
            },
          ]}
          limits={limits.table}
          windowHours={WINDOW_HOURS}
        />
      </Panel>

      <Panel
        title="설비 상태"
        titleAside={<InfoTip label="정렬 기준" content="상태가 나쁜 설비부터 정렬합니다." />}
      >
        <EquipmentPanel items={detail.equipment} online={site.online} />
      </Panel>

      <nav className="flex flex-wrap gap-2" aria-label="상세 화면 바로가기">
        {SHORTCUTS.map((shortcut) => (
          <Link
            key={shortcut.href}
            href={withSite(shortcut.href)}
            className={ACTION_BUTTON_QUIET}
          >
            {shortcut.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
