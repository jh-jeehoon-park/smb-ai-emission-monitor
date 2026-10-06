'use client';

import { ACTUAL_HEX } from '@/shared/config/status-visual';
import { motion } from '@/shared/ui/motion';
import { SUMMARY_DONUT } from '../config/constants';
import type { TreatmentVerdict } from '../lib/point-readings';

const D = SUMMARY_DONUT;

/**
 * **판정 대상 중 처리된 항목 수** — 판정 한 줄 옆의 요약.
 *
 * 여덟 장 카드가 항목마다 답하고, 이것이 그 답을 한 번에 센다. **개수 기반이라 단위 문제가
 * 없다** — 수질 8종은 단위가 제각각이라(pH 무차원 · EC μS/cm) 값을 합칠 수 없지만 «몇 개가
 * 처리됐나»는 셀 수 있다. 값은 `TreatmentVerdict`가 이미 갖고 있어 여기서 다시 세지 않는다.
 *
 * **판정 대상이 없으면 그리지 않는다** — 0/0을 그리면 빈 고리가 «전부 미처리»로 읽힌다(**E4**).
 */
export function SummaryDonut({ verdict }: { verdict: TreatmentVerdict }) {
  if (verdict.kind === 'unknown' || verdict.judgedCount === 0) return null;

  const treated = verdict.judgedCount - verdict.similarCount;
  const share = treated / verdict.judgedCount;

  return (
    <div className="relative shrink-0" style={{ width: D.size, height: D.size }}>
      <svg viewBox={`0 0 ${D.size} ${D.size}`} className="h-full w-full" aria-hidden>
        {/* 12시에서 시작해 시계 방향으로 돌게 회전시킨다 — 기본은 3시부터다 */}
        <g transform={`rotate(-90 ${D.size / 2} ${D.size / 2})`}>
          <circle
            cx={D.size / 2}
            cy={D.size / 2}
            r={D.r}
            fill="none"
            stroke="var(--surface-3)"
            strokeWidth={D.stroke}
          />
          <motion.circle
            cx={D.size / 2}
            cy={D.size / 2}
            r={D.r}
            fill="none"
            stroke={ACTUAL_HEX}
            strokeWidth={D.stroke}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: share }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />
        </g>
      </svg>

      {/* 고리가 «얼마나»를 보이고 글자가 «몇 개 중 몇 개»를 못박는다 */}
      <p className="num absolute inset-0 flex items-center justify-center text-[14px] font-bold text-fg">
        {treated}/{verdict.judgedCount}
      </p>
    </div>
  );
}
