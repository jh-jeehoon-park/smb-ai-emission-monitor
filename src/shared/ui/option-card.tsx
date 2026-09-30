'use client';

import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import styles from './option-card.module.scss';

/**
 * **설명이 붙는 단일 선택** — 선택지 하나가 카드 한 장이다
 * `[사용자 요청 2026-09-29: 사업장 설정 UI/UX 개편]`.
 *
 * 세그먼트(`SegmentedControl`)는 **짧은 낱말 네다섯 개**까지다. 방류·처리 경로처럼 선택지가
 * 여섯이고 낱말이 길면(`공공하수처리시설 유입`) 한 줄 알약이 화면 폭을 넘고, 무엇을 고르면
 * 무엇이 달라지는지를 적을 자리도 없다 — 이 자리는 그 차이를 알고 골라야 하는 곳이다.
 *
 * **진짜 `<input type="radio">`다.** 같은 `name`으로 묶이면 화살표 키로 옮겨 다니고, 라벨을
 * 누르면 고른다. 원은 가리지 않고 그린다(입력은 눈에서만 감춘다) — 화면 읽기 프로그램에는 입력이 그대로
 * 남는다.
 *
 * 고른 카드는 **포인트색 테두리 + 옅은 면**이다(§8 `포인트색` — 선택을 뜻하는 자리).
 */
interface OptionCardProps {
  name: string;
  value: string;
  checked: boolean;
  onSelect: (value: string) => void;
  title: string;
  description?: string;
  icon?: ReactNode;
}

export function OptionCard({
  name,
  value,
  checked,
  onSelect,
  title,
  description,
  icon,
}: OptionCardProps) {
  return (
    <label
      className={cn(styles.card, checked ? styles.cardChecked : styles.cardIdle)}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onSelect(value)}
        className={styles.input}
      />
      {icon && (
        <span
          aria-hidden
          className={cn(styles.icon, checked ? styles.iconChecked : styles.iconIdle)}
        >
          {icon}
        </span>
      )}
      <span className={styles.text}>
        <span className={cn(styles.title, checked ? styles.titleChecked : styles.titleIdle)}>
          {title}
        </span>
        {description && (
          <span className={styles.description}>{description}</span>
        )}
      </span>
      {/* 고른 표시 — 원 안에 점. 테두리색만으로는 둘 중 무엇이 골라졌는지 한눈에 갈리지 않는다 */}
      <span
        aria-hidden
        className={cn(styles.radio, checked ? styles.radioChecked : styles.radioIdle)}
      >
        <span className={cn(styles.dot, checked ? styles.dotShown : styles.dotHidden)} />
      </span>
      {/* 키보드 초점은 입력이 받고 표시는 카드가 한다 */}
      <span
        aria-hidden
        className={styles.focusRing}
      />
    </label>
  );
}
