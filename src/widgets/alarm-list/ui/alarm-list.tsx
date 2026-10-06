'use client';

import { cn } from '@/shared/lib/cn';
import { BADGE_BASE } from '@/shared/ui/badge';
import { DISPLAY_TIMEZONE, formatDateTime, formatRelative } from '@/shared/lib/format';
import { RiseItem, StaggerGroup } from '@/shared/ui/motion';
import {
  ALARM_CONDITION_LABELS,
  ALARM_PRIORITY_LABELS,
  ALARM_STATE_LABELS,
  type Alarm,
  type AlarmPriority,
  type AlarmState,
} from '@/entities/alarm';

/**
 * 우선순위 색은 상태 등급 색과 같은 팔레트를 쓰되, 두 축이 같다고 단정하지 않는다.
 * 등급 4단계와 우선순위 3단계의 대응 관계는 원문에 없다(TBD-21).
 */
const PRIORITY_CHIP: Record<AlarmPriority, string> = {
  urgent: 'bg-chip-critical text-critical-ink',
  caution: 'bg-chip-warning text-warning-ink',
  /* 원문 팔레트가 파랑을 `정보 활성화`로 정해 두었다. 예전에는 중립 회색이었는데
     그 이유가 "초록(정상)과 헷갈린다"였고, 파랑은 그 문제가 없다 */
  info: 'bg-chip-info text-info-ink',
};

/**
 * 처리 상태는 **끝난 것을 가라앉힌다** — 미확인만 면을 갖고 나머지는 글자만 남는다.
 * 셋을 같은 무게로 칠하면 목록에서 아직 손대지 않은 것이 눈에 들어오지 않는다.
 */
const STATE_CHIP: Record<AlarmState, string> = {
  open: 'bg-surface-3 text-fg',
  acknowledged: 'text-fg-subtle',
  resolved: 'text-fg-subtle',
};

