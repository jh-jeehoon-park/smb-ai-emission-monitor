'use client';

import { useId } from 'react';
import { cn } from '../lib/cn';

interface NumberFieldProps {
  label: string;
  /** `null`은 **미설정**이다. 0과 다르다 — 0을 기준으로 두면 모든 값이 초과가 된다 */
  value: number | null;
  onChange: (next: number | null) => void;
  /** 값 뒤에 붙는 단위. 빈 문자열이면 붙이지 않는다(pH) */
  unit?: string;
  /** 표시 자릿수. `step`을 여기서 파생시킨다 — 화면마다 따로 반올림하지 않는다(E1) */
  decimals: number;
  /** 센서 측정 범위. 밖의 값은 초과가 영원히 안 뜨거나 늘 뜬다 */
  range: [number, number];
  /** 왜 이 값을 못 쓰는가. 있으면 칸 아래에 적고 테두리를 세운다 */
  error?: string | null;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** 못 쓰는 칸의 이유. `disabled`와 함께 준다 */
  disabledNote?: string;
}

/**
 * 숫자 한 칸.
 *
 * **단위·자릿수·범위를 이 컴포넌트가 갖는다.** 화면마다 `toFixed(1)`을 적으면 같은 항목이
 * 화면마다 다르게 반올림된다(E1) — 검사 9가 그 하드코딩을 잡는다.
 *
 * **빈 문자열은 `null`이다.** `Number('')`은 `0`이라, 지우고 나갔을 때 0이 저장되면
 * "기준치 0"이 되어 모든 값이 초과로 판정된다. 지운 것은 **미설정**이다.
 */
export function NumberField({
  label,
  value,
  onChange,
  unit,
  decimals,
  range,
  error,
  placeholder,
  className,
  disabled,
  disabledNote,
}: NumberFieldProps) {
  const id = useId();
  const noteId = `${id}-note`;
  const note = disabled ? disabledNote : error;

  return (
    <div className={cn('min-w-0', className)}>
      <label htmlFor={id} className="block text-[11px] text-fg-subtle">
        {label}
        {unit ? <span className="ml-1 text-fg-subtle">({unit})</span> : null}
      </label>

      <input
        id={id}
        type="number"
        inputMode="decimal"
        disabled={disabled}
        /* 자릿수에서 파생시킨다 — 소수 두 자리 항목에 정수 스텝을 주면 화살표가 값을 튕긴다 */
        step={decimals === 0 ? 1 : 10 ** -decimals}
        min={range[0]}
        max={range[1]}
        value={value === null ? '' : value}
        placeholder={placeholder ?? '미설정'}
        aria-describedby={note ? noteId : undefined}
        aria-invalid={error ? true : undefined}
        onChange={(event) => {
          const raw = event.target.value;
          /* 지우면 미설정으로 돌아간다. `Number('')`이 0인 것을 그대로 쓰면 기준치 0이 된다 */
          if (raw.trim() === '') {
            onChange(null);
            return;
          }
          const parsed = Number(raw);
          onChange(Number.isFinite(parsed) ? parsed : null);
        }}
        className={cn(
          'num mt-1 w-full rounded-[4px] border bg-surface px-2 py-1.5 text-[13px] text-fg',
          'transition-colors duration-200 placeholder:text-fg-subtle',
          'focus-visible:outline focus-visible:-outline-offset-1 focus-visible:outline-border-strong',
          'disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-fg-subtle',
          error ? 'border-critical' : 'border-border',
        )}
      />

      {note ? (
        <p
          id={noteId}
          className={cn('mt-1 text-[11px] leading-snug', error ? 'text-critical-ink' : 'text-fg-subtle')}
        >
          {note}
        </p>
      ) : null}
    </div>
  );
}
