'use client';

import type { ReactNode } from 'react';
import { FlaskConical, MapPinned, Scale, Workflow, Zap } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { TABLE_SCROLL } from '@/shared/ui/table';
import { SETTINGS_TAB_GROUPS, SETTINGS_TAB_OPTIONS, type SettingsTab } from '../config/constants';
import styles from './settings-nav.module.scss';

/** 탭마다 그림 하나 — 다섯 줄이 글자만으로 늘어서면 목차가 훑어지지 않는다 */
const TAB_ICON: Record<SettingsTab, ReactNode> = {
  classification: <MapPinned className={styles.glyph} strokeWidth={1.8} />,
  limits: <Scale className={styles.glyph} strokeWidth={1.8} />,
  process: <Workflow className={styles.glyph} strokeWidth={1.8} />,
  instruments: <FlaskConical className={styles.glyph} strokeWidth={1.8} />,
  metering: <Zap className={styles.glyph} strokeWidth={1.8} />,
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
      className={cn(styles.root, className)}
    >
      {/*
       * 좁은 화면에서는 가로로 밀리는 한 줄이라 **옆에 더 있다**는 신호(`scroll-hint`)를 단다 —
       * 가리개 색은 이 줄이 놓인 본문 배경이다. 넓은 화면은 밀리지 않으므로 신호를 걷는다
       * (걷지 않으면 가리개가 목차 양 끝에 흰 띠로 남는다 — 캡처로 잡았다).
       */}
      <div className={cn(TABLE_SCROLL, styles.list)}>
        {SETTINGS_TAB_GROUPS.map((group) => {
          const items = group.tabs.filter((value) => tabs.includes(value));
          if (items.length === 0) return null;

          return (
            <div key={group.label} className={styles.group}>
              <p className={styles.groupLabel}>
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
                    className={cn(styles.item, on ? styles.itemActive : styles.itemIdle)}
                  >
                    <span
                      aria-hidden
                      className={cn(styles.icon, on ? styles.iconActive : styles.iconIdle)}
                    >
                      {TAB_ICON[value]}
                    </span>
                    <span className={styles.text}>
                      <span className={cn(styles.label, on ? styles.labelActive : styles.labelIdle)}>
                        {LABEL[value]}
                      </span>
                      <span className={styles.status}>
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
