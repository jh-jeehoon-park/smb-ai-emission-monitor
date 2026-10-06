'use client';

import { PROVISIONAL_DISPLAY_DECIMALS } from '@/shared/config/provisional';
import { cn } from '@/shared/lib/cn';
import type { Contribution } from '@/entities/anomaly';
import { WALL_LABEL, WALL_META, WALL_UNIT } from '../config/constants';
import { WallBar } from './wall-bar';

/**
 * **`weight`는 0~1이다 — 100을 곱해야 퍼센트가 된다.**
 *
 * 곱하지 않아 `0.34%`로 적힌 판본이 있었다(캡처에서 드러났다). 자릿수는 `/anomaly`가 쓰는
 * 것과 **같은 상수**를 본다 — 화면마다 다르게 반올림하면 같은 기여도가 두 숫자로 보인다(**E1**).
 */
function percentOf(weight: number): string {
  return (weight * 100).toFixed(PROVISIONAL_DISPLAY_DECIMALS.contributionPercent);
}

/**
 * **점수가 왜 그 값인가** — 기여 변수 상위 몇 개를 순위 막대로.
 *
 * `[사용자 요청 2026-09-11: 최대한 레퍼런스와 유사한 UI]`. 레퍼런스가 목록과 막대를 한 칸에
 * 겹쳐 놓는 짜임을 따른다 — 이름 왼쪽, 비율 오른쪽, 그 아래 막대.
 *
 * **값은 `/anomaly`가 이미 보여 주는 것이다**(XAI 기여도, `[원문 p.60]`). 이 화면이 새로
 * 계산하는 것은 없다.
 *
 * ## 채움색이 `--fg-muted`인 이유
 *
 * §8 `막대·게이지`가 못박았다 — *"**채움색은 그 화면의 범례에 있는 색만 쓴다**"*. 같은 규칙이
 * 적은 실패 사례가 정확히 이 막대다: XAI 기여 막대를 `--actual`로 칠했더니 그 색이 다른
 * 차트에서는 «실측 계열»을 뜻해 **같은 색이 화면마다 다른 것을 말했다.**
 *
 * 이 화면에서 계열색(`--actual`)은 누적 추이선이, 상태색은 이상 점수 계기와 수질 막대가
 * 이미 쓰고 있다. 기여도는 **계열도 등급도 아니라** 둘 다 빌릴 수 없어 중립 잉크를 쓴다.
 *
 * **방향(상승·하강)은 색이 아니라 화살표가 나른다** — 같은 §8 규칙이다.
 */
export function ContributionBars({ rows }: { rows: readonly Contribution[] }) {
  if (rows.length === 0) {
    /* 두절이면 기여도도 없다 — 빈 막대를 그리면 «기여가 0»이라는 주장이 된다(E4) */
    return (
      <p className={cn('m-auto text-fg-subtle', WALL_META)}>
        점수를 받지 못해 기여 변수를 낼 수 없습니다
      </p>
    );
  }

  const top = Math.max(...rows.map((row) => row.weight));

  return (
    <ul className="wall-gap-sm flex min-h-0 flex-1 flex-col justify-between">
      {rows.map((row) => (
        /* `wall-contrib-row` — 세로가 낮은 화면에서 아래 순위를 감춘다(globals.css) */
        <li key={row.code} className="wall-contrib-row">
          <p className="flex items-baseline justify-between gap-2">
            <span className="flex min-w-0 items-baseline gap-1.5">
              <span aria-hidden className={cn('shrink-0 text-fg-subtle', WALL_META)}>
                {row.direction === 'up' ? '▲' : '▼'}
              </span>
              <span className={cn('min-w-0 truncate', WALL_LABEL)}>{row.label}</span>
            </span>
            <span className={cn('num shrink-0 font-bold text-fg-muted', WALL_UNIT)}>
              {percentOf(row.weight)}%
            </span>
          </p>
          {/* 가장 큰 기여를 꽉 찬 막대로 둔다 — 순위가 길이로 읽힌다 */}
          <WallBar
            percent={(row.weight / top) * 100}
            color="var(--fg-muted)"
            className="mt-1.5 h-2"
          />
        </li>
      ))}
    </ul>
  );
}
