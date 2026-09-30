'use client';

import { ChevronRight } from 'lucide-react';
import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { STATUS_VISUAL, statusInk } from '@/shared/config/status-visual';
import { cn } from '@/shared/lib/cn';
import { DISPLAY_TIMEZONE, formatDateTime, formatRelative } from '@/shared/lib/format';
import { ACTION_LINK } from '@/shared/ui/action-button';
import { BADGE_BASE } from '@/shared/ui/badge';
import { StatusBadge } from '@/shared/ui/status-badge';
import {
  ALARM_CONDITION_LABELS,
  ALARM_PRIORITY_LABELS,
  ALARM_STATE_LABELS,
  raisedWhileNotDischarging,
  type Alarm,
  type AlarmPriority,
  type AlarmState,
} from '@/entities/alarm';
import { AlarmStateActions } from '@/features/alarm-ack';
import styles from './alarm-row.module.scss';

const PRIORITY_CHIP: Record<AlarmPriority, string> = {
  urgent: styles.priorityUrgent,
  caution: styles.priorityCaution,
  info: styles.priorityInfo,
};

const STATE_CHIP: Record<AlarmState, string> = {
  open: styles.stateOpen,
  acknowledged: styles.stateAcknowledged,
  resolved: styles.stateResolved,
};

/**
 * 알람 이력의 한 줄.
 *
 * **알람 목록 카드와 같은 위계를 쓴다** `[사용자 지시 2026-08-25]` — 제목 → 상세 → 메타.
 * 이력 화면만 뱃지 넷을 앞뒤로 늘어놓던 판본은 같은 알람이 화면마다 다른 부품으로 보였다.
 *
 * 이 화면에만 있는 것은 오른쪽의 **처리 조작**(상세·확인·조치)이다. 그것만 따로 세우고
 * 나머지 분류(등급·조건·우선순위·사업장·시각)는 제목 아래 메타 줄로 내린다.
 */
export function AlarmRow({
  alarm,
  onChange,
  onOpen,
}: {
  alarm: Alarm;
  onChange: (id: string, next: AlarmState) => void;
  /** 상세 모달을 연다. 줄 아무 데나와 오른쪽 `상세` 버튼, 두 입구가 같은 곳으로 간다 */
  onOpen: () => void;
}) {
  return (
    <div className={styles.row}>
      {/*
       * **줄 아무 데나 눌러도 열린다** — 덮개 버튼이다 `[사용자 요청 2026-09-08]`.
       *
       * 줄 안에 `<p>`가 있어 내용을 `<button>`으로 감싸면 파서가 문단을 끊어 하이드레이션이
       * 깨진다(`alarm-list`가 같은 이유로 같은 짜임을 쓴다).
       *
       * **초점을 받지 않는다.** 오른쪽 `상세` 버튼이 같은 일을 하는 정식 조작이라, 덮개까지
       * 탭 순서에 들면 한 줄에서 같은 동작이 두 번 걸린다 — 줄 클릭은 편의이고 버튼이 계약이다
       * (§8 `누르는 줄`).
       */}
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={onOpen}
        className={styles.cover}
      />

      <div className={styles.body}>
        {/*
         * 제목은 글자로 둔다. 예전에는 이것만이 모달로 가는 유일한 입구였는데, 밑줄을 투명하게
         * 두어 **가만히 있을 때는 굵은 글자와 구분되지 않았다** — 상세가 있다는 사실 자체가
         * 화면에 없었다(§8 `상세 이동`: "글자는 누를 수 있다는 신호가 약하다").
         */}
        <p className={styles.title}>{alarm.title}</p>
        <p className={styles.detail}>
          {alarm.detail}
        </p>

        {/*
         * **메타는 두 갈래다** `[사용자 지시 2026-08-25]`. 뱃지 셋과 글자 넷이 한 줄에 섞여
         * 있던 판본은 일곱 조각이 모두 같은 무게로 늘어서 무엇부터 읽어야 할지 알 수 없었다.
         *
         *  · **분류**(등급·조건·우선순위) — 뱃지. 색이 뜻을 가지므로 앞에 선다
         *  · **정황**(사업장·시각) — 맨 글자. 읽을 때만 필요한 값이라 뒤로 물린다
         *
         * 둘 사이는 세로선으로 가른다 — 간격만으로는 줄바꿈됐을 때 어디까지가 분류인지 사라진다.
         */}
        <div className={styles.meta}>
          {/*
           * **등급과 우선순위는 다른 축이다** `[원문 발표 p.20 그림]` — 그 표가
           * `등급 · 구분 · 발생 시간 · 우선순위` 순서로 둘을 양 끝에 둔다. 대응 규칙은 원문에
           * 없어 추정이다 `[INC-02]`(근거는 `assumptions.md` §3.1). 한 줄에 두되 **사이에
           * 조건 칩을 끼워** 위험(빨강)과 긴급(빨강)이 붙어 한 덩어리로 보이지 않게 한다.
           */}
          <StatusBadge level={alarm.level} />
          <span className={cn(BADGE_BASE, styles.conditionChip)}>
            {ALARM_CONDITION_LABELS[alarm.condition]}
          </span>
          <span className={cn(BADGE_BASE, styles.priorityChip, PRIORITY_CHIP[alarm.priority])}>
            {ALARM_PRIORITY_LABELS[alarm.priority]}
          </span>

          <span aria-hidden className={styles.metaDivider} />

          <span className={styles.context}>
            <span className={styles.siteName}>{alarm.siteName}</span>
            <span aria-hidden>·</span>
            <span className="num">
              {formatDateTime(alarm.raisedAtIso)} {DISPLAY_TIMEZONE}
            </span>
            <span aria-hidden>·</span>
            <span className="num">{formatRelative(alarm.raisedAtIso, DEMO_NOW_ISO)}</span>
          </span>

          {/* 방류하지 않는 동안의 수질값은 배출 수질이 아니다. 배출기준 초과로 읽히면 안 된다 */}
          {raisedWhileNotDischarging(alarm) && (
            <span
              className={cn(BADGE_BASE, styles.notDischargingChip)}
              style={{ color: statusInk(STATUS_VISUAL.caution) }}
            >
              비방류 중 발생
            </span>
          )}
        </div>
      </div>

      {/*
       * 이 화면의 본업 — 처리 상태와 그 조작. 오른쪽 끝에 고정해 세로로 훑힌다.
       */}
      <div className={styles.actions}>
        <span className={cn(BADGE_BASE, styles.stateChip, STATE_CHIP[alarm.state])}>
          {ALARM_STATE_LABELS[alarm.state]}
        </span>

        {/*
         * **줄마다 `상세` 버튼을 둔다** `[사용자 요청 2026-09-08]` — 사업장 점수표가 쓰는 것과
         * 같은 부품이다(화살표가 붙은 글자 버튼). 확인 처리와 무게를 나눈다: 이쪽은 읽으러 가는
         * 곁들이는 조작이라 면을 갖지 않고, `확인 처리`만 올라온 버튼으로 남는다(§8 `조작 버튼`).
         */}
        <button
          type="button"
          onClick={onOpen}
          aria-label={`${alarm.title} 상세 보기`}
          className={cn(ACTION_LINK, styles.detailLink)}
        >
          상세
          <ChevronRight aria-hidden size={14} strokeWidth={2} />
        </button>

        <AlarmStateActions alarm={alarm} onChange={onChange} />
      </div>
    </div>
  );
}
