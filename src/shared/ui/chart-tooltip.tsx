'use client';

import type { ReactNode } from 'react';
import styles from './chart-tooltip.module.scss';

interface ChartTooltipProps {
  label?: ReactNode;
  children: ReactNode;
}

/**
 * 툴팁 껍데기의 최소 폭(px).
 *
 * **스스로 자리를 잡는 툴팁이 이 값을 읽는다** — 일간 운전 리본은 커서 오른쪽에 두다가
 * 자리가 모자라면 왼쪽으로 뒤집는데, 그 판단에 상자 폭이 필요하다. 모듈 `.shell`의
 * `min-width: 140px`과 **같은 값이어야 한다**: 스타일시트는 TS 상수를 읽을 수 없어
 * 둘로 적고, `daily-ribbon/lib/tooltip-placement.test.ts`가 갈리지 않는지 본다.
 */
export const CHART_TOOLTIP_MIN_WIDTH_PX = 140;

/** 모든 차트가 같은 툴팁 껍데기를 쓴다 — 화면마다 다른 tooltip을 만들지 않는다 */
export function ChartTooltipShell({ label, children }: ChartTooltipProps) {
  return (
    <div className={styles.shell}>
      {label && (
        <p className={styles.label}>{label}</p>
      )}
      <div className={styles.rows}>{children}</div>
    </div>
  );
}

interface TooltipRowProps {
  color: string;
  name: string;
  value: string;
  dashed?: boolean;
}

export function ChartTooltipRow({ color, name, value, dashed }: TooltipRowProps) {
  return (
    <div className={styles.row}>
      <span className={styles.name}>
        <span
          className={styles.swatch}
          style={{
            backgroundColor: dashed ? 'transparent' : color,
            backgroundImage: dashed
              ? `repeating-linear-gradient(to right, ${color} 0 3px, transparent 3px 6px)`
              : undefined,
          }}
        />
        {name}
      </span>
      <span className={styles.value}>{value}</span>
    </div>
  );
}
