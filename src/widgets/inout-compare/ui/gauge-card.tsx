'use client';

import { MEASUREMENT_GRADE_HEX } from '@/shared/config/status-visual';
import { cn } from '@/shared/lib/cn';
import { VALUE_LG, VALUE_MD } from '@/shared/ui/type-scale';
import { GAUGE_GEOMETRY, INLET_MARK_COLOR } from '../config/constants';
import { verdictText, type PointReading, type TreatmentRow } from '../lib/point-readings';
import { GaugeArc } from './gauge-arc';

/**
 * 항목 한 장 — **카드 안에서 유입수와 유출수를 견준다** `[사용자 요청 2026-09-10]`.
 *
 * 두 지점 이름은 한때 `들어온 물`·`나간 물`이었다 `[사용자 요청 2026-09-10: 용어 변경]`.
 * 아래 인용에 옛 낱말이 남아 있는 것은 **그때 사용자가 실제로 쓴 말이라서**다.
 *
 * ## 위계를 여섯으로 못박았다 — 게이지가 맨 뒤다
 *
 * `[사용자 요청 2026-09-10: 카드의 정보 우선순위를 ①센서명 ②들어온 물 값 ③나간 물 값 ④변화
 * ⑤상태 ⑥게이지 순으로 · 게이지는 삭제하지 않아도 되지만 현재보다 시각적 비중을 줄여라 ·
 * 숫자가 게이지보다 먼저 읽히도록 한다]`.
 *
 * 1. **머리 띠** — 항목명 + 단위. 단위를 여기 한 번만 적어 아래 두 값이 **같은 모양**이 된다
 * 2·3. **두 값이 나란히 마주 본다** — 왼쪽이 유입수, 오른쪽이 유출수, 그 사이에 `→`
 * 4. **변화** — 두 값 바로 아래 가운데
 * 5. **상태** — hairline 아래로 내려 값과 갈린다
 * 6. **게이지** — 그 상태 줄의 오른쪽 끝. **카드에서 마지막에 읽히는 자리다**
 *
 * ## 왜 세로에서 가로로 다시 돌렸는가
 *
 * 앞 판본은 유입수를 위, 유출수를 아래에 두고 세로선으로 이었다. **방향은 읽혔지만 두
 * 값이 한눈에 견줘지지 않았다** — 눈이 위아래로 움직여야 했고, 그 사이에 변화 줄과 게이지가
 * 끼어 있었다. `[사용자 요청 2026-09-10]`이 원한 형태가 이것이다:
 *
 * ```
 * 유입수          유출수
 *  10.38     →     8.30
 *       ▼ 20% 감소
 * ```
 *
 * **두 값이 같은 기준선에 서면 자릿수가 아니라 크기가 바로 보인다.** 그리고 여덟 장을 훑을 때
 * 유입수는 전부 카드 왼쪽 끝, 유출수는 전부 오른쪽 끝에 있어 **열처럼 읽힌다** — 카드가
 * 달라도 숫자의 자리가 같다 `[사용자 요청 2026-09-10: 카드마다 숫자의 위치가 달라 보이지 않게
 * 한다 · 8개 카드를 빠르게 비교할 수 있도록]`.
 *
 * ## 산업용 계기 타일로 보이게 한다
 *
 * `[사용자 요청 2026-09-10: 실제 폐수처리 시설 운영자가 쓰는 모니터링 시스템 · 과도한 장식 배제]`.
 * 흰 면 + hairline이라 격자가 계기판처럼 읽히고, 유사한 카드만 면을 한 단 넣어 눈에 띄게
 * 한다(색이 아니라 면이다).
 */
