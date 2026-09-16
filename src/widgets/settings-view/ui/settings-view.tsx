'use client';

import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { useQueryState } from '@/shared/lib/use-query-state';
import { Panel } from '@/shared/ui/panel';
import { SegmentedControl } from '@/shared/ui/segmented-control';
import { ROLES, type Role } from '@/entities/user';
import {
  DISCHARGE_LIMIT_NOTE,
  SITE_CLASSIFICATION_NOTE,
  DischargeLimitEditor,
  SiteClassificationForm,
  useDischargeLimits,
} from '@/features/discharge-limit-settings';
import {
  PROCESS_STAGE_ITEMS_NOTE,
  ProcessStageForm,
  useProcess,
} from '@/features/process-settings';
import { useSelectedSiteId } from '@/features/site-selection';
import {
  SETTINGS_TABS,
  SETTINGS_TAB_KEY,
  SETTINGS_TAB_OPTIONS,
  SETTINGS_TAB_ROLES,
  type SettingsTab,
} from '../config/constants';
import { InfoTip } from '@/shared/ui/tooltip';

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
  const { unresolvedReason, isUserSet, classification } = useDischargeLimits();
  const process = useProcess();

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
        title="사업장 분류"
        titleAside={<InfoTip label="입력 안내" content={SITE_CLASSIFICATION_NOTE} />}
      >
        <SiteClassificationForm siteId={siteId} />
      </Panel>
    ),
    limits: (
      <Panel
        title="방류 기준치"
        titleAside={<InfoTip label="빈 칸의 뜻" content={DISCHARGE_LIMIT_NOTE} />}
      >
        <DischargeLimitEditor siteId={siteId} />
      </Panel>
    ),
    process: (
      <Panel
        title="공정 구성"
        titleAside={<InfoTip label="단계별 계측 항목의 출처" content={PROCESS_STAGE_ITEMS_NOTE} />}
        action={
          <span className="text-[12px] text-fg-subtle">
            켠 단계 {process.stages.length} · 끈 단계 {process.disabled.length}
          </span>
        }
      >
        <ProcessStageForm siteId={siteId} />
      </Panel>
    ),
  };

  return (
    <div className="space-y-6">
      <Panel
        title="사업장 설정"
        titleAside={
          <InfoTip
            label="지금 판정 상태"
            content={unresolvedReason ?? '네 항목의 기준치가 모두 설정되어 초과를 판정합니다.'}
          />
        }
        action={
          /* 역할마다 한 벌. 보이는 것은 CSS가 고른다 — 서버는 어느 것이 보일지 모른다 */
          <>
            {ROLES.map((forRole) => (
              <SegmentedControl
                key={forRole}
                className={`role-only-${forRole}`}
                ariaLabel="설정 항목"
                value={effectiveTab(forRole)}
                onChange={setTab}
                options={SETTINGS_TAB_OPTIONS.filter((option) =>
                  SETTINGS_TAB_ROLES[option.value].includes(forRole),
                )}
              />
            ))}
          </>
        }
      >
        {/*
         * **지금 적용되는 상태를 먼저 보인다.** 설정 화면에 들어온 사람이 알고 싶은 첫 번째는
         * "지금 어떻게 되어 있나"이고, 그것을 모르면 무엇을 고쳐야 하는지도 모른다.
         */}
        <dl className="grid grid-cols-1 gap-y-2 text-[12px] sm:grid-cols-3 sm:gap-x-6">
          <Fact label="지역구분" value={classification.regionGrade ?? '미설정'} />
          <Fact label="배출량 규모" value={classification.dischargeScale ?? '미설정'} />
          <Fact label="기준치 출처" value={isUserSet ? '사용자 설정' : '입력 없음 · 통상 범위만'} />
          <Fact
            label="공정 구성"
            value={
              process.isUserSet
                ? `${process.stages.length}단계 사용 (사용자 설정)`
                : `표준 ${process.stages.length}단계`
            }
          />
        </dl>

      </Panel>

      {SETTINGS_TABS.map((value) => {
        /*
         * 그 탭을 보게 되는 역할들. 하나도 없으면 아예 그리지 않는다 — 대개 한둘이다.
         * `contents`는 레이아웃에 투명하고, 가려야 할 때 `role-hide-*`가 특이도로 이겨 `none`이
         * 된다(`RoleGate`가 쓰는 짜임 그대로다).
         */
        const seenBy = ROLES.filter((forRole) => effectiveTab(forRole) === value);
        if (seenBy.length === 0) return null;

        return (
          <div
            key={value}
            className={cn(
              'contents',
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
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[12px] text-fg-subtle">{label}</dt>
      <dd className="mt-0.5 text-fg">{value}</dd>
    </div>
  );
}
