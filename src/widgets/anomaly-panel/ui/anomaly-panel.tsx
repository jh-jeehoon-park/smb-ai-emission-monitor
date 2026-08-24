'use client';

import { PROVISIONAL_DISPLAY_DECIMALS, PROVISIONAL_STATUS_LABELS } from '@/shared/config/provisional';
import { STATUS_VISUAL, statusInk } from '@/shared/config/status-visual';
import { formatDateTime } from '@/shared/lib/format';
import { AnomalyGauge } from '@/shared/ui/anomaly-gauge';
import { Eyebrow } from '@/shared/ui/eyebrow';
import { VALUE_LG } from '@/shared/ui/type-scale';
import { CountUp, motion } from '@/shared/ui/motion';
import type { AnomalySummary } from '@/entities/anomaly';

export function AnomalyPanel({ summary }: { summary: AnomalySummary }) {
  // 값이 없으면 임의 보간이나 0으로 채우지 않고 빈 상태로 둔다(E3·R19)
  if (summary.score === null || summary.level === null) {
    return (
      <div className="flex h-full flex-col justify-center gap-2 py-6 text-center">
        <p className={`num ${VALUE_LG} text-fg-subtle`}>—</p>
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

  /*
   * 셋을 **가로로 나눈다** `[사용자 지시 2026-08-24]` — 점수·근거·기여 변수.
   * 세로로 쌓으면 카드가 길어져 그 아래 전폭 타임라인이 화면 밖으로 밀린다.
   * 좁아지면(컨테이너 512px 미만) 다시 쌓는다 — 카드 본문이 1280px에서 376px이라
   * 세 칸을 나누면 110px씩이 되어 XAI 막대의 라벨과 퍼센트가 한 줄에 들어가지 않는다.
   */
  return (
    <div className="@container">
      <div className="grid gap-5 @[32rem]:grid-cols-[auto_minmax(0,1fr)_minmax(0,1.2fr)] @[32rem]:items-start">
        {/* 점수 — 폭을 내용에 맞춘다. 게이지가 아래 붙어 한 덩어리로 읽힌다 */}
        <div className="min-w-0 @[32rem]:w-[150px]">
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
          <AnomalyGauge score={score} className="mt-3" />
        </div>

        {/* AI 산출값은 언제·무엇을 근거로 나왔는지 함께 보여야 한다(E3) */}
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
          <dt className="text-fg-subtle">산출 모델</dt>
          <dd className="text-right text-fg-muted">{summary.modelLabel}</dd>
          <dt className="text-fg-subtle">대상 기간</dt>
          <dd className="text-right text-fg-muted">{summary.windowLabel}</dd>
          <dt className="text-fg-subtle">산출 시각</dt>
          <dd className="num text-right text-fg-muted">
            {formatDateTime(summary.computedAtIso)} KST
          </dd>
        </dl>

        <div className="min-w-0">
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
    </div>
  );
}
