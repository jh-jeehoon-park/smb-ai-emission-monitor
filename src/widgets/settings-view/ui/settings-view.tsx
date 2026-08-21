'use client';

import { useQueryState } from '@/shared/lib/use-query-state';
import { Panel } from '@/shared/ui/panel';
import { SegmentedControl } from '@/shared/ui/segmented-control';
import { getSite } from '@/entities/site';
import { useRole } from '@/entities/user';
import {
  DischargeLimitEditor,
  SiteClassificationForm,
  useDischargeLimits,
} from '@/features/discharge-limit-settings';
import { ProcessStageForm, useProcess } from '@/features/process-settings';
import { useSelectedSiteId } from '@/features/site-selection';
import {
  SETTINGS_TABS,
  SETTINGS_TAB_KEY,
  SETTINGS_TAB_OPTIONS,
  SETTINGS_TAB_ROLES,
} from '../config/constants';

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
  const { siteId } = useSelectedSiteId();
  const site = getSite(siteId);
  const { role } = useRole();
  /*
   * 역할이 다루는 탭만 남긴다. **URL 기본값도 그중 첫 탭이어야 한다** — 사업장이 `?tab=`
   * 없이 들어오면 관리자 전용 탭이 열려 빈 화면을 본다.
   */
  const tabs = SETTINGS_TABS.filter((value) => SETTINGS_TAB_ROLES[value].includes(role));
  const options = SETTINGS_TAB_OPTIONS.filter((option) => tabs.includes(option.value));
  const [tab, setTab] = useQueryState(SETTINGS_TAB_KEY, tabs, tabs[0] ?? SETTINGS_TABS[1]);
  const { unresolvedReason, isUserSet, classification } = useDischargeLimits();
  const process = useProcess();

  return (
    <div className="space-y-3">
      <Panel
        eyebrow={site.name}
        title="사업장 설정"
        action={
          <SegmentedControl
            ariaLabel="설정 항목"
            value={tab}
            onChange={setTab}
            options={options}
          />
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

        <p className="mt-3 max-w-[76ch] border-t border-border pt-2.5 text-[11px] leading-relaxed text-fg-subtle">
          {unresolvedReason ?? '네 항목의 기준치가 모두 설정되어 초과를 판정합니다.'}
        </p>
      </Panel>

      {tab === 'classification' && (
        <Panel
          eyebrow="기준표를 고르는 두 축"
          title="사업장 분류"
          action={<span className="text-[12px] text-fg-subtle">허가증에서 확인한 값을 넣는다</span>}
        >
          <SiteClassificationForm siteId={siteId} />
        </Panel>
      )}

      {tab === 'limits' && (
        <Panel
          eyebrow="지역구분 × 규모 × 법정 5항목"
          title="방류 기준치"
          action={<span className="text-[12px] text-fg-subtle">빈 칸은 미설정이며 0이 아니다</span>}
        >
          <DischargeLimitEditor siteId={siteId} />
        </Panel>
      )}

      {tab === 'process' && (
        <Panel
          eyebrow="최대 공정에서 고른다"
          title="공정 구성"
          action={
            <span className="text-[12px] text-fg-subtle">
              켠 단계 {process.stages.length} · 끈 단계 {process.disabled.length}
            </span>
          }
        >
          <ProcessStageForm siteId={siteId} />
        </Panel>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-fg-subtle">{label}</dt>
      <dd className="mt-0.5 text-fg">{value}</dd>
    </div>
  );
}