export function GaugeCard({
  row,
  pending,
  index,
}: {
  row: TreatmentRow;
  pending: boolean;
  index: number;
}) {
  const limitVerdict = verdictText(row.outlet);
  const known = row.inlet.value !== null && row.outlet.value !== null;

  return (
    <div
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-nested border',
        row.similar ? 'border-border-strong bg-surface-2' : 'border-border bg-surface',
      )}
    >
      {/* 1. 머리 띠 — 항목명과 단위. 단위는 여기 한 번뿐이라 아래 두 값이 같은 모양이 된다 */}
      <div className="flex items-baseline justify-between gap-2 border-b border-border px-3 py-2">
        <p className="truncate text-[12px] font-semibold text-fg" title={row.label}>
          {row.label}
        </p>
        {row.unit && <span className="shrink-0 text-[12px] text-fg-subtle">{row.unit}</span>}
      </div>

      <div className="flex flex-1 flex-col justify-center px-3 py-3">
        {/*
         * 2·3. **두 값이 마주 본다.** 세 열(`1fr auto 1fr`)이라 여덟 장이 전부 같은 기하를
         * 갖는다 — 유입수는 왼쪽 끝, 유출수는 오른쪽 끝, `→`는 늘 가운데다.
         */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-baseline gap-x-1">
          <PointLabel label="유입수" color={INLET_MARK_COLOR} />
          <span />
          <PointLabel
            label="유출수"
            color={MEASUREMENT_GRADE_HEX[row.outlet.grade]}
            filled
            align="right"
          />

          <PointValue reading={row.inlet} color={INLET_MARK_COLOR} pending={pending} />
          {/*
           * 방향은 **화살표 모양**이 나른다 — 색이 아니다(§8 `막대·게이지`). 값이 하나라도
           * 없으면 이을 것이 없으므로 그리지 않는다.
           */}
          <span
            aria-hidden
            className={cn(
              /* 22px 값 둘 사이에서 14px은 묻혔다 — 방향이 «즉시» 보여야 하는 자리다 */
              'shrink-0 px-0.5 text-[17px] leading-none',
              known ? 'text-fg-muted' : 'text-transparent',
            )}
          >
            →
          </span>
          <PointValue
            reading={row.outlet}
            color={MEASUREMENT_GRADE_HEX[row.outlet.grade]}
            pending={pending}
            align="right"
          />
        </div>

        {/* 4. 변화 — 두 값 바로 아래 가운데. «이 값이 저 값이 됐고 그 폭이 이만큼»의 마무리다 */}
        <div className="mt-2.5 flex min-h-5 flex-wrap items-baseline justify-center gap-x-1.5">
          {pending ? (
            <span className="block h-4 w-16 animate-pulse rounded-chip bg-surface-3" />
          ) : (
            <ChangeText row={row} known={known} />
          )}
        </div>
      </div>

      {/*
       * 5·6. 상태와 게이지 — hairline 아래. 게이지는 카드에서 마지막에 읽히는 자리다.
       *
       * **격자로 나눈다 — 게이지 폭이 카드마다 달라지지 않게.** `justify-between`이던 판본은
       * 남는 폭을 상태 문구가 먼저 먹어 `판정 대상 아님 기준 이내`가 붙은 카드의 게이지가
       * 다른 카드보다 좁게 그려졌다(1440px 캡처에서 드러났다) — 여덟 장을 훑을 때 같은
       * 그림이 카드마다 다른 크기면 크기가 값을 뜻하는 것으로 오독된다.
       *
       * 지금은 게이지 열이 **고정 폭**이고 접히는 쪽은 상태 문구다.
       */}
      {!pending && (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 border-t border-border px-3 py-1.5">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <Mark row={row} />
            {/* 기준이 걸리지 않는 항목에는 아무것도 적지 않는다 — 없는 기준을 예고하지 않는다 */}
            {limitVerdict && <span className="text-[12px] text-fg-subtle">{limitVerdict}</span>}
          </div>

          <div
            className="shrink-0"
            style={{ width: GAUGE_GEOMETRY.width, height: GAUGE_GEOMETRY.height }}
          >
            {known && (
              <GaugeArc inlet={row.inlet.value!} outlet={row.outlet.value!} index={index} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 지점 이름 한 줄 — **점의 채움이 원천을 나른다.**
 *
 * 유출수는 실측이라 속이 찼고, 유입수는 서버에 채널이 없어 역산한 시연값이라(`[TBD-59]`)
 * 속이 비었다. 게이지의 두 호와 같은 색이라 어느 호가 어느 값인지 카드 안에서 이어진다.
 */
function PointLabel({
  label,
  color,
  filled = false,
  align = 'left',
}: {
  label: string;
  color: string;
  filled?: boolean;
  align?: 'left' | 'right';
}) {
  return (
    <span
      className={cn(
        'flex min-w-0 items-center gap-1.5',
        align === 'right' && 'flex-row-reverse',
      )}
    >
      <span
        aria-hidden
        className="inline-block size-2 shrink-0 rounded-full"
        style={
          filled
            ? { backgroundColor: color }
            : { border: `2px solid ${color}`, background: 'var(--surface)' }
        }
      />
      <span className="truncate text-[12px] text-fg-subtle">{label}</span>
    </span>
  );
}

/**
 * 한 지점의 값 — **이 카드에서 가장 큰 글자다**(`VALUE_LG` 22px).
 *
 * `[사용자 요청 2026-09-10: 숫자와 변화값이 가장 먼저 읽혀야 한다]`. 게이지는 이보다 작고
 * 아래에 있고, 상태 문구는 12px다.
 */
function PointValue({
  reading,
  color,
  pending,
  align = 'left',
}: {
  reading: PointReading;
  color: string;
  pending: boolean;
  align?: 'left' | 'right';
}) {
  const right = align === 'right';

  if (pending) {
    return (
      <span
        className={cn(
          VALUE_LG,
          'block w-14 animate-pulse rounded-chip bg-surface-3 text-transparent',
          right && 'ml-auto',
        )}
      >
        0
      </span>
    );
  }

  /* 결측은 «0»이 아니라 «수신 없음»이다 — 0으로 적으면 재 본 값이 된다(E4) */
  if (reading.value === null) {
    return (
      <span className={cn('block text-[12px] text-fg-subtle', right && 'text-right')}>
        수신 없음
      </span>
    );
  }

  /*
   * **숫자를 자르지 않는다.** `truncate`가 붙어 있던 판본은 좁은 카드에서 `10.38`을
   * `10…`으로 적었다 — 줄임표가 붙은 숫자는 읽는 사람에게 **다른 값**이다. 폭이 모자라는
   * 문제는 열 수로 막고(`TreatmentScale`의 컨테이너 문턱), 여기서는 잘리지 않게만 한다.
   */
  return (
    <span
      className={cn('num block whitespace-nowrap', VALUE_LG, right && 'text-right')}
      style={{ color }}
    >
      {reading.valueText}
    </span>
  );
}

/**
 * 변화 — **방향을 화살표가 나른다.**
 *
 * `[사용자 요청 2026-09-10: 텍스트만 읽어야 이해되는 방식보다 시각적으로 즉시 인지]`.
 * `감소`·`증가`라는 낱말은 그대로 두고 그 앞에 `▼`·`▲`를 세운다 — **색이 아니라 모양이다.**
 * §8 `막대·게이지`가 *"방향 같은 부수 축은 색이 아니라 아이콘 모양이 나른다"* 로 그 자리를
 * 이미 정해 두었고, 색으로 가르는 것은 §7.11이 기각했다(폭기가 올리는 DO에서 «증가=나쁨»이
 * 틀린 말이 된다).
 *
 * **한 줄로 이어 적는다.** 두 값이 가로로 마주 서게 되면서 이 줄에 카드 폭이 온전히 남았다 —
 * 앞 판본은 게이지에 자리를 빼앗겨 `▼20%`와 `감소`가 두 줄로 갈렸다.
 *
 * **모르는 것은 «판정 불가»다** — `0%`로 적으면 «재 봤더니 변화가 없었다»가 되어 두절이
 * 처리 미흡으로 읽힌다(**E4**).
 */
function ChangeText({ row, known }: { row: TreatmentRow; known: boolean }) {
  if (!known || row.changePercent === null) {
    return <span className="text-[12px] text-fg-subtle">판정 불가</span>;
  }

  const [magnitude, direction] = row.changeText.split(' ');
  const arrow = row.changePercent < 0 ? '▼' : row.changePercent > 0 ? '▲' : '＝';

  return (
    <>
      <span
        className={cn(
          'num inline-flex items-baseline gap-1 whitespace-nowrap',
          VALUE_MD,
          row.similar ? 'text-fg' : 'text-fg-muted',
        )}
      >
        <span aria-hidden className="text-[11px] leading-none">
          {arrow}
        </span>
        {magnitude}
      </span>
      {direction && (
        <span className="whitespace-nowrap text-[12px] text-fg-subtle">{direction}</span>
      )}
    </>
  );
}

/**
 * 그 카드의 처리 판정.
 *
 * 셋을 가른다 — **판정 대상이 아닌 항목에는 «유사»를 붙이지 않는다.** 수온·EC·pH가 유입과 같은
 * 것은 정상이라(`[TBD-59]`), 거기에 붙이면 정상이 결함으로 읽힌다. **상태색을 쓰지 않는다** —
 * 이 축은 등급이 아니다.
 *
 * **`--fg`가 아니라 `--fg-muted`다** `[사용자 요청 2026-09-10: 해당 상태가 숫자보다 작은
 * 보조정보라는 것을 typography와 색상으로 명확히 표현한다]`. 유사한 카드를 여전히 굵게 두어
 * 다른 일곱과 구별되지만, 잉크의 무게는 22px 값 아래로 내려간다 — 카드의 강조는 문구가 아니라
 * **바탕 면**이 맡는다.
 */
function Mark({ row }: { row: TreatmentRow }) {
  if (!row.judged) {
    return <span className="text-[12px] text-fg-subtle">판정 대상 아님</span>;
  }
  if (row.changePercent === null) return null;

  return row.similar ? (
    <span className="text-[12px] font-semibold text-fg-muted">유입과 거의 같음</span>
  ) : (
    <span className="text-[12px] text-fg-subtle">처리됨</span>
  );
}
