'use client';

import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { useValueTween } from '@/shared/lib/use-value-tween';

/**
 * 값이 새로 들어올 때의 전환
 * `[사용자 요청 2026-09-16: 수치가 변경될 때에 대한 자연스러운 애니메이션]`.
 *
 * **수치는 흘러가고, 수치가 아닌 것은 갈린다.** 5초로 보내는 사업장에서 틱마다 아홉 곳이
 * 툭 바뀌던 것이 이 화면의 출발점이다(실측: pH가 20초에 `8.35→8.33→8.38→8.47→8.41`).
 *
 * | 들어온 값 | 어떻게 |
 * |---|---|
 * | `8.47`처럼 수만 있는 문자열 | 직전 값에서 **흘러간다**(420ms, 끝에서 감속) |
 * | `없음`·`—`·`3/60`처럼 수가 아닌 것 | 불투명도로 **갈린다**(160ms) — 흘려보낼 축이 없다 |
 *
 * > **흘러가는 동안에는 계측되지 않은 값이 보인다.** 8.35→8.47 사이의 8.39·8.42가 그렇다.
 * > 사용자가 그 대가를 알고 요청했고 `[사용자 요청 2026-09-16]`, 시간을 짧게 두어 노출을
 * > 줄였다. **멈춰 있을 때의 값은 언제나 실제 계측값이다** — 트윈은 `null`을 돌려주고
 * > 화면은 원본 문자열을 그린다(부동소수 반올림으로 한 자리 어긋나는 것까지 막는다).
 *
 * 감속 설정에서는 **둘 다 돌지 않는다** — 트윈은 훅이, 페이드는 `globals.css`가 끈다.
 *
 * `.num`(tabular-nums)은 바깥이 계속 들고 있어 흘러가는 동안 폭이 흔들리지 않는다.
 */
export function LiveValue({
  value,
  className,
  children,
}: {
  /** 화면에 찍을 값. 수만 있는 문자열이면 흘러간다 */
  value: string | number | null;
  className?: string;
  /** 없으면 `value`를 그대로 찍는다. 주면 전환만 붙고 내용은 그대로다 */
  children?: ReactNode;
}) {
  const text = value === null ? '' : String(value);
  const numeric = parseNumeric(text);
  const tweened = useValueTween(numeric);

  /* 흘러가는 중이면 그 값을, 멈춰 있으면 **원본 문자열을** 그린다 */
  if (children === undefined && tweened !== null && numeric !== null) {
    return <span className={cn('num', className)}>{tweened.toFixed(decimalsOf(text))}</span>;
  }

  /*
   * **수치에는 페이드를 붙이지 않는다.** 그쪽 전환은 트윈이 맡는다 — 둘 다 붙이면 420ms
   * 흘러간 직후에 160ms 페이드가 한 번 더 돌아 값이 도착하고 나서 깜빡인다. 감속 설정에서도
   * 수치는 그냥 갈리는 것이 맞다(전환 없이 실제 계측값으로).
   *
   * 남는 것은 `없음`·`3/60`·`—`처럼 **흘려보낼 축이 없는** 값이고, 그것만 페이드로 잇는다.
   */
  if (children === undefined && numeric !== null) {
    return <span className={cn('num', className)}>{value}</span>;
  }

  return (
    <span className={cn('num', className)}>
      <span key={text} className="num-fade">
        {children ?? value}
      </span>
    </span>
  );
}

/**
 * **수만 있는 문자열일 때만** 수로 읽는다.
 *
 * `Number()`가 이미 `3/60`·`없음`을 `NaN`으로 돌려주므로 정규식은 그 위의 울타리다 —
 * `Number('')`가 **0**이고 `Number(' 8 ')`가 8이라, 빈 칸이나 공백이 섞인 값이 수치로
 * 읽혀 **있지도 않은 0으로 흘러가는 것**을 막는다.
 */
function parseNumeric(text: string): number | null {
  if (!/^-?\d+(\.\d+)?$/.test(text)) return null;

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

/** 흘러가는 동안에도 자릿수를 지킨다 — 같은 항목이 화면마다 다르게 반올림되지 않는다(**E1**) */
function decimalsOf(text: string): number {
  return text.includes('.') ? text.length - text.indexOf('.') - 1 : 0;
}