export function AlarmList({
  alarms,
  nowIso,
  selectedSiteId,
  onReveal,
}: {
  alarms: Alarm[];
  nowIso: string;
  /**
   * 줄을 누르면 그 알람의 **발생 시각**을 넘긴다 `[사용자 요청 2026-09-08]`.
   *
   * 이상 탐지 화면만 넘긴다 — 그 화면이 시각을 되감을 수 있는 유일한 곳이고, 알람이 그 화면에
   * 오는 가장 흔한 경로라 «알람 보고 들어왔다»가 화면 안에서 완결되어야 한다.
   * **넘기지 않으면 줄은 표시일 뿐이다**(§8 `hover` — 누를 수 있는 것에만 반응한다).
   */
  onReveal?: (raisedAtIso: string) => void;
  /**
   * 이 사업장의 알람만 모인 목록에서는 사업장명을 반복하지 않는다.
   *
   * **주지 않으면 줄마다 적는다.** 관내 목록처럼 여러 사업장이 섞이는 자리에서는
   * *어느 사업장인가*가 정보다 — 있지도 않은 사업장 id를 넘겨 지우는 편법을 막으려고
   * 선택 프롭으로 둔다.
   */
  selectedSiteId?: string;
}) {
  /* 0건이면 카드 본문이 통째로 비어 무엇이 없는지 알 수 없다(R19) */
  if (alarms.length === 0) {
    return <p className="py-6 text-center text-[12px] text-fg-subtle">해당하는 알람이 없습니다.</p>;
  }

  return (
    <StaggerGroup className="divide-y divide-border">
      {alarms.map((alarm, index) => (
        <RiseItem key={alarm.id}>
          {/*
           * 위 여백은 **첫 항목만 뺀다** — 패널이 이미 위쪽 여백을 주므로 첫 항목에 또 주면
           * 목록이 아래로 처진다.
           *
           * `first:pt-0`을 쓰지 않는 이유: 이 `article`은 `RiseItem` 안에 있어 **항상**
           * 자기 부모의 첫 자식이다. 그래서 모든 항목에 `pt-0`이 걸려 둘째 항목부터 위 여백이
           * 사라졌다. 순서를 아는 것은 부모뿐이므로 여기서는 index로 판단한다.
           */}
          <article
            className={cn(
              'flex gap-3 pb-3',
              index > 0 && 'pt-3',
              /* 누를 수 있을 때만 반응한다 — 표시뿐인 줄이 눌릴 것처럼 보이면 안 된다 */
              onReveal && 'relative rounded-nested transition-colors duration-200 hover:bg-surface-2',
            )}
          >
            {/*
             * **줄 아무 데나 눌리게 한다**(§8 `표` — 줄이 데려가면 줄 전체가 대상이다).
             *
             * 덮개 버튼을 쓰는 이유: 줄 안에 `<p>`가 있어 내용을 `<button>`으로 감싸면 브라우저
             * 파서가 문단을 끊어 **하이드레이션이 깨진다.** 이름은 `sr-only`가 나른다.
             */}
            {onReveal && (
              <button
                type="button"
                onClick={() => onReveal(alarm.raisedAtIso)}
                className="absolute inset-0 z-10 cursor-pointer rounded-nested"
              >
                <span className="sr-only">{alarm.title} 발생 시각의 이상 구간 보기</span>
              </button>
            )}
            {/*
             * **한 줄에 세 단이다** `[사용자 지시 2026-08-25]`.
             *
             *  ① 제목 — 무슨 일이 났는가. 13px semibold로 가장 먼저 읽힌다
             *  ② 상세 — 그 일의 내용. 12px `--fg-muted`, 두 줄까지
             *  ③ 메타 — 우선순위·조건·사업장·시각. 11px, 뱃지와 글자가 한 줄에 접힌다
             *
             * 예전에는 뱃지 줄이 **맨 위**에 있고 제목이 12px이라 상세와 크기가 같았다 —
             * 목록을 훑을 때 칩 색이 먼저 들어오고 정작 무슨 알람인지는 나중에 읽혔다.
             * 위계를 뒤집어 제목이 앞에 서고 분류는 아래로 내린다.
             */}
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold leading-snug text-fg">{alarm.title}</p>
              <p className="mt-1.5 line-clamp-2 max-w-[60ch] text-[13px] leading-relaxed text-fg-muted">
                {alarm.detail}
              </p>

              {/*
               * **메타는 두 갈래다** `[사용자 지시 2026-08-25]` — 분류(뱃지)와 정황(맨 글자).
               * 조각이 모두 같은 무게로 늘어서면 무엇부터 읽어야 할지 알 수 없다. 알람 이력의
               * 행과 같은 규칙이며, 이쪽은 등급 뱃지가 없다(카드가 이미 한 사업장의 것이다).
               */}
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                <span className={cn(BADGE_BASE, 'font-medium', PRIORITY_CHIP[alarm.priority])}>
                  {ALARM_PRIORITY_LABELS[alarm.priority]}
                </span>
                <span className={cn(BADGE_BASE, 'bg-surface-3 text-fg-muted')}>
                  {ALARM_CONDITION_LABELS[alarm.condition]}
                </span>

                <span aria-hidden className="h-3 w-px shrink-0 bg-border" />

                <span className="flex flex-wrap items-center gap-x-1.5 text-[12px] text-fg-subtle">
                  {/* 한 사업장만 모인 목록에서는 같은 이름이 줄마다 반복돼 소음이 된다 */}
                  {alarm.siteId !== selectedSiteId && (
                    <>
                      <span className="truncate">{alarm.siteName}</span>
                      <span aria-hidden>·</span>
                    </>
                  )}
                  {/*
                   * 절대 시각과 상대 시각을 함께 적는다(E5). 상대만 적으면 `3시간 전`이 어느
                   * 기준의 3시간인지 알 수 없고, 절대만 적으면 얼마나 오래됐는지가 눈에 안 들어온다.
                   */}
                  <span className="num">
                    {formatDateTime(alarm.raisedAtIso)} {DISPLAY_TIMEZONE}
                  </span>
                  <span aria-hidden>·</span>
                  <span className="num">{formatRelative(alarm.raisedAtIso, nowIso)}</span>
                </span>
              </div>
            </div>

            {/* 처리 상태는 오른쪽 끝에 고정한다 — 줄마다 같은 자리라 세로로 훑힌다 */}
            <span
              className={cn(BADGE_BASE, 'mt-0.5 self-start', STATE_CHIP[alarm.state])}
            >
              {ALARM_STATE_LABELS[alarm.state]}
            </span>
          </article>
        </RiseItem>
      ))}
    </StaggerGroup>
  );
}
