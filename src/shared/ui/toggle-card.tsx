'use client';

import { useId, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { Switch } from './switch';
import styles from './toggle-card.module.scss';

/**
 * **켜고 끄는 대상 하나가 카드 한 장**이다 `[사용자 요청 2026-09-29: 사업장 설정 UI/UX 개편]`.
 *
 * 예전에는 계측 항목·설비가 카드 폭을 꽉 채운 한 줄씩이었다 — 체크박스와 이름이 왼쪽 끝,
 * 단위가 오른쪽 끝(1,000px 떨어져 있었다)이라 **어느 단위가 어느 줄 것인지 눈으로 따라가야
 * 했다.** 카드로 모으면 이름·단위·스위치가 한 덩어리가 되고, 격자로 두 줄·세 줄 세워져
 * 여덟 항목이 한눈에 들어온다.
 *
 * **카드 전체가 라벨이다** — 어디를 눌러도 스위치가 켜진다. 누를 수 있는 것이라 hover를
 * 준다(§8 `hover`: 누를 수 있는 것에만).
 *
 * **끈 상태는 지우지 않고 흐리게 둔다** — 끈 것이 목록에서 사라지면 무엇을 껐는지 알 수 없다.
 * 끈 이유(`offNote`)를 그 자리에 적는다.
 */
interface ToggleCardProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** 왼쪽 네모 안에 들어갈 것 — 기호(`pH`)나 아이콘 */
  mark: ReactNode;
  title: string;
  /** 제목 아래 한 줄(단위·종류) */
  meta?: ReactNode;
  /** 켰을 때만 붙는 한 줄 — 켠 결과가 무엇인지 */
  onNote?: ReactNode;
  /** 껐을 때만 붙는 한 줄 */
  offNote?: ReactNode;
  /**
   * **끈 것이 무엇을 뜻하는가.** 두 자리가 반대다.
   * - `absence` — 끈 것이 «없다»는 사실(계측기 미설치). 점선·흐린 면으로 비어 있음을 보인다
   * - `selection` — 끈 것이 «고르지 않았다»(전력 계측 대상). 대부분이 꺼져 있는 자리라 흐리게
   *   두면 목록 전체가 죽어 보인다 — 흰 면 그대로 두고 켠 것만 포인트색으로 올린다
   */
  offMeaning?: 'absence' | 'selection';
}

/** 카드가 놓일 수 있는 네 모습. 켬/끔 × 끈 것의 뜻(`offMeaning`)에서 나온다 */
type Look = 'absent' | 'picked' | 'on' | 'idle';

function lookOf(checked: boolean, offMeaning: 'absence' | 'selection'): Look {
  if (!checked) return offMeaning === 'absence' ? 'absent' : 'idle';
  return offMeaning === 'selection' ? 'picked' : 'on';
}

const CARD_BY_LOOK: Record<Look, string> = {
  absent: styles.cardAbsent,
  picked: styles.cardPicked,
  on: styles.cardPlain,
  idle: styles.cardPlain,
};

const MARK_BY_LOOK: Record<Look, string> = {
  absent: styles.markAbsent,
  picked: styles.markPicked,
  on: styles.markOn,
  idle: styles.markIdle,
};

export function ToggleCard({
  checked,
  onChange,
  mark,
  title,
  meta,
  onNote,
  offNote,
  offMeaning = 'absence',
}: ToggleCardProps) {
  const id = useId();
  const note = checked ? onNote : offNote;
  const look = lookOf(checked, offMeaning);

  return (
    <label
      htmlFor={id}
      className={cn(styles.card, CARD_BY_LOOK[look])}
    >
      <span
        aria-hidden
        className={cn(styles.mark, MARK_BY_LOOK[look])}
      >
        {mark}
      </span>
      <span className={styles.text}>
        <span className={cn(styles.title, look === 'absent' ? styles.titleAbsent : styles.titlePresent)}>
          {title}
        </span>
        {meta && <span className={styles.meta}>{meta}</span>}
        {note && <span className={styles.note}>{note}</span>}
      </span>
      <Switch id={id} checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}
