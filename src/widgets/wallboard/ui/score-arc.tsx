'use client';

import { PROVISIONAL_ANOMALY_BANDS, type StatusLevel } from '@/shared/config/provisional';
import { STATUS_VISUAL } from '@/shared/config/status-visual';
import { SVG_COORD_PRECISION, WALL_ARC } from '../config/constants';

const G = WALL_ARC;
const SCORE_MIN = PROVISIONAL_ANOMALY_BANDS[0]!.min;
const SCORE_MAX = PROVISIONAL_ANOMALY_BANDS[PROVISIONAL_ANOMALY_BANDS.length - 1]!.max;

/** 점수를 0~1로. 경계는 `provisional.ts`가 갖고 여기서는 읽기만 한다 */
function share(score: number): number {
  return (score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN);
}

/** 반원 위의 좌표. 9시(왼쪽)에서 3시(오른쪽)로, 위쪽으로 돈다 */
function pointAt(t: number, radius: number): { x: number; y: number } {
  const angle = Math.PI * (1 - t);
  return { x: G.cx + radius * Math.cos(angle), y: G.cy - radius * Math.sin(angle) };
}

function arcPath(from: number, to: number, radius: number): string {
  const a = pointAt(from, radius);
  const b = pointAt(to, radius);
  const p = SVG_COORD_PRECISION;
  return `M ${a.x.toFixed(p)} ${a.y.toFixed(p)} A ${radius} ${radius} 0 0 1 ${b.x.toFixed(p)} ${b.y.toFixed(p)}`;
}

/**
 * 이상 점수 반원 계기 — **레퍼런스의 계기 질감을 가져오되 기각됐던 이유를 갚는다.**
 *
 * `[사용자 요청 2026-09-11: 최대한 레퍼런스와 유사한 UI]`. 레퍼런스 셋 중 둘이 반원 계기를
 * 쓰고, 그것이 «관제 현황판»을 다른 화면과 가르는 가장 뚜렷한 표식이다.
 *
 * ## 원형 게이지는 한 번 기각된 적이 있다
 *
 * `shared/ui/anomaly-gauge.tsx`가 적어 두었다 — *"원형 게이지 대신 수평 스케일을 쓰는 이유는
 * **4개 등급 구간의 경계를 눈으로 바로 읽을 수 있어야** 하기 때문이다."*
 *
 * **그 이유를 없애고 쓴다.** 호를 통째로 칠하지 않고 **네 구간으로 끊어 각각 등급 색으로
 * 칠하고 경계마다 눈금과 숫자를 적는다** — 경계가 안 보여서 기각된 것이라, 경계를 그리면
 * 그 근거가 걸리지 않는다. `AnomalyGauge`는 그대로 살아 있고 다른 화면이 계속 쓴다.
 *
 * **상태색을 쓰는 것이 맞는 자리다**(§8 `등급 색`) — 이 축은 장식이 아니라 **등급 그 자체**다.
 * 색만으로 말하지 않는다: 가운데에 점수와 등급 이름이 글자로 있고 경계마다 숫자가 붙는다(**E2**).
 *
 * **두절이면 바늘을 그리지 않는다**(**E4**) — 0점 자리에 바늘을 세우면 «정상»이라는 주장이 된다.
 */
export function ScoreArc({ score, level }: { score: number | null; level: StatusLevel | null }) {
  const t = score === null ? null : Math.max(0, Math.min(1, share(score)));

  return (
    <svg
      viewBox={`0 0 ${G.width} ${G.height}`}
      className="w-full"
      style={{ maxWidth: G.width }}
      aria-hidden
    >
      {/* 네 등급 구간. 사이를 살짝 벌려 경계가 «끊긴 자리»로 읽힌다 */}
      {PROVISIONAL_ANOMALY_BANDS.map((band, i) => {
        const from = share(band.min) + (i === 0 ? 0 : 0.004);
        const to = share(band.max);
        return (
          <path
            key={band.level}
            d={arcPath(from, to, G.r)}
            fill="none"
            stroke={STATUS_VISUAL[band.level].hex}
            strokeWidth={G.stroke}
            strokeLinecap="butt"
          />
        );
      })}

      {/* 경계 눈금과 숫자 — 기각 사유였던 «경계를 읽을 수 없다»를 여기서 갚는다 */}
      {PROVISIONAL_ANOMALY_BANDS.slice(1).map((band) => {
        const t0 = share(band.min);
        const inner = pointAt(t0, G.r - G.stroke / 2);
        const outer = pointAt(t0, G.r + G.stroke / 2 + 6);
        const label = pointAt(t0, G.r + G.stroke / 2 + 18);
        return (
          <g key={band.level}>
            <line
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke="var(--border-strong)"
              strokeWidth="1.5"
            />
            <text
              x={label.x}
              y={label.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--fg-subtle)"
              /* 그래프 안의 글자는 §8 `글자 최소`의 유일한 예외다 — 좌표계에 딸린 표기다 */
              fontSize="13"
              className="num"
            >
              {band.min}
            </text>
          </g>
        );
      })}

      {/*
       * 바늘. 중심까지 긋지 않는다 — 부채꼴이 되어 «구간»으로 읽힌다. 레퍼런스의 계기도
       * 축에서 조금 떨어져 시작한다.
       */}
      {t !== null && level && (
        <g>
          <line
            x1={pointAt(t, G.needleFrom).x}
            y1={pointAt(t, G.needleFrom).y}
            x2={pointAt(t, G.r + G.stroke / 2 + G.needleOver).x}
            y2={pointAt(t, G.r + G.stroke / 2 + G.needleOver).y}
            stroke="var(--fg)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx={G.cx} cy={G.cy} r="7" fill="var(--fg)" />
        </g>
      )}
    </svg>
  );
}
