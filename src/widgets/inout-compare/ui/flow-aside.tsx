'use client';

import { MEASUREMENT_ITEMS } from '@/shared/config/measurement';
import { ACTUAL_HEX } from '@/shared/config/status-visual';
import { DISPLAY_TIMEZONE, formatClock } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { SPARK_H_PX } from '../config/constants';
import type { ComparePoint, InOutCompare, PointReading } from '../lib/point-readings';
import { SectionPanel } from './section-panel';
import { TrendRail } from './trend-rail';

/**
 * 물의 양 — **보조다.**
 *
 * 한때 이것이 이 화면의 히어로였다(마주 보는 두 기둥). **양은 처리 여부를 말하지 않는다**
 * `[사용자 지적 2026-09-10: 유입 유출의 방류량이 중요한 것이 아닌 …]` — 들어온 만큼 나가는
 * 것이 정상이라, 큰 숫자로 세우면 화면이 답하지 않는 질문을 주인공으로 삼는 셈이 된다.
 *
 * **그래도 지운 것은 아니다.** 유입−유출의 차는 무단방류 의심의 단서이고 `[TBD-46]`, 유입
 * 펌프 전류·방류 수조 수위와 함께 «물이 실제로 오가고 있는가»를 받쳐 준다 — 수질 대조가
 * 성립하려면 물이 흐르고 있어야 한다. 자리를 아래로 내리고 값 크기를 한 단 낮췄다.
 */
export function FlowAside({
  compare,
  pending,
  dischargingNow,
}: {
  compare: InOutCompare;
  pending: boolean;
  dischargingNow: boolean | null;
}) {
  return (
    <SectionPanel
      title="물의 양 — 흐르고 있는가"
      aside={
        <p className="rounded-chip bg-surface-3 px-2 py-0.5 text-[12px] text-fg-muted">
          {dischargingNow === null ? '방류 여부 모름' : dischargingNow ? '방류 중' : '방류 없음'}
        </p>
      }
    >
      {/*
       * **두 그래프가 대비되어 보이게 한다** `[사용자 요청 2026-09-10: 유입과 유출이 명확하게
       * 대비되어 보이도록 · 나란히 있는 구조는 유지]`.
       *
       * 나란한 배치는 그대로 두고 **틀만 세웠다** — 두 쪽이 각자 hairline 상자를 갖고 그
       * 안에 머리 띠(`유입수`·`유출수`)가 붙는다. 이름이 값과 같은 크기의 글자로 흩어져
       * 있던 판본에서는 어느 숫자가 어느 지점 것인지 가운데 `유입 − 유출`까지 읽어야 알았다.
       */}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-stretch lg:gap-4">
        <Pillar point={compare.inlet} pending={pending} />
        <Held compare={compare} pending={pending} />
        <Pillar point={compare.outlet} pending={pending} align="right" />
      </div>
    </SectionPanel>
  );
}

function Pillar({
  point,
  pending,
  align = 'left',
}: {
  point: ComparePoint;
  pending: boolean;
  align?: 'left' | 'right';
}) {
  const right = align === 'right';

  return (
    <section className="flex flex-col overflow-hidden rounded-nested border border-border">
      {/* 머리 띠 — 어느 지점인지가 값보다 먼저 읽혀야 한다 */}
      <p
        className={cn(
          'border-b border-border bg-surface-2 px-3 py-1.5 text-[12px] font-semibold uppercase tracking-wide text-fg-subtle',
          right && 'text-right',
        )}
      >
        {point.label}
      </p>

      <div className={cn('flex flex-1 flex-col gap-2 px-3 py-2.5', right && 'items-end text-right')}>
      {pending ? (
        <span className="block h-6 w-28 animate-pulse rounded-chip bg-surface-3" />
      ) : point.flow.unreceived ? (
        <p className="text-[12px] leading-relaxed text-fg-subtle">
          이 사업장은 {point.flow.label}을 받지 않습니다
        </p>
      ) : point.flow.value === null ? (
        <p className="text-[12px] text-fg-subtle">최근 24시간 수신 없음</p>
      ) : (
        <p className="flex items-baseline gap-1.5">
          <span
            className="num text-[22px] font-bold leading-none tracking-tight"
            style={{ color: ACTUAL_HEX }}
          >
            {point.flow.valueText}
          </span>
          <span className="text-[12px] text-fg-subtle">{point.flow.unit}</span>
        </p>
      )}

      {/*
       * **«지금»이라 부르지 않고 언제 것인지 적는다**(E5). 계측 서버가 우리 시간축보다
       * 1분쯤 뒤에 써서 맨 끝 칸이 늘 비는데, 그 사실을 감추면 옛 값이 현재값으로 읽힌다.
       */}
      {!pending && point.flow.observedIso && (
        <p className="num text-[12px] text-fg-subtle">
          {`${formatClock(point.flow.observedIso)} ${DISPLAY_TIMEZONE} 관측`}
        </p>
      )}

      {!pending && !point.flow.unreceived && (
        <TrendRail
          values={point.history}
          average={point.flow.average}
          color={ACTUAL_HEX}
          className="w-full"
          {...{ style: { height: SPARK_H_PX } }}
        />
      )}

      <dl
        className={cn(
          'mt-auto flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-2',
          right && 'justify-end',
        )}
      >
        {point.aside.map((reading) => (
          <Aside key={reading.code} reading={reading} pending={pending} />
        ))}
      </dl>
      </div>
    </section>
  );
}

