'use client';

import { PROVISIONAL_DISPLAY_DECIMALS, PROVISIONAL_STATUS_LABELS } from '@/shared/config/provisional';
import { STATUS_VISUAL, statusInk } from '@/shared/config/status-visual';
import { formatDateTime } from '@/shared/lib/format';
import { AnomalyGauge } from '@/shared/ui/anomaly-gauge';
import { Eyebrow } from '@/shared/ui/eyebrow';
import { CountUp, motion } from '@/shared/ui/motion';
import type { AnomalySummary } from '@/entities/anomaly';

export function AnomalyPanel({ summary }: { summary: AnomalySummary }) {
  // 값이 없으면 임의 보간이나 0으로 채우지 않고 빈 상태로 둔다(E3·R19)
  if (summary.score === null || summary.level === null) {
    return (
      <div className="flex h-full flex-col justify-center gap-2 py-6 text-center">
        <p className="num text-[32px] leading-none text-fg-subtle">—</p>
        <p className="text-[12px] text-fg-muted">산출값 없음</p>
        <p className="max-w-[34ch] self-center text-[11px] leading-relaxed text-fg-subtle">
          ECP 통신이 두절되어 이상 점수가 산출되지 않았습니다. 마지막 수신{' '}
          <span className="num">{formatDateTime(summary.computedAtIso)}</span> KST.
        </p>
      </div>
    );
  }

  const visual = STATUS_VISUAL[summary.level];
  const level = summary.level;
  const score = summary.score;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-end gap-3">
        <p
          className="num text-[46px] font-semibold leading-none tracking-tight"
          style={{ color: statusInk(visual) }}
        >
          <CountUp value={score} />
        </p>
        <div className="pb-1">
          <p className="text-[13px] font-medium" style={{ color: statusInk(visual) }}>
            {PROVISIONAL_STATUS_LABELS[level]}
          </p>
          <p className="text-[11px] text-fg-subtle">이상 점수 / 100</p>
        </div>
      </div>

      <AnomalyGauge score={score} />

      {/* AI 산출값은 언제·무엇을 근거로 나왔는지 함께 보여야 한다(E3) */}
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-y border-border py-2.5 text-[11px]">
        <dt className="text-fg-subtle">산출 모델</dt>
        <dd className="text-right text-fg-muted">{summary.modelLabel}</dd>
        <dt className="text-fg-subtle">대상 기간</dt>
        <dd className="text-right text-fg-muted">{summary.windowLabel}</dd>
        <dt className="text-fg-subtle">산출 시각</dt>
        <dd className="num text-right text-fg-muted">
          {formatDateTime(summary.computedAtIso)} KST
        </dd>
      </dl>

      <div className="flex-1">
        <Eyebrow className="mb-2">주요 기여 변수 · XAI</Eyebrow>
        <ul className="space-y-2">
          {summary.contributions.map((c, i) => (
            <li key={c.label}>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="truncate text-[11px] text-fg-muted">
                  {c.label}
                  <span
                    className="ml-1.5 text-[11px]"
                    style={{ color: c.direction === 'up' ? statusInk(visual) : 'var(--actual)' }}
                    aria-label={c.direction === 'up' ? '상승 기여' : '하강 기여'}
                  >
                    {c.direction === 'up' ? '▲' : '▼'}
                  </span>
                </span>
                <span className="num text-[11px] text-fg-subtle">
                  {(c.weight * 100).toFixed(PROVISIONAL_DISPLAY_DECIMALS.contributionPercent)}%
                </span>
              </div>
              <div className="h-[3px] w-full overflow-hidden rounded-full bg-surface-3">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: visual.hex, opacity: 0.75 }}
                  initial={{ width: 0 }}
                  animate={{ width: `${c.weight * 100}%` }}
                  transition={{ duration: 0.5, delay: 0.1 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
