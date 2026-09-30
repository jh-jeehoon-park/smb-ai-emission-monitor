'use client';

import type { ReactNode } from 'react';
import { FlaskConical, MapPinned, Scale, Workflow, Zap } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { TABLE_SCROLL } from '@/shared/ui/table';
import { SETTINGS_TAB_GROUPS, SETTINGS_TAB_OPTIONS, type SettingsTab } from '../config/constants';

/** 탭마다 그림 하나 — 다섯 줄이 글자만으로 늘어서면 목차가 훑어지지 않는다 */
const TAB_ICON: Record<SettingsTab, ReactNode> = {
  classification: <MapPinned className="size-4" strokeWidth={1.8} />,
  limits: <Scale className="size-4" strokeWidth={1.8} />,
  process: <Workflow className="size-4" strokeWidth={1.8} />,
  instruments: <FlaskConical className="size-4" strokeWidth={1.8} />,
  metering: <Zap className="size-4" strokeWidth={1.8} />,
};

const LABEL = Object.fromEntries(SETTINGS_TAB_OPTIONS.map((o) => [o.value, o.label])) as Record<
  SettingsTab,
  string
>;

/**
 * **설정 목차** — 탭 줄을 걷고 왼쪽에 세운다 `[사용자 요청 2026-09-29: 사업장 설정 UI/UX 개편]`.
 *
 * 예전에는 요약 카드 머리 오른쪽의 **세그먼트 알약 다섯 칸**이었다. 설정 항목이 다섯으로
 * 늘면서 두 가지가 무너졌다 — ① 알약은 «같은 것을 다른 관점으로 본다»(필터)는 부품이라
 * **서로 다른 일 다섯**을 담으면 무엇이 무엇의 하위인지 말하지 못하고 ② 이름만 있어
 * **어느 칸이 비어 있는지**를 들어가 봐야 알았다. SaaS 설정 화면의 통상 형태(왼쪽 목차 +
 * 오른쪽 본문)로 옮기고, 항목마다 **지금 상태 한 줄**을 붙인다.
 *
 * **묶음이 둘이다** — «사업장»(어떤 곳이고 어떤 기준을 받는가)과 «설비·계측»(무엇을 달았는가).
 * 규정·판정에 닿는 것과 장비 구성은 고치는 사람도 시점도 다르다.
 *
 * 좁은 화면에서는 가로로 밀리는 한 줄이 된다 — 상태 줄은 접는다(폭이 모자라 두 줄이 된다).
 */
export function SettingsNav({
  tabs,
  active,
  onSelect,
  status,
  className,
}: {
  /** 이 역할이 다루는 탭 */
  tabs: readonly SettingsTab[];
  active: SettingsTab;
  onSelect: (tab: SettingsTab) => void;
  /** 탭마다 지금 상태 한 줄 */
  status: Record<SettingsTab, string>;
  className?: string;
}) {
  return (
    <nav
      aria-label="설정 항목"
      className={cn(
        'min-w-0 lg:rounded-panel lg:border lg:border-card-border lg:bg-surface lg:p-2 lg:py-3 lg:shadow-panel',
        className,
      )}
    >
      {/*
       * 좁은 화면에서는 가로로 밀리는 한 줄이라 **옆에 더 있다**는 신호(`scroll-hint`)를 단다 —
       * 가리개 색은 이 줄이 놓인 본문 배경이다. 넓은 화면은 밀리지 않으므로 신호를 걷는다
       * (걷지 않으면 가리개가 목차 양 끝에 흰 띠로 남는다 — 캡처로 잡았다).
       *
       * **`lg:bg-none`으로 걷던 것은 실제로 걷히지 않았다** `[2026-09-30 검토]` — 신호 규칙이
       * 유틸리티보다 뒤에 실려 같은 특이도로 이겼다. 규칙을 `components` 층으로 내리고 셋(배경 ·
       * 마스크 · 타임라인)을 한 번에 끄는 `scroll-hint-off`를 쓴다.
       */}
      <div
        className={cn(
          TABLE_SCROLL,
          '-mx-1 flex gap-1 px-1 pb-1 [--scroll-hint-bg:var(--bg)] lg:mx-0 lg:flex-col lg:gap-4 lg:overflow-visible lg:scroll-hint-off lg:px-0 lg:pb-0',
        )}
      >
        {SETTINGS_TAB_GROUPS.map((group) => {
          const items = group.tabs.filter((value) => tabs.includes(value));
          if (items.length === 0) return null;

          return (
            <div key={group.label} className="flex shrink-0 gap-1 lg:flex-col">
              <p className="hidden px-3 pb-1 text-[12px] font-semibold text-fg-subtle lg:block">
                {group.label}
              </p>
              {items.map((value) => {
                const on = value === active;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-current={on ? 'page' : undefined}
                    onClick={() => onSelect(value)}
                    className={cn(
                      'group flex min-h-10 shrink-0 cursor-pointer items-center gap-2.5 rounded-nested px-3 py-2 text-left transition-colors duration-200',
                      on ? 'bg-accent-weak text-accent' : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'grid size-7 shrink-0 place-items-center rounded-[6px] transition-colors duration-200',
                        on ? 'bg-surface text-accent shadow-panel' : 'bg-surface-2 text-fg-subtle group-hover:text-fg-muted',
                      )}
                    >
                      {TAB_ICON[value]}
                    </span>
                    <span className="min-w-0">
                      <span className={cn('block whitespace-nowrap text-[13px]', on ? 'font-semibold' : 'font-medium')}>
                        {LABEL[value]}
                      </span>
                      <span className="hidden truncate text-[12px] text-fg-subtle lg:block">
                        {status[value]}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