/**
 * 가운데 — **유입 − 유출.**
 *
 * «처리 중인 양»이라 부르지 않는다. 차이는 체류·슬러지·증발이 섞인 값이고, 하나로 단정하면
 * 재 보지 않은 해석을 화면이 주장하게 된다.
 */
function Held({ compare, pending }: { compare: InOutCompare; pending: boolean }) {
  return (
    /*
     * **가운데가 두 상자를 잇는다** `[사용자 요청 2026-09-10: 중앙의 유입 → 유출 관계가 더
     * 명확하게 보이도록 개선한다]`.
     *
     * 선이 **양쪽으로 뻗어** 두 상자에 실제로 닿고, 그 위에 화살촉이 흐름 방향을 준다.
     * 한때 선이 한쪽에만 있어 «어디서 어디로»가 형태로 끊겼다. 값·문구는 그대로다.
     *
     * **값이 «오류»로 보이지 않게 한다** `[사용자 요청 2026-09-10: 중앙 숫자 «-421»은 현재
     * 데이터 그대로 유지하되 불필요하게 오류/위험을 의미하는 것처럼 보이지 않도록 시각적
     * 처리를 조정한다]`. 두 지점 값과 같은 22px·`font-bold`·`--fg`였는데, 그러면 마이너스가
     * 붙은 그 숫자가 세 값 중 **가장 진한 잉크**가 되어 «여기가 문제»로 읽혔다. 유입보다 유출이
     * 많은 것은 저류된 물이 나가는 중일 수도 있는 사실이고 이 화면은 그것을 판정하지 않는다.
     *
     * 그래서 **한 단 물렸다** — `font-semibold` + `--fg-muted`. 값·부호·단위는 그대로이고
     * 새 문구도 붙이지 않았다. 판정하지 않는 값이 판정하는 값보다 조용해진 것뿐이다.
     */
    <section className="flex flex-col items-center justify-center gap-1 lg:w-[160px]">
      <span aria-hidden className="flex w-full items-center gap-1">
        <span className="h-px flex-1 bg-border-strong" />
        <span className="size-2 shrink-0 rotate-45 border-r-2 border-t-2 border-border-strong" />
        <span className="h-px flex-1 bg-border-strong" />
      </span>

      <p className="mt-1 text-[12px] font-semibold uppercase tracking-wide text-fg-subtle">
        유입 − 유출
      </p>

      {pending ? (
        <span className="block h-6 w-16 animate-pulse rounded-chip bg-surface-3" />
      ) : compare.held !== null ? (
        <p className="flex items-baseline gap-1">
          <span className="num text-[22px] font-semibold leading-none tracking-tight text-fg-muted">
            {compare.heldText}
          </span>
          <span className="text-[12px] text-fg-subtle">{MEASUREMENT_ITEMS.inflow.unit}</span>
        </p>
      ) : (
        /* 한쪽이라도 모르면 모른다 — 0으로 채우면 «머문 양 0»이라는 사실 주장이 된다(E4) */
        <p className="text-[12px] text-fg-subtle">수신 없음</p>
      )}
    </section>
  );
}

function Aside({ reading, pending }: { reading: PointReading; pending: boolean }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-[12px] text-fg-subtle">{reading.label}</dt>
      <dd className="flex items-baseline gap-1">
        {pending ? (
          <span className="block h-4 w-10 animate-pulse rounded-chip bg-surface-3" />
        ) : reading.value === null ? (
          <span className="text-[12px] text-fg-subtle">수신 없음</span>
        ) : (
          <>
            <span className="num text-[14px] font-bold text-fg">{reading.valueText}</span>
            {reading.unit && <span className="text-[12px] text-fg-subtle">{reading.unit}</span>}
          </>
        )}
      </dd>
    </div>
  );
}
