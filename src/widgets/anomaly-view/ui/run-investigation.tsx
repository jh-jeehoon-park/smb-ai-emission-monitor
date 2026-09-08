'use client';

import { COLLECTION_INTERVAL_MINUTES } from '@/shared/config/measurement';
import { PROVISIONAL_STATUS_LABELS } from '@/shared/config/provisional';
import { STATUS_VISUAL, statusInk } from '@/shared/config/status-visual';
import { cn } from '@/shared/lib/cn';
import { DISPLAY_TIMEZONE, formatClock, formatDateTime } from '@/shared/lib/format';
import { AnomalyGauge } from '@/shared/ui/anomaly-gauge';
import { BADGE_BASE } from '@/shared/ui/badge';
import { CountUp } from '@/shared/ui/motion';
import { StatusBadge } from '@/shared/ui/status-badge';
import { VALUE_LG } from '@/shared/ui/type-scale';
import type { AnomalyRun, AnomalySummary } from '@/entities/anomaly';
import { ContributionEvidenceList } from './contribution-evidence';
import type { ContributionEvidence } from '../lib/distribution';

/**
 * **이상 구간 조사** — 이 화면에만 있는 것 `[사용자 요청 2026-09-08]`.
 *
 * 통합 관제와 이상 탐지가 같은 `AnomalyPanel`에 같은 props를 넘겨 **완전히 같은 그림**이었다.
 * 사람이 이 화면에 오는 이유는 «이 사업장 왜 91점이지?»인데, 그 답의 나머지 셋(언제부터·
 * 얼마나·무엇 때문에)은 **되감을 수단이 없어** 낼 수 없었다 — 이 앱의 모든 화면이 «지금»에
 * 고정돼 있다.
 *
 * 그래서 **구간을 1급 객체로 세우고 이 화면에만 조사 시각을 준다.** 왼쪽에서 구간을 고르면
 * 오른쪽이 그 구간의 최고점 시각을 판독하고, 아래 타임라인이 그 자리를 짚는다.
 *
 * **점수 자체는 여전히 «지금»이 아니다.** 되감은 시각의 값이라 산출 시각을 함께 적는다(**E3**).
 */
export function RunInvestigation({
  runs,
  selectedIso,
  onSelect,
  summary,
  evidence,
  canJudge,
  minMinutes,
}: {
  runs: AnomalyRun[];
  selectedIso: string | null;
  onSelect: (fromIso: string) => void;
  /** 고른 구간의 **최고점 시각** 판정. 구간을 대표하는 한 지점이다 */
  summary: AnomalySummary | null;
  evidence: ContributionEvidence[];
  /** 전 구간 결측이면 0건이 아니라 **모름**이다(**E4**) */
  canJudge: boolean;
  minMinutes: number;
}) {
  if (!canJudge) {
    return (
      <p className="text-[12px] leading-relaxed text-fg-subtle">
        통신이 두절되어 이상 점수가 산출되지 않았습니다 —{' '}
        <strong className="text-fg-muted">구간을 판정할 수 없습니다.</strong> 0건이 아닙니다.
      </p>
    );
  }

  if (runs.length === 0) {
    return (
      <p className="text-[12px] leading-relaxed text-fg-subtle">
        최근 24시간에 이상 점수가{' '}
        <strong className="text-fg-muted">
          {PROVISIONAL_STATUS_LABELS.caution} 경계 위로 연속 {minMinutes}분 이상
        </strong>{' '}
        이어진 구간이 없습니다. 그보다 짧게 스친 것과 수신이 끊겨 확인되지 않은 시간은 여기에
        세지 않습니다.
      </p>
    );
  }

  const selected = runs.find((run) => run.fromIso === selectedIso) ?? runs[0]!;

  return (
    <div className="@container grid gap-5 @[46rem]:grid-cols-[minmax(0,232px)_minmax(0,1fr)]">
      <RunList runs={runs} selectedIso={selected.fromIso} onSelect={onSelect} />
      <RunReading run={selected} summary={summary} evidence={evidence} />
    </div>
  );
}

/**
 * 구간 목록 — **마스터**다. 최신이 위로 온다(조사는 대개 방금 것부터다).
 *
 * 줄이 어디론가 데려가므로 줄 아무 데나 눌리게 하고, 키보드 경로도 같은 버튼이 맡는다
 * (§8 `표` — 줄이 데려가면 줄 전체가 대상이다).
 */
