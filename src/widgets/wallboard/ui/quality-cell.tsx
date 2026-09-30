'use client';

import {
  LIMIT_LABEL,
  UNRESOLVED_LIMIT_TEXT,
  checkLimit,
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
import styles from './quality-cell.module.scss';

/** 기준을 넘지 않은 항목. 등급 색과 같은 축이라 새 색을 만들지 않는다 */
const WITHIN_LIMIT = STATUS_VISUAL.normal.hex;
const OVER_LIMIT = STATUS_VISUAL.critical.hex;

/**
 * **시연 임계값을 넘었을 때의 색** `[사용자 요청 2026-09-28: 설계 재설계 검토]`.
 *
 * 위험(`critical`)은 법정 위반이 얻는 색이다. 시연 임계값 초과에 그 색을 주면 2~3m 밖에서
 * 보는 사람에게 **법정 초과와 구별되지 않는다** — 이 화면은 글자가 아니라 색으로 읽힌다.
 */
const OVER_PROVISIONAL = STATUS_VISUAL.caution.hex;

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
  /*
   * **판정을 이 파일에서 다시 만들지 않는다** `[사용자 요청 2026-09-28]`. 한때 여기
   * `overLimit(limit, value)`라는 제 판본이 있었고, 그것이 `basis`를 몰라 **시연 임계값
   * 초과를 위험 색으로 칠했다** — 「기준 판정은 중앙화한다」를 스스로 어긴 자리였다.
   */
  const check = judged ? checkLimit(code, latest, limits) : { over: null, basis: 'none' as const };
  const color =
    check.over === null
      ? UNJUDGED
      : check.over
        ? check.basis === 'legal'
          ? OVER_LIMIT
          : OVER_PROVISIONAL
        : WITHIN_LIMIT;

  return (
    <article className={cn('wall-pad-sm', styles.cell, flashing && styles.cellFlashing)}>
      <p className={styles.head}>
        <span className={cn(styles.label, WALL_LABEL)}>{item.label}</span>
        <span className={cn(styles.symbol, WALL_META)}>{item.symbol}</span>
      </p>

      <p className={styles.reading}>
        {/* 결측은 «0»이 아니라 «수신 없음»이다 — 0으로 적으면 재 본 값이 된다(E4) */}
        <span className={cn('num', WALL_VALUE_LG, latest === null ? styles.valueMissing : styles.valuePresent)}>
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
      <div className={styles.spark}>
        <WallSpark values={values} height={WALL_CELL_SPARK_H} className={WALL_CELL_SPARK_CLASS} />
      </div>

      <WallBar percent={positionIn(track, latest)} color={color} className={styles.bar} />

      <p className={cn(styles.note, WALL_META)}>
        {judged ? (
          <>
            {/* 시연 임계값을 「기준」이라 부르지 않는다 — 2~3m 밖에서는 이 낱말만 읽힌다 */}
            {check.basis === 'none' ? LIMIT_LABEL.legal : LIMIT_LABEL[check.basis]}{' '}
            <span className={cn('num', styles.limit)}>{limitText}</span>
            {check.over === true && (
              <span
                className={cn(
                  styles.over,
                  check.basis === 'legal' ? styles.overLegal : styles.overProvisional,
                )}
              >
                초과
              </span>
            )}
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
