'use client';

import { ACTUAL_HEX } from '@/shared/config/status-visual';
import { motion, useInstantWhenReduced } from '@/shared/ui/motion';
import { COMPARE_ROW_STAGGER_S, GAUGE_GEOMETRY, INLET_MARK_COLOR } from '../config/constants';

const G = GAUGE_GEOMETRY;

/** 진입 전이 한 벌. 세 호가 같은 값을 봐야 한 몸으로 자란다 */
interface Grow {
  duration: number;
  delay: number;
  ease: readonly [number, number, number, number];
}

/**
 * **반원 게이지 — 유입수와 유출수, 그리고 그 사이.**
 *
 * 호가 셋이다. 안쪽이 유출수, 그 다음이 유입수, **맨 바깥이 걷어낸 만큼**이다.
 *
 * **바깥 호가 이 그림의 답이다.** 앞선 두 판본(좌우 막대 · 눈금 위 두 점)이 무너진 자리가
 * 여기였다 — 유입과 유출은 원래 비슷한 크기라 **각자의 길이로는 차이가 잘 안 보인다.**
 * 그래서 차이를 «두 길이를 눈으로 빼서» 읽게 하지 않고 **따로 그린다.**
 *
 * - 처리됐다 → 두 값 호의 끝이 벌어지고 **그 사이가 길다**(탁도 85% · 총유기탄소 70%)
 * - 유입과 거의 같다 → 끝이 나란히 붙어 **사이가 비어 있다**(정체 7%)
 *
 * **«비어 있음»이 곧 답이 된다** — 앞 두 판본은 «가득 참»이 답이라 차이가 묻혔다.
 *
 * 늘어난 항목(폭기가 올리는 DO)도 같은 식이다. 사이 구간은 **두 끝 사이**라 어느 쪽이 길든
 * 성립하고, 방향은 가운데 글자(`165% 증가`)가 말한다 — **색으로 가르지 않는다**(화면 문서
 * §7.11이 이미 기각: «줄어드는 것이 좋다»는 항목마다 다른 주장을 화면이 하게 된다).
 *
 * **줄 안에서만 뜻이 있다.** 항목마다 단위·범위가 달라(pH 0~14 · EC 0~20,000) 카드를 가로질러
 * 호 길이를 견주는 것은 뜻이 없다 — 실제 값은 카드 아래 숫자가 갖는다.
 */
export function GaugeArc({
  inlet,
  outlet,
  index,
}: {
  inlet: number;
  outlet: number;
  /** 카드마다 진입을 조금씩 늦춘다 — 여덟이 한꺼번에 자라면 어느 카드인지 읽히지 않는다 */
  index: number;
}) {
  /*
   * **감속 설정을 여기서 따로 읽는다.** `MotionConfig reducedMotion="user"`는 위치·크기
   * 계열만 즉시 끝내고 `pathLength`는 그 목록에 없다 — 그대로 두면 감속을 켠 사용자에게도
   * 카드 여덟 장 × 호 셋이 자란다.
   */
  const instant = useInstantWhenReduced();
  const transition: Grow = {
    duration: instant ? 0 : 0.6,
    delay: instant ? 0 : index * COMPARE_ROW_STAGGER_S,
    ease: [0.16, 1, 0.3, 1],
  };

  const peak = Math.max(Math.abs(inlet), Math.abs(outlet));
  const share = (value: number) => (peak === 0 ? 0 : Math.abs(value) / peak);
  const inletShare = share(inlet);
  const outletShare = share(outlet);

  return (
    <svg
      viewBox={`0 0 ${G.width} ${G.height}`}
      className="w-full"
      style={{ maxWidth: G.width }}
      /* 값은 전부 카드 안에 글자로 있다 — 이 그림은 그것을 되풀이하는 장식이다 */
      aria-hidden
    >
      <Track r={G.outerR} />
      <Track r={G.innerR} />

      <Arc r={G.outerR} share={inletShare} color={INLET_MARK_COLOR} transition={transition} />
      <Arc r={G.innerR} share={outletShare} color={ACTUAL_HEX} transition={transition} />

      <GapArc
        from={Math.min(inletShare, outletShare)}
        to={Math.max(inletShare, outletShare)}
        transition={transition}
      />
    </svg>
  );
}

/** 9시에서 3시로, 위쪽으로 도는 반원. `sweep-flag=1`이 위로 넘어가는 쪽이다 */
function semicircle(r: number): string {
  return `M ${G.cx - r} ${G.cy} A ${r} ${r} 0 0 1 ${G.cx + r} ${G.cy}`;
}

function Track({ r }: { r: number }) {
  return (
    <path
      d={semicircle(r)}
      fill="none"
      stroke="var(--surface-3)"
      strokeWidth={G.stroke}
      strokeLinecap="round"
    />
  );
}

/**
 * 값 호. **`pathLength`로 자란다** — framer-motion이 `stroke-dasharray`를 대신 계산하므로
 * 반지름마다 둘레를 손으로 재지 않아도 된다. `.process-flow`가 이미 같은 계열을 쓴다.
 *
 * **진입 시 1회다**(§8 `모션`). 무한 반복을 새로 만들지 않는다.
 */
function Arc({
  r,
  share,
  color,
  transition,
}: {
  r: number;
  share: number;
  color: string;
  transition: Grow;
}) {
  return (
    <motion.path
      d={semicircle(r)}
      fill="none"
      stroke={color}
      strokeWidth={G.stroke}
      strokeLinecap="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: share }}
      transition={transition}
    />
  );
}

/**
 * **걷어낸 만큼** — 두 값 호의 끝 사이 구간.
 *
 * `pathOffset`이 시작 자리를, `pathLength`가 길이를 정한다. 둘 다 framer-motion이 SVG 경로에
 * 직접 주는 값이라 각도를 손으로 계산하지 않는다.
 *
 * **맨 바깥에 둔다.** 처음에는 두 값 호 사이에 두었는데 **가운데 숫자를 가로질러** `85% 감소`가
 * 읽히지 않았다(브라우저 캡처에서 드러났다). 뜻으로도 바깥이 맞다 — 이 호는 두 값 중 하나가
 * 아니라 **둘의 관계**라 값 호 밖에 선다.
 *
 * **채우지 않고 얇은 실선 하나다.** 굵게 칠하면 그것이 곧 세 번째 «막대»가 되고, 이 화면은
 * 막대 형식을 쓰지 않기로 했다 `[사용자 요청 2026-09-10]`. 색은 값이 아니라 **차이**를
 * 가리키므로 계열색이 아닌 글자색을 쓴다 — 상태색·포인트색은 예약이다.
 *
 * **`--fg`가 아니라 `--fg-muted`다.** 4배 확대 캡처에서 이 호가 **카드에서 가장 진한 잉크**로
 * 나왔다 — 22px 값보다 눈에 먼저 걸렸다. 게이지의 비중을 낮추라는 지적과 정면으로 어긋나는
 * 자리다 `[사용자 지적 2026-09-10: 게이지의 시각적 비중을 조금 낮추고]`. 한 단 내려도 트랙
 * (`--surface-3`)과는 명도 차가 충분해 «사이»는 그대로 읽힌다.
 */
function GapArc({ from, to, transition }: { from: number; to: number; transition: Grow }) {
  return (
    <motion.path
      d={semicircle(G.gapR)}
      fill="none"
      stroke="var(--fg-muted)"
      strokeWidth={G.gapStroke}
      strokeLinecap="round"
      initial={{ pathLength: 0, pathOffset: from }}
      animate={{ pathLength: to - from, pathOffset: from }}
      transition={transition}
    />
  );
}
