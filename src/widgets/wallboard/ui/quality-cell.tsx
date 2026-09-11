'use client';

import {
  UNRESOLVED_LIMIT_TEXT,
  formatLimitRange,
  type DischargeLimit,
  type DischargeLimitTable,
} from '@/shared/config/discharge-limits';
import { MEASUREMENT_ITEMS, type MeasurementItemCode } from '@/shared/config/measurement';
import { STATUS_VISUAL } from '@/shared/config/status-visual';
import { cn } from '@/shared/lib/cn';
import { formatValue } from '@/shared/lib/format';
import type { Reading } from '@/entities/measurement';
import {
  WALL_CELL_SPARK_CLASS,
  WALL_CELL_SPARK_H,
  WALL_LABEL,
  WALL_META,
  WALL_UNIT,
  WALL_VALUE_LG,
} from '../config/constants';
import { useValueFlash } from '../lib/use-value-flash';
import { WallBar } from './wall-bar';
import { WallSpark } from './wall-spark';

/** 기준을 넘지 않은 항목. 등급 색과 같은 축이라 새 색을 만들지 않는다 */
const WITHIN_LIMIT = STATUS_VISUAL.normal.hex;
const OVER_LIMIT = STATUS_VISUAL.critical.hex;

/**
 * 판정할 수 없는 항목. **상태색을 쓰지 않는다** — 등급을 모르는데 초록을 칠하면 정상 주장이다.
 *
 * `--missing`(결측색)이 아니라 중립 글자색을 쓴다. 이 값들은 **결측이 아니라 온 값이고 다만
 * 판정할 기준이 없는 것**이라 결측색은 뜻으로 틀리고, 그 색은 홈 면과 명도가 가까워 2~3m
 * 에서 막대 길이가 아예 읽히지 않는다.
 */
const UNJUDGED = 'var(--fg-subtle)';

/**
 * 계측 한 항목 — **지금 값과 그 값이 어디쯤인가.**
 *
 * 레퍼런스의 «값 + 막대 + 곁의 사실» 한 칸을 따른다. 막대는 문법이 하나다: **트랙이 범위,
 * 채움 길이가 지금 값의 위치.** 다만 그 범위가 무엇인지는 항목마다 다르고, 막대 아래 글이
 * 매번 그것을 말한다.
 *
 * | | 트랙 | 색 |
 * |---|---|---|
 * | 기준이 있는 항목(pH) | **배출허용기준** | 초과 여부(등급색) |
 * | 기준이 없는 항목 | **오늘 관측 범위** | 중립 — 판정할 수 없다 |
 *
 * **기준을 지어내지 않는다.** `[공정자료 p.11]`이 확인해 준 것은 pH 5.8~8.6뿐이고 나머지는
 * 규모·지역별 기준표가 있어야 고를 수 있다 `[TBD-45]`. 없는 기준으로 초록 막대를 그리면
 * 없는 «정상» 판정을 만든다(`README` §3.1 «지어내지 않는 둘»).
 *
 * **기준치는 사용자가 설정한 표에서 온다** — 정적 표를 읽으면 사업장 설정에서 고친 값이 이
 * 화면에만 반영되지 않아 같은 항목이 화면마다 다르게 판정된다.
 */
