import { COLLECTION_INTERVAL_MINUTES } from '@/shared/config/measurement';
import { PROVISIONAL_IDLE_DISCHARGE_MIN_SAMPLES } from '@/shared/config/provisional';
import { STATUS_VISUAL, statusInk } from '@/shared/config/status-visual';
import { formatDateTime, formatValue } from '@/shared/lib/format';
import { canJudgeIdleDischarge, findIdleDischargeRuns } from '@/entities/anomaly';
import type { MeasurementPoint } from '@/entities/measurement';

interface IdleDischargePanelProps {
  siteId: string;
  points: MeasurementPoint[];
}

const MINUTES_PER_HOUR = 60;

/**
 * 방지시설이 멈춘 채 방류가 이어진 구간.
 *
 * **"무단방류"라고 적지 않는다.** 무단 여부는 신고된 방류 시간대·유량 한도가 있어야 정해지고,
 * 원문도 *"방류 유무 판단 **가능성 검토**"* 까지만 말한다 `[원문 발표 p.13]` `[TBD-46]`.
 * 저류된 물을 내보내는 중일 수도 있다 — 판정이 아니라 **의심**으로 남기는 것이 옳다.
 *
 * 이 판정은 이상 점수와 **다른 축**이다. 점수가 낮아도 여기서 잡힐 수 있다 —
 * 그것이 이 패널을 이상 탐지 화면에 둔 이유다.
 */
export function IdleDischargePanel({ siteId, points }: IdleDischargePanelProps) {
  const canJudge = canJudgeIdleDischarge(siteId);
  const runs = findIdleDischargeRuns(siteId);

  if (!canJudge) {
    return (
      <p className="text-[12px] leading-relaxed text-fg-subtle">
        통신 두절로 <strong className="text-fg-muted">판정할 수 없습니다</strong> — 방류 여부도
        가동 여부도 수신되지 않았습니다. 의심 0건이 아닙니다.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {runs.length === 0 ? (
        <p className="text-[12px] leading-relaxed text-fg-subtle">
          최근 24시간에 <strong className="text-fg-muted">연속{' '}
          {durationLabel(PROVISIONAL_IDLE_DISCHARGE_MIN_SAMPLES)} 이상</strong> 이어진 구간이
          없습니다. 그보다 짧거나 수신이 끊겨 확인되지 않은 시간은 여기에 세지 않습니다.
        </p>
      ) : (
        <ul className="space-y-2">
          {runs.map((run) => (
            <li
              key={run.fromIso}
              className="rounded-[4px] border border-border bg-surface-2 px-3 py-2.5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="num text-[12px] text-fg">
                  {formatDateTime(run.fromIso)} – {formatDateTime(run.toIso)}
                </p>
                <p
                  className="text-[11px]"
                  style={{ color: statusInk(STATUS_VISUAL.warning) }}
                >
                  {durationLabel(run.samples)} 연속
                </p>
              </div>
              <dl className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-fg-subtle">
                <Fact label="유량" value={`${formatValue('flow', points[run.from]?.flow ?? null)} m³/day`} />
                <Fact label="전류" value={`${formatValue('current', points[run.from]?.current ?? null)} A`} />
                <Fact label="전력" value={`${formatValue('power', points[run.from]?.power ?? null)} kW`} />
              </dl>
            </li>
          ))}
        </ul>
      )}

      {/*
       * 판정 근거와 한계를 값과 함께 남긴다(E3). 이 문장이 없으면 화면이 법적 판정을
       * 내린 것처럼 읽힌다 — 원문이 준 것은 방법이지 기준이 아니다.
       */}
      <p className="max-w-[70ch] border-t border-border pt-2.5 text-[11px] leading-relaxed text-fg-subtle">
        방류(유량) 발생 시각과 방지시설 가동(유입펌프 전류) 시각을 비교한다 [원문 발표 p.13].
        연속 {durationLabel(PROVISIONAL_IDLE_DISCHARGE_MIN_SAMPLES)} 미만은 세지 않는다
        [PROVISIONAL].{' '}
        <strong className="text-fg-muted">체류시간 보정은 적용하지 않았다</strong> — 원문이 값을
        주지 않았다 [TBD-46]. 무단 여부는 신고 정보 없이 판정하지 않는다.
      </p>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt>{label}</dt>
      <dd className="num text-fg-muted">{value}</dd>
    </div>
  );
}

/**
 * 표본 수를 사람이 읽는 시간으로. 수집 주기가 바뀌면 여기 하나만 따라 바뀐다.
 *
 * `1.5시간`처럼 소수로 적지 않는다 — 계측값의 자릿수 규칙(E1)과 섞여 보이고, 시간은
 * 60진법이라 소수 표기가 오히려 읽기 어렵다.
 */
function durationLabel(samples: number): string {
  const total = samples * COLLECTION_INTERVAL_MINUTES;
  const hours = Math.floor(total / MINUTES_PER_HOUR);
  const minutes = total % MINUTES_PER_HOUR;

  if (hours === 0) return `${minutes}분`;
  return minutes === 0 ? `${hours}시간` : `${hours}시간 ${minutes}분`;
}