function RunList({
  runs,
  selectedIso,
  onSelect,
}: {
  runs: AnomalyRun[];
  selectedIso: string;
  onSelect: (fromIso: string) => void;
}) {
  return (
    <ul className="max-h-[320px] space-y-1.5 overflow-auto @[46rem]:max-h-[420px]">
      {runs.map((run) => {
        const active = run.fromIso === selectedIso;
        const visual = STATUS_VISUAL[run.level];

        return (
          <li key={run.fromIso}>
            <button
              type="button"
              onClick={() => onSelect(run.fromIso)}
              aria-current={active ? 'true' : undefined}
              className={cn(
                'w-full cursor-pointer rounded-nested border px-3 py-2.5 text-left transition-colors duration-200',
                active
                  ? 'border-accent bg-accent-weak'
                  : 'border-border bg-surface-2 hover:border-border-strong',
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="num text-[12px] font-semibold text-fg">
                  {formatClock(run.fromIso)}–{run.isNow ? '지금' : formatClock(run.toIso)}
                </span>
                <span className="num shrink-0 text-[12px] text-fg-subtle">
                  {durationLabel(run.samples)}
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5 text-[12px]">
                <span className="text-fg-subtle">최고</span>
                <span className="num font-semibold" style={{ color: statusInk(visual) }}>
                  {run.peak}
                </span>
                {/* 등급은 값의 색 + 라벨 글자 둘로만 말한다(§8 `등급 색`) */}
                <span className="text-fg-muted">{PROVISIONAL_STATUS_LABELS[run.level]}</span>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * 고른 구간의 판독 — **디테일**이다.
 *
 * 맨 위 한 문장이 «언제 넘었고 언제 최고였고 얼마나 이어졌는가»를 말한다. 이것이 이 화면에
 * 온 이유에 대한 직답이라 숫자보다 먼저 온다.
 */
function RunReading({
  run,
  summary,
  evidence,
}: {
  run: AnomalyRun;
  summary: AnomalySummary | null;
  evidence: ContributionEvidence[];
}) {
  if (summary === null || summary.score === null || summary.level === null) {
    return (
      <p className="text-[12px] leading-relaxed text-fg-subtle">
        이 구간의 판정을 불러오지 못했습니다.
      </p>
    );
  }

  const visual = STATUS_VISUAL[summary.level];
  const peakIso = summary.computedAtIso;

  return (
    <div className="@container space-y-4" key={run.fromIso}>
      {/*
       * **조사 대상을 한 문장으로 먼저 말한다.** 이 화면에 온 이유에 대한 직답이라 숫자보다
       * 앞에 온다 — 언제 넘었고 언제 가장 높았고 얼마나 이어졌는가.
       *
       * **`91까지`라 적는다.** `91으로`는 틀린다 — 한국어 조사는 앞 숫자의 **읽는 소리**를
       * 따르는데(구십일 → `로`, 육십 → `으로`) 숫자가 값이라 어느 쪽인지 미리 알 수 없다.
       * 조사가 갈리지 않는 말로 쓰는 것이 유일하게 맞는 답이다.
       */}
      <p className="text-[12px] leading-relaxed text-fg-muted">
        <span className="num text-fg">{formatClock(run.fromIso)}</span>에 주의 경계를 넘었고{' '}
        <span className="num text-fg">{formatClock(peakIso)}</span>에{' '}
        <span className="num font-semibold" style={{ color: statusInk(visual) }}>
          {run.peak}
        </span>
        까지 올랐습니다 · {durationLabel(run.samples)} 이어졌{run.isNow ? '고 지금도 이어집니다' : '습니다'}.
      </p>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-border pt-3">
        <div className="flex items-baseline gap-2">
          <span className={`num ${VALUE_LG}`} style={{ color: statusInk(visual) }}>
            <CountUp value={summary.score} />
          </span>
          <StatusBadge level={summary.level} />
        </div>
        <div className="min-w-[180px] flex-1">
          <AnomalyGauge score={summary.score} />
        </div>
      </div>

      {/* AI 산출 근거는 값과 함께 노출한다 — 뱃지 셋, 라벨을 뱃지 안에 남긴다(**E3**·§8) */}
      <div className="flex flex-wrap gap-1.5">
        <Meta label="모델" value={summary.modelLabel} />
        <Meta label="기간" value={summary.windowLabel} />
        <Meta
          label="산출"
          value={`${formatDateTime(peakIso)} ${DISPLAY_TIMEZONE}`}
        />
      </div>

      <div className="border-t border-border pt-3">
        <ContributionEvidenceList
          rows={evidence}
          level={summary.level}
          atLabel={`${formatClock(peakIso)} ${DISPLAY_TIMEZONE}`}
        />
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <span className={`${BADGE_BASE} gap-1 bg-surface-2 text-fg-muted`}>
      <span className="text-fg-subtle">{label}</span>
      <span className="num">{value}</span>
    </span>
  );
}

/**
 * 표본 수를 사람이 읽는 시간으로. **수집 주기가 바뀌면 여기 하나만 따라 바뀐다.**
 *
 * `1.5시간`처럼 소수로 적지 않는다 — 계측값의 자릿수 규칙(**E1**)과 섞여 보이고 시간은
 * 60진법이라 소수 표기가 오히려 읽기 어렵다(`idle-discharge-panel`과 같은 규약).
 */
function durationLabel(samples: number): string {
  const total = samples * COLLECTION_INTERVAL_MINUTES;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;

  if (hours === 0) return `${minutes}분`;
  return minutes === 0 ? `${hours}시간` : `${hours}시간 ${minutes}분`;
}
