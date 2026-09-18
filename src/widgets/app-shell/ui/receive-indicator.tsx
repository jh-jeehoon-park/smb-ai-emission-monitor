'use client';

import { useCallback, useRef, useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { ICON_BUTTON } from '@/shared/ui/action-button';
import { useDismiss } from '@/shared/lib/use-dismiss';
import {
  TELEMETRY_STATUS_LABELS,
  intervalLabel,
  telemetrySourceLabel,
  useSiteSeries,
} from '@/entities/measurement';
import { getSite } from '@/entities/site';
import { useSelectedSiteId } from '@/features/site-selection';

/**
 * 계측을 지금 받고 있는가 — **점 하나로 말하고, 누르면 글로 말한다**
 * `[사용자 요청 2026-09-18: 모바일 헤더 반응형]`.
 *
 * 한때 헤더에 문구를 그대로 폈다(`계측 서버 수신 중 · 1분 주기`, 142px). 그 문구를 포함해
 * 우측 묶음이 **670px**이라 390px 화면에서 헤더가 3줄로 접혔다(실측 167px · 화면의 20%).
 *
 * **점으로 줄여도 잃는 것이 적은 이유**: 수신이 **실패**했다는 사실은 본문
 * `telemetry-notice.tsx`가 값이 놓인 자리에서 크게 말한다 `[사용자 결정 2026-09-15]`.
 * 헤더가 맡을 것은 «지금 정상»이고, 그건 점 하나로 충분하다.
 *
 * **색만으로 나르지 않는다**(`screens.md` §8 `접근성`). 정상은 **속이 찬 점 + 파동**,
 * 나머지는 **속 빈 원**이라 색을 못 봐도 갈린다. 두절과 폴백은 색이 다르지만 그 둘의 구분은
 * 버튼의 `aria-label`과 팝오버의 글자가 맡는다.
 *
 * **`InfoTip`(Radix Tooltip)을 쓰지 않는다** — 호버·포커스로만 열리고 **터치 탭으로는 열리지
 * 않는다.** 좁은 화면이 바로 이 변경이 겨냥한 화면이라, 거기서 안 열리는 장치는 답이 아니다.
 * 대신 알림 팝오버와 같은 짜임을 쓴다(바깥 누름·Esc·초점 복원은 `useDismiss`가 공유한다).
 */
export function ReceiveIndicator() {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss({ open, onDismiss: close, boxRef, triggerRef });

  const { siteId } = useSelectedSiteId();
  const site = getSite(siteId);
  const { status, failure, intervalSeconds } = useSiteSeries(siteId);

  /*
   * **문구를 다시 적지 않는다.** 세 갈래 모두 기존 라벨 함수를 그대로 부른다 —
   * `telemetry-labels.test.ts`가 «헤더가 문구를 스스로 적지 않는다»를 못박고 있다.
   */
  const live = site.online && status === 'live';
  const label = !site.online
    ? '수신 두절'
    : status === 'live'
      ? `${TELEMETRY_STATUS_LABELS.live} · ${intervalLabel(intervalSeconds)} 주기`
      : telemetrySourceLabel(status, failure);

  return (
    <div ref={boxRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`수신 상태 — ${label}`}
        className={cn(
          ICON_BUTTON,
          /*
           * **정상일 때 `text-normal-ink`가 반드시 남는다.** `.live-pulse::before`가
           * `background: currentColor`라, 색 클래스를 걷으면 파동이 검게 뜬다.
           */
          live ? 'text-normal-ink' : !site.online ? 'text-critical-ink' : 'text-fg-subtle',
        )}
      >
        {/*
         * **`relative`가 없으면 파동이 버튼만큼 커진다.** `.live-pulse::before`는
         * `position: absolute; inset: 0`이라 **자리를 잡은 가장 가까운 조상**을 기준으로
         * 퍼지는데, 그 조상이 이 점이 아니라 버튼(`ICON_BUTTON`의 `relative`)이 되면
         * 8px이 아니라 28px에서 2.6배로 부풀어 **옆의 알림 종까지 덮는다**(실제로 그렇게 떴다).
         */}
        <span
          aria-hidden
          className={cn(
            'relative size-2 rounded-full',
            /* 속이 찼는가 / 비었는가 — 색을 못 봐도 갈리는 축 */
            live ? 'live-pulse bg-current' : 'border-[1.5px] border-current',
          )}
        />
      </button>

      {open && (
        <div
          role="status"
          className="absolute right-0 z-20 mt-1.5 w-[min(260px,calc(100vw-2rem))] rounded-nested border border-border-strong bg-surface p-3 text-[12px] shadow-lg"
        >
          <p className="font-medium text-fg">{label}</p>
          {/*
           * **어느 사업장의 수신인가.** 사업장 선택이 헤더를 떠나 메뉴 기둥으로 갔으므로,
           * 좁은 화면에서는 서랍을 열기 전까지 «지금 무엇을 보고 있는가»가 헤더에 없다
           * (본문 `h1`은 화면명이다). 이 줄이 그 구멍을 메운다.
           */}
          <p className="mt-1 text-fg-subtle">
            {site.name} · {site.region}
          </p>
        </div>
      )}
    </div>
  );
}
