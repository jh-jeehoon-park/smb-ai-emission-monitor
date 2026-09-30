'use client';

import { useMemo, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { useQueryState } from '@/shared/lib/use-query-state';
import { Panel } from '@/shared/ui/panel';
import { ROLES, type Role } from '@/entities/user';
import {
  DISCHARGE_LIMIT_NOTE,
  SITE_CLASSIFICATION_NOTE,
  DischargeLimitEditor,
  SiteClassificationForm,
  APPLIED_LIMIT_NOTE,
  AppliedLimits,
  useDischargeLimits,
} from '@/features/discharge-limit-settings';
import {
  PROCESS_STAGE_ITEMS_NOTE,
  ProcessStageForm,
  useProcess,
} from '@/features/process-settings';
import { getEquipment } from '@/entities/equipment';
import { getSite } from '@/entities/site';
import { LEGAL_CHECK_ITEMS, limitBasisOf } from '@/shared/config/discharge-limits';
import { DISCHARGE_ROUTE_LABELS } from '@/entities/regulation';
import { useSelectedSiteId } from '@/features/site-selection';
import {
  INSTRUMENT_FORM_NOTE,
  InstrumentForm,
  METERING_FORM_NOTE,
  MeteringForm,
  useInstruments,
  useMetering,
} from '@/features/site-provisioning';
import {
  SETTINGS_TABS,
  SETTINGS_TAB_KEY,
  SETTINGS_TAB_ROLES,
  type SettingsTab,
} from '../config/constants';
import { SettingsNav } from './settings-nav';
import { SettingsOverview } from './settings-overview';
import { InfoTip } from '@/shared/ui/tooltip';
import styles from './settings-view.module.scss';

/**
 * 사업장 설정 (SCR-OP-010).
 *
 * 여기 있는 것은 **법정 판정값을 우리가 정하지 않기 위한 장치**다(`README` §3.1). 배출허용기준을
 * 지어내는 대신 허가증 값을 입력받는다 `[회의 2026-08-20]` — `[TBD-45]`는 해소가 아니라 **우회**다.
 *
 * **시스템 관리자의 화면이다** `[사용자 결정 2026-08-21]`. 예전에는 `시스템 설정`이라는 이름으로
 * 사업장 전용이었는데, 이름은 관리자 화면을 뜻하는데 정작 그 역할이 막혀 있었고 세 탭 모두
 * 사업장 축이었다. 사업장 등록·분류는 **회원 관리와 같은 성격**이라 관리자가 전권을 갖고,
 * 사업장은 자기 허가증이 갱신됐을 때 `방류 기준치`만 고친다.
 *
 * 대상 사업장은 **헤더 사업장 선택**을 그대로 쓴다(`?site=`) — 관리자는 전 사업장을 고를 수
 * 있고 사업장은 라우트 가드가 자사로 박아 둔다. 새 쿼리 키를 만들면 가드와 싸운다.
 */
/** 그 역할이 다루는 탭 */
const tabsOf = (forRole: Role): SettingsTab[] =>
  SETTINGS_TABS.filter((value) => SETTINGS_TAB_ROLES[value].includes(forRole));

/** 목차를 세울 역할 — 다루는 탭이 둘 이상인 역할만 */
const NAV_ROLES: readonly Role[] = ROLES.filter((forRole) => tabsOf(forRole).length > 1);

/**
 * 두 칸 격자는 **목차가 서는 역할에서만** 켠다. 지금 역할을 아는 것은 CSS(`data-role`)뿐이라
 * 역할마다 클래스를 하나씩 두고, 목차가 서는 역할의 것만 붙인다.
 */
const GRID_WITH_NAV: Record<Role, string> = {
  system: styles.layoutNavSystem,
  site: styles.layoutNavSite,
  gov: styles.layoutNavGov,
};

export function SettingsView() {
  const siteId = useSelectedSiteId().siteId;
  /*
   * **역할로 분기하지 않는다** `[설계 2026-09-16: 하이드레이션 불일치 수정]`.
   *
   * 한때 `useRole()`로 탭을 거르고 그 첫 탭을 URL 기본값으로 삼았다. 서버는 localStorage를
   * 모르므로 **기본 역할(시스템 관리자)로 세 탭과 «사업장 분류» 패널을 그렸고**, 사업장
   * 사용자의 클라이언트는 «방류 기준치» 하나를 그렸다 — 트리가 달라 **하이드레이션이
   * 깨졌고**(실측: `/settings`에서만 예외가 났다) React가 트리를 통째로 다시 그리면서
   * 루트의 `<script>`까지 건드려 경고를 하나 더 냈다.
   *
   * 이 저장소가 주석마다 경고하던 바로 그 패턴이고 **세 번째 사례**다. 해법도 같다 —
   * 세 역할분을 다 그리고 `data-role`을 보는 CSS가 고른다(사이드바 메뉴·인사말과 같은 방식).
   * 그래서 `tab`은 역할과 무관하고 서버·클라이언트가 같은 값을 본다.
   */
  const [tab, setTab] = useQueryState(SETTINGS_TAB_KEY, SETTINGS_TABS, SETTINGS_TABS[0]);
  const { unresolvedReason, isUserSet, classification, table } = useDischargeLimits();
  const process = useProcess();
  const instruments = useInstruments();
  const metering = useMetering();
  /*
   * **설비 목록은 이 화면이 읽어 폼에 넘긴다.** `features/site-provisioning`은 설비 도메인을
   * 모르고(FSD: feature끼리 못 본다), 설정이 정하는 것은 그 목록 위의 **계측 여부**뿐이다.
   */
  /* 코드가 아니라 사람이 읽는 말로 적는다 — 요약 줄은 설정 폼 밖에서도 읽힌다 */
  const routeLabel = classification.dischargeRoute
    ? DISCHARGE_ROUTE_LABELS[classification.dischargeRoute]
    : '미설정';

  const meterableUnits = useMemo(
    () => getEquipment(siteId).map((eq) => ({ id: eq.id, name: eq.name })),
    [siteId],
  );

  /*
   * 그 역할이 **실제로 보게 되는** 탭. 주소가 그 역할에 닫힌 탭을 가리키면 그가 다루는 첫 탭으로
   * 떨어진다 — 한때 `useQueryState`의 허용 목록이 하던 일이고, 역할 판단만 이리로 옮겼다.
   */
  const effectiveTab = (forRole: Role): SettingsTab => {
    if (SETTINGS_TAB_ROLES[tab].includes(forRole)) return tab;
    return SETTINGS_TABS.find((value) => SETTINGS_TAB_ROLES[value].includes(forRole)) ?? SETTINGS_TABS[1];
  };

  const PANELS: Record<SettingsTab, ReactNode> = {
    classification: (
      <Panel
        title="사업장 규제정보"
        titleAside={<InfoTip label="무엇을 적는 칸인가" content={SITE_CLASSIFICATION_NOTE} />}
      >
        <SiteClassificationForm siteId={siteId} />
      </Panel>
    ),
    limits: (
      <Panel
        title="방류 기준치"
        titleAside={
          <>
            <span className="role-hide-site role-hide-gov">
              <InfoTip label="빈 칸의 뜻" content={DISCHARGE_LIMIT_NOTE} />
            </span>
            <span className="role-hide-system">
              <InfoTip label="이 표가 뜻하는 것" content={APPLIED_LIMIT_NOTE} />
            </span>
          </>
        }
      >
        {/*
         * **입력은 한 주체가 맡고 나머지는 적용 결과를 본다**
         * `[사용자 요청 2026-09-28: 설정 재설계 검토]`.
         *
         * 세 역할이 같은 표를 직접 고치던 판본은 **마지막에 저장한 쪽이 이겼다** — 저장소가
         * `(지역구분 × 규모 × 항목)` 한 벌이라 사업장 축조차 없어, 한 사업장에 넣은 값이
         * 같은 분류의 다른 사업장에도 함께 적용됐다(실측). 규제 기준에 쓸 수 있는 규칙이
         * 아니다.
         *
         * **탭을 내리지 않는다.** 사업장·기초지자체는 그대로 이 탭을 열고, 보는 것이
         * 「입력 칸」에서 「적용 결과와 출처」로 바뀐다 — 그들이 입력하던 값은 어차피
         * 시스템 관리자가 사업장 분류를 고르기 전까지 **어디에도 적용되지 않았다**(실측).
         *
         * **두 벌을 다 그리고 CSS가 고른다** — `useRole()`로 갈랐다가 하이드레이션이
         * 두 번 깨졌다(§7.2).
         */}
        <div className="role-hide-site role-hide-gov">
          <DischargeLimitEditor siteId={siteId} onGoToFacts={() => setTab('classification')} />
        </div>
        <div className="role-hide-system">
          <AppliedLimits />
        </div>
      </Panel>
    ),
    process: (
      <Panel
        title="공정 구성"
        titleAside={<InfoTip label="공정 구성과 ECP 채널" content={PROCESS_STAGE_ITEMS_NOTE} />}
        action={
          <span className={styles.panelCount}>
            {process.stages.length}단계{process.isUserSet ? '' : ' · 표준 공정'}
          </span>
        }
      >
        <ProcessStageForm siteId={siteId} />
      </Panel>
    ),
    instruments: (
      <Panel
        title="계측 구성"
        titleAside={<InfoTip label="끈 항목은 어떻게 되나" content={INSTRUMENT_FORM_NOTE} />}
        action={
          <span className={styles.panelCount}>
            보유 {instruments.held.length} · 미설치 {instruments.absent.length}
          </span>
        }
      >
        <InstrumentForm siteId={siteId} />
      </Panel>
    ),
    metering: (
      <Panel
        title="설비 전력 계측"
        titleAside={<InfoTip label="무엇을 정하는 설정인가" content={METERING_FORM_NOTE} />}
        action={
          <span className={styles.panelCount}>
            계측 {metering.ids.length} / 설비 {meterableUnits.length}
          </span>
        }
      >
        <MeteringForm siteId={siteId} units={meterableUnits} />
      </Panel>
    ),
  };

  /*
   * 목차가 달 한 줄씩 — **들어가 보지 않고도 어느 칸이 비었는지** 알게 한다.
   */
  const filledFacts = [
    classification.regionGrade,
    classification.dischargeScale,
    classification.dischargeRoute,
  ].filter((value) => value !== null).length;
  const navStatus: Record<SettingsTab, string> = {
    classification: `${filledFacts} / 3 입력`,
    limits: isUserSet ? '허가증 값 입력됨' : '입력 없음 · 통상 범위만',
    process: process.isUserSet ? `${process.stages.length}단계 사용` : `표준 ${process.stages.length}단계`,
    instruments: `보유 ${instruments.held.length} · 미설치 ${instruments.absent.length}`,
    metering: `계측 ${metering.ids.length} / 설비 ${meterableUnits.length}`,
  };

  /* 지금 무엇으로 판정하고 있는가 — 법정 근거와 시연 임계값을 가른다 */
  const judged = LEGAL_CHECK_ITEMS.filter((item) => item.code !== null).map((item) => ({
    label: item.label,
    basis: limitBasisOf(item.code!, table),
  }));

  const site = getSite(siteId);

  return (
    <div className={styles.root}>
      <SettingsOverview
        siteName={site.name}
        siteRegion={`${site.industry} · ${site.address}`}
        steps={[
          { label: '지역구분', value: classification.regionGrade },
          {
            label: '배출량 규모',
            value:
              classification.dailyWastewaterM3 === null
                ? classification.dischargeScale
                : `${classification.dischargeScale} · ${classification.dailyWastewaterM3}㎥/일`,
          },
          {
            label: '방류·처리 경로',
            value: classification.dischargeRoute ? routeLabel : null,
          },
          { label: '방류 기준치', value: isUserSet ? '허가증 값 입력됨' : null },
        ]}
        legalCodes={judged.filter((j) => j.basis === 'legal').map((j) => j.label)}
        provisionalCodes={judged.filter((j) => j.basis === 'provisional').map((j) => j.label)}
        nextAction={unresolvedReason}
      />

      {/*
       * **목차 + 본문 두 칸** `[사용자 요청 2026-09-29: 사업장 설정 UI/UX 개편]`. 목차는 다루는 탭이
       * **둘 이상인 역할에게만** 선다 — 탭이 하나인 역할(사업장·기초지자체)에게 한 줄짜리 목차는
       * 누를 곳이 없는 메뉴다. 그 역할은 본문이 전폭을 쓴다.
       *
       * **역할마다 한 벌씩 그리고 CSS가 고른다** — 두 칸 격자도 `data-role`로 켠다. `useRole()`로
       * 가르면 서버(역할을 모름)와 트리가 어긋나 하이드레이션이 깨진다(§7.2).
       */}
      <div className={cn(styles.layout, NAV_ROLES.map((forRole) => GRID_WITH_NAV[forRole]))}>
        {NAV_ROLES.map((forRole) => (
          <SettingsNav
            key={forRole}
            className={cn(`role-only-${forRole}`, styles.nav)}
            tabs={tabsOf(forRole)}
            active={effectiveTab(forRole)}
            onSelect={setTab}
            status={navStatus}
          />
        ))}

        <div className={styles.body}>
          {SETTINGS_TABS.map((value) => {
            /*
             * 그 탭을 보게 되는 역할들. 하나도 없으면 아예 그리지 않는다 — 대개 한둘이다.
             * `contents`는 레이아웃에 투명하고, 가려야 할 때 `role-hide-*`가 이겨 `none`이
             * 된다(`RoleGate`가 쓰는 짜임 그대로다 — 이기는 까닭은 모듈의 레이어 주석).
             */
            const seenBy = ROLES.filter((forRole) => effectiveTab(forRole) === value);
            if (seenBy.length === 0) return null;

            return (
              <div
                key={value}
                className={cn(
                  styles.panelSlot,
                  ROLES.filter((forRole) => !seenBy.includes(forRole)).map(
                    (forRole) => `role-hide-${forRole}`,
                  ),
                )}
              >
                {PANELS[value]}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
