'use client';

import type { ChangeEvent } from 'react';
import { cn } from '@/shared/lib/cn';
import styles from './switch.module.scss';

/**
 * 켜고 끄는 스위치 한 벌 `[사용자 요청 2026-09-29: 사업장 설정 UI/UX 개편]`.
 *
 * **체크박스와 뜻이 다르다.** 체크박스는 «고른 뒤 제출한다»이고 스위치는 «누르는 순간
 * 적용된다»이다 — 사업장 설정은 저장 버튼 없이 즉시 저장하므로(SCR-OP-010 §5) 켜고 끄는
 * 자리는 스위치가 맞다. 목록에서 여럿을 고르는 자리(로그인 «아이디 기억» 등)는 체크박스로 남는다.
 *
 * **진짜 `<input type="checkbox" role="switch">`다** — `Checkbox`와 같은 짜임이라 라벨 연결·
 * Space·폼 제출이 그대로 산다. 그림(홈·손잡이)은 켠 입력을 뒤따르는 형제다(`:checked ~`).
 *
 * 켠 상태는 **포인트색**이다 — 조작·선택을 뜻하는 자리라 §8 `포인트색` 규약 안이다.
 * 상태색(초록)을 쓰면 «정상»으로 읽힌다.
 */
interface SwitchProps {
  /** 바깥 `<label htmlFor>`가 가리키는 id */
  id?: string;
  checked: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  'aria-label'?: string;
  /** 바깥 `<label>`이 이름을 줄 때 그 id */
  'aria-labelledby'?: string;
  disabled?: boolean;
}

/*
 * **누르는 자리는 바깥 `<label>`이 맡는다.** 스위치는 보이는 크기(36×20)가 손가락 최소를
 * 밑돌아, 혼자 두지 않고 카드·줄 전체를 라벨로 감싸 그 면적을 누르는 자리로 쓴다(`ToggleCard`).
 * `<input>`에는 `::before`가 브라우저마다 그려지지 않아(파이어폭스) 히트 영역을 넓힐 수 없다.
 */
export function Switch({
  id,
  checked,
  onChange,
  className,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  disabled,
}: SwitchProps) {
  return (
    <span className={cn(styles.root, className)}>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={onChange}
        aria-checked={checked}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        disabled={disabled}
        className={styles.track}
      />
      <span aria-hidden className={styles.knob} />
    </span>
  );
}
