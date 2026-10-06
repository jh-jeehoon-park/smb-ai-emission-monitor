'use client';

import type { ChangeEvent } from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * 켜고 끄는 스위치 한 벌 `[사용자 요청 2026-09-29: 사업장 설정 UI/UX 개편]`.
 *
 * **체크박스와 뜻이 다르다.** 체크박스는 «고른 뒤 제출한다»이고 스위치는 «누르는 순간
 * 적용된다»이다 — 사업장 설정은 저장 버튼 없이 즉시 저장하므로(SCR-OP-010 §5) 켜고 끄는
 * 자리는 스위치가 맞다. 목록에서 여럿을 고르는 자리(로그인 «아이디 기억» 등)는 체크박스로 남는다.
 *
 * **진짜 `<input type="checkbox" role="switch">`다** — `Checkbox`와 같은 짜임이라 라벨 연결·
 * Space·폼 제출이 그대로 산다. 그림(홈·손잡이)은 `peer-checked`로 따라오는 형제다.
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
const TRACK =
  'peer relative h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full border border-border-strong bg-surface-3 ' +
  'transition-[background-color,border-color,box-shadow] duration-200 ease-out ' +
  'hover:border-accent/60 ' +
  'checked:border-accent checked:bg-accent checked:shadow-[0_2px_6px_rgb(13_71_161_/_30%)] ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface)] ' +
  'disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none';

/** 손잡이는 16px — 홈 높이 20px에서 위아래 2px씩 남는다 */
const KNOB =
  'pointer-events-none absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow-[0_1px_2px_rgb(16_22_28_/_25%)] ' +
  'transition-transform duration-200 ease-out peer-checked:translate-x-4 motion-reduce:transition-none';

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
    <span className={cn('relative inline-flex shrink-0', className)}>
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
        className={TRACK}
      />
      <span aria-hidden className={KNOB} />
    </span>
  );
}
