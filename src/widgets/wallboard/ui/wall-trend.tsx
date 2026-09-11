'use client';

import { formatValue } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import type { MeasurementItemCode } from '@/shared/config/measurement';
import {
  WALL_META,
  WALL_SPARK_CLASS,
  WALL_TREND_GRID_AT,
  WALL_TREND_TICK_HOURS,
  WALL_TREND_TICK_MIN_GAP,
} from '../config/constants';
import { niceCeil, trendTicks } from '../lib/trend-axis';
import { WallSpark } from './wall-spark';

/**
 * 축이 있는 추이 — **벽에는 마우스가 없어서 눈금을 글자로 적는다.**
 *
 * `[사용자 지적 2026-09-11: 명확한 시간대와 수치가 보이지 않으며, 그래프만 보이기 때문에
 * 판별을 할 수 없는 화면 설계 UI]`.
 *
 * 그전 판본은 선과 각주 두 줄뿐이었다. 책상 화면이라면 hover 툴팁이 값을 말해 주지만
 * **이 화면에는 누를 것도 가리킬 것도 없어**(§7.4) 축을 지우면 값이 영영 드러나지 않는다 —
 * 「오르내린다」까지만 읽히고 「얼마나」와 「언제」가 없다.
 *
 * ## 바닥이 `0`이다 — 이것이 축보다 먼저다
 *
 * 옛 판본은 세로 범위가 **그 구간의 최소~최대**여서 바닥이 «그날 가장 적게 흘린 양»이었다.
 * 그러면 각주의 *"방류를 멈춘 구간은 0"* 이 그림과 어긋나고, 400~600을 오가는 계열이
 * **0까지 떨어진 것처럼** 보인다. 축을 다는 순간 그 어긋남이 «눈금이 거짓말하는 것»이 되므로
 * 범위를 `0 ~ 올림한 최댓값`으로 고정한다.
 *
 * ## 왜 센서 범위(0~1,000)로 고정하지 않는가
 *
 * `[원문 p.55]`가 유량계 범위를 0~1,000 m³/day로 적어 두어 그것을 천장으로 박으면 날마다
 * 같은 눈금이 된다. 그러나 **사업장마다 평소 유량이 다르다** — 150 언저리를 쓰는 곳은 선이
 * 바닥에 눌려 모양이 사라진다. 천장은 그날 값에서 올리고(1·2·5 계열), 대신 **바닥은 언제나
 * `0`이라** 높이가 뜻을 잃지 않는다. `SCR-OP-011`의 같은 계열도 `[0, dataMax]`를 쓴다 —
 * 한 사업장을 두 화면이 다르게 그리지 않는다(**E3**).
 *
 * ## 시각은 정시에 맞춘다
 *
 * 계열을 n등분하면 `13:28 · 17:28`처럼 어중간한 수가 서고, 벽에서 묻는 것은 «몇 시쯤부터»다.
 * 맨 끝 하나만 정시가 아닌 «지금»이라, 그림의 오른쪽 끝이 언제인지가 드러난다.
 *
 * **시간대는 축이 아니라 머리 띠가 적는다**(**E5**). 맨 끝 라벨에 `KST`를 붙였더니 그 앞
 * 정시 눈금과 겹쳤다(캡처에서 드러났다) — 축은 눈금만 갖고, 단위·구간·시간대는 패널 머리
 * 띠 한 줄이 함께 맡는다.
 */
export function WallTrend({
  code,
  values,
  times,
  missing,
}: {
  code: MeasurementItemCode;
  values: (number | null)[];
  times: string[];
  /** 결측 표본 수 — 몇 개가 비었는지 세지 않으면 얼마나 비었는지 알 수 없다(**E4**) */
  missing: number;
}) {
  const known = values.filter((value): value is number => value !== null);
  const top = niceCeil(known.length > 0 ? Math.max(...known) : 0);
  const ticks = trendTicks(times, WALL_TREND_TICK_HOURS, WALL_TREND_TICK_MIN_GAP);
  const lastIndex = times.length - 1;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-w-0 gap-2">
        {/*
         * 세로 눈금. **절대 위치로 격자선에 정확히 맞춘다** — `justify-between`으로 늘어놓으면
         * 맨 위·아래 라벨이 글자 높이의 절반만큼 안쪽으로 밀려, 천장 눈금이 천장보다 낮은
         * 값을 가리키는 것처럼 보인다.
         *
         * 폭은 `ch`라 글자 크기를 따라간다 — 화면이 커지면 글자와 함께 넓어진다.
         */}
        <div className={cn('wall-axis-y relative shrink-0 text-fg-subtle', WALL_META)}>
          {WALL_TREND_GRID_AT.map((fraction) => (
            <span
              key={fraction}
              className="num absolute right-0 -translate-y-1/2"
              style={{ top: `${fraction * 100}%` }}
            >
              {formatValue(code, top * (1 - fraction))}
            </span>
          ))}
          <span className="num absolute right-0 bottom-0 translate-y-1/2">
            {formatValue(code, 0)}
          </span>
        </div>

        {/* 바닥의 hairline이 «0 축선»이다 — 격자선(파선)과 갈라 놓는다 */}
        <div className="min-w-0 flex-1 border-b border-border">
          <WallSpark
            values={values}
            className={WALL_SPARK_CLASS}
            domain={[0, top]}
            gridAt={WALL_TREND_GRID_AT}
          />
        </div>
      </div>

      {/*
       * 가로 눈금. 세로 눈금 칸만큼 비우고 시작해야 **`0` 라벨 아래가 아니라 그림 아래**에 선다.
       * 맨 끝 라벨은 오른쪽 밖으로 나가지 않게 안쪽으로 붙인다.
       */}
      <div className="flex min-w-0 gap-2">
        <div className="wall-axis-y shrink-0" aria-hidden />
        <div className={cn('relative min-w-0 flex-1 text-fg-subtle', WALL_META)}>
          {/* 라벨 한 줄 높이를 흐름으로 확보한다 — 절대 위치만 두면 줄이 접힌다 */}
          <span className="invisible">0</span>
          {ticks.map((tick) => {
            const percent = (tick.index / Math.max(1, lastIndex)) * 100;
            return (
              <span
                key={tick.index}
                className="num absolute top-0 whitespace-nowrap"
                style={{
                  left: `${percent}%`,
                  transform: percent > 95 ? 'translateX(-100%)' : 'translateX(-50%)',
                }}
              >
                {tick.label}
              </span>
            );
          })}
        </div>
      </div>

      <p className={cn('mt-auto flex justify-between pt-2 text-fg-subtle', WALL_META)}>
        <span>{missing > 0 ? `결측 ${missing}건` : '결측 없음'}</span>
        {/* 바닥에 닿은 구간은 **받은 값이 0**이지 못 받은 것이 아니다(E4) */}
        <span>방류를 멈춘 구간은 0</span>
      </p>
    </div>
  );
}
