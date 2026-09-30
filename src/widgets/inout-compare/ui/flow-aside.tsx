'use client';

import { MEASUREMENT_ITEMS } from '@/shared/config/measurement';
import { ACTUAL_HEX } from '@/shared/config/status-visual';
import { DISPLAY_TIMEZONE, formatClock } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { PROVISIONAL_DISPLAY_DECIMALS } from '@/shared/config/provisional';
import type { SiteReuse } from '@/features/discharge-limit-settings';
import { SPARK_H_PX } from '../config/constants';
import type { ComparePoint, InOutCompare, PointReading } from '../lib/point-readings';
import { SectionPanel } from './section-panel';
import { TrendRail } from './trend-rail';
import styles from './flow-aside.module.scss';

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
  reuse,
}: {
  compare: InOutCompare;
  pending: boolean;
  dischargingNow: boolean | null;
  /** 처리수 재이용 — 사업장 규제정보가 받는다 `[사용자 결정 2026-09-29: 재이용 (가)]` */
  reuse: SiteReuse;
}) {
  return (
    <SectionPanel
      title="물의 양 — 흐르고 있는가"
      aside={
        <p className={styles.dischargeChip}>
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
      <div className={styles.columns}>
        <Pillar point={compare.inlet} pending={pending} />
        <Held compare={compare} pending={pending} reuse={reuse} />
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
    <section className={styles.pillar}>
      {/* 머리 띠 — 어느 지점인지가 값보다 먼저 읽혀야 한다 */}
      <p className={cn(styles.pillarHead, right && styles.alignRight)}>
        {point.label}
      </p>

      <div className={cn(styles.pillarBody, right && styles.pillarBodyRight)}>
      {pending ? (
        <span className={cn(styles.flowSkeleton, 'pulse')} />
      ) : point.flow.unreceived ? (
        <p className={styles.unreceived}>
          이 사업장은 {point.flow.label}을 받지 않습니다
        </p>
      ) : point.flow.value === null ? (
        <p className={styles.note}>최근 24시간 수신 없음</p>
      ) : (
        <p className={styles.reading}>
          <span
            className={cn('num', styles.flowValue)}
            style={{ color: ACTUAL_HEX }}
          >
            {point.flow.valueText}
          </span>
          <span className={styles.note}>{point.flow.unit}</span>
        </p>
      )}

      {/*
       * **«지금»이라 부르지 않고 언제 것인지 적는다**(E5). 계측 서버가 우리 시간축보다
       * 1분쯤 뒤에 써서 맨 끝 칸이 늘 비는데, 그 사실을 감추면 옛 값이 현재값으로 읽힌다.
       */}
      {!pending && point.flow.observedIso && (
        <p className={cn('num', styles.note)}>
          {`${formatClock(point.flow.observedIso)} ${DISPLAY_TIMEZONE} 관측`}
        </p>
      )}

      {!pending && !point.flow.unreceived && (
        <TrendRail
          values={point.history}
          average={point.flow.average}
          color={ACTUAL_HEX}
          className={styles.rail}
          {...{ style: { height: SPARK_H_PX } }}
        />
      )}

      <dl className={cn(styles.asides, right && styles.asidesRight)}>
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
function Held({
  compare,
  pending,
  reuse,
}: {
  compare: InOutCompare;
  pending: boolean;
  reuse: SiteReuse;
}) {
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
    <section className={styles.held}>
      <span aria-hidden className={styles.connector}>
        <span className={styles.connectorLine} />
        <span className={styles.connectorHead} />
        <span className={styles.connectorLine} />
      </span>

      <p className={styles.heldLabel}>
        유입 − 유출
      </p>

      {pending ? (
        <span className={cn(styles.heldSkeleton, 'pulse')} />
      ) : compare.held !== null ? (
        <p className={styles.heldReading}>
          <span className={cn('num', styles.heldValue)}>
            {compare.heldText}
          </span>
          <span className={styles.note}>{MEASUREMENT_ITEMS.inflow.unit}</span>
        </p>
      ) : (
        /* 한쪽이라도 모르면 모른다 — 0으로 채우면 «머문 양 0»이라는 사실 주장이 된다(E4) */
        <p className={styles.note}>수신 없음</p>
      )}

      {/*
       * **재이용 사업장이라는 사실만 적는다** `[사용자 결정 2026-09-29: 재이용 (가)]` — 유출이 유입보다
       * 적은 까닭 하나를 화면이 말하게 한다. 빼서 고치지 않고 «포함»이라고도 적지 않는다: 재이용량은
       * 일평균이고 위 차이는 순간값이라, 둘을 한 식에 넣으면 두 시간 축을 섞는다(«198 포함»이 차이
       * 44 아래 적혀 모순으로 읽혔다). 양은 입력한 자릿수 그대로다.
       */}
      {!pending && reuse.status === 'partial' && (
        <p className={styles.reuse}>
          처리수 일부 재이용
          <br />
          {reuse.dailyM3 === null
            ? '재이용량 모름'
            : `일평균 ${reuse.dailyM3.toFixed(PROVISIONAL_DISPLAY_DECIMALS.dailyWastewaterM3)} ${MEASUREMENT_ITEMS.inflow.unit}`}
        </p>
      )}
    </section>
  );
}

function Aside({ reading, pending }: { reading: PointReading; pending: boolean }) {
  return (
    <div className={styles.aside}>
      <dt className={styles.note}>{reading.label}</dt>
      <dd className={styles.asideValue}>
        {pending ? (
          <span className={cn(styles.asideSkeleton, 'pulse')} />
        ) : reading.value === null ? (
          <span className={styles.note}>수신 없음</span>
        ) : (
          <>
            <span className={cn('num', styles.asideNumber)}>{reading.valueText}</span>
            {reading.unit && <span className={styles.note}>{reading.unit}</span>}
          </>
        )}
      </dd>
    </div>
  );
}