export function QualityCell({
  code,
  values,
  limits,
}: {
  code: MeasurementItemCode;
  values: Reading[];
  limits: DischargeLimitTable;
}) {
  const item = MEASUREMENT_ITEMS[code];
  const latest = [...values].reverse().find((value) => value !== null) ?? null;
  const limit = limits[code];
  const limitText = formatLimitRange(limit, item.decimals);
  const flashing = useValueFlash(latest);

  const numbers = values.filter((value): value is number => value !== null);
  const observed: [number, number] | null =
    numbers.length > 0 ? [Math.min(...numbers), Math.max(...numbers)] : null;

  const judged = limitText !== null && limit !== undefined;
  const track = judged ? limitTrack(limit) : observed;
  const over = judged && latest !== null && overLimit(limit, latest);
  const color = !judged ? UNJUDGED : over ? OVER_LIMIT : WITHIN_LIMIT;

  return (
    <article
      className={cn(
        /*
         * **가운데로 모은다.** `justify-between`이던 판본은 칸이 내용보다 훨씬 높아
         * 이름·값·막대가 위아래 끝으로 흩어졌다(캡처에서 드러났다) — 2~3m에서는 한 덩어리로
         * 보여야 한 항목으로 읽힌다.
         */
        'flex min-w-0 flex-col justify-center rounded-nested border border-border bg-surface-2 wall-pad-sm transition-colors duration-500',
        flashing && 'bg-accent-weak',
      )}
    >
      <p className="flex min-w-0 items-baseline gap-2">
        <span className={cn('min-w-0 truncate', WALL_LABEL)}>{item.label}</span>
        <span className={cn('shrink-0 text-fg-subtle', WALL_META)}>{item.symbol}</span>
      </p>

      <p className="mt-2 flex items-baseline gap-1.5">
        {/* 결측은 «0»이 아니라 «수신 없음»이다 — 0으로 적으면 재 본 값이 된다(E4) */}
        <span className={cn('num', WALL_VALUE_LG, latest === null ? 'text-fg-subtle' : 'text-fg')}>
          {latest === null ? '수신 없음' : formatValue(code, latest)}
        </span>
        {latest !== null && item.unit !== '' && (
          <span className={WALL_UNIT}>{item.unit}</span>
        )}
      </p>

      {/*
       * **24시간 흐름과 «지금 어디쯤»은 다른 축이다.**
       *
       * 선은 «어떻게 움직여 왔나», 막대는 «기준 안인가»를 말한다. 레퍼런스의 작은 패널이
       * 같은 자리에 선과 값 칩을 함께 두는 짜임이고, 벽에서는 **추세가 보여야 값 하나가
       * 튄 것인지 계속 오르고 있는 것인지** 갈린다.
       *
       * 값을 새로 만들지 않는다 — 위의 `latest`와 같은 계열을 그대로 그린다.
       */}
      <div className="mt-2">
        <WallSpark values={values} height={WALL_CELL_SPARK_H} className={WALL_CELL_SPARK_CLASS} />
      </div>

      <WallBar percent={positionIn(track, latest)} color={color} className="mt-2.5 h-2" />

      <p className={cn('mt-2 truncate text-fg-subtle', WALL_META)}>
        {judged ? (
          <>
            기준 <span className="num font-bold text-fg-muted">{limitText}</span>
            {over && <span className="ml-1.5 font-bold text-critical-ink">초과</span>}
          </>
        ) : observed !== null ? (
          <>
            오늘{' '}
            <span className="num">
              {formatValue(code, observed[0])}–{formatValue(code, observed[1])}
            </span>
          </>
        ) : (
          UNRESOLVED_LIMIT_TEXT
        )}
      </p>
    </article>
  );
}

/**
 * 기준을 트랙으로 편다. **한쪽만 있는 기준도 받는다** — TOC·TN·TP는 상한만 들어온다
 * (`LIMIT_INPUT_KIND`). 하한이 없으면 0에서 시작한다.
 */
function limitTrack(limit: DischargeLimit): [number, number] | null {
  const { min, max } = limit;
  if (min !== null && max !== null) return [min, max];
  if (max !== null) return [0, max];
  return null;
}

function overLimit(limit: DischargeLimit, value: number): boolean {
  if (limit.max !== null && value > limit.max) return true;
  return limit.min !== null && value < limit.min;
}

/**
 * 값이 트랙 어디쯤인가(0~100).
 *
 * **범위를 벗어난 값도 길이를 갖는다** — 0~100으로 잘리므로 초과는 꽉 찬 막대가 되고 색이
 * 초과를 말한다. 트랙 폭이 0이면(관측값이 하나뿐이라 최소=최대) 위치를 정할 수 없어 가운데에 둔다.
 */
function positionIn(track: [number, number] | null, value: number | null): number {
  if (track === null || value === null) return 0;
  const [low, high] = track;
  if (high === low) return 50;
  return ((value - low) / (high - low)) * 100;
}
