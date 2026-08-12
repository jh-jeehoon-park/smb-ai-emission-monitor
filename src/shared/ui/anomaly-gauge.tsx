import {
  PROVISIONAL_ANOMALY_BANDS,
  PROVISIONAL_ANOMALY_TICKS,
  PROVISIONAL_STATUS_LABELS,
  toStatusLevel,
} from '@/shared/config/provisional';
import { STATUS_BAND, STATUS_VISUAL } from '@/shared/config/status-visual';
import { cn } from '@/shared/lib/cn';

interface AnomalyGaugeProps {
  score: number;
  className?: string;
  showScale?: boolean;
}

/**
 * 이상 점수 0~100 계기 바. 원형 게이지 대신 수평 스케일을 쓰는 이유는
 * 4개 등급 구간의 경계를 눈으로 바로 읽을 수 있어야 하기 때문이다.
 */
export function AnomalyGauge({ score, className, showScale = true }: AnomalyGaugeProps) {
  const level = toStatusLevel(score);
  const visual = STATUS_VISUAL[level];

  return (
    <div className={cn('w-full', className)}>
      <div
        className="relative h-2.5 w-full overflow-hidden rounded-[2px] bg-surface-3"
        role="meter"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`이상 점수 ${score}점, ${PROVISIONAL_STATUS_LABELS[level]}`}
      >
        {PROVISIONAL_ANOMALY_BANDS.map((band, i) => {
          const next = PROVISIONAL_ANOMALY_BANDS[i + 1];
          // 구간 끝을 다음 구간 시작에 맞춘다. max+1로 잡으면 마지막 구간이 100%를 넘어 잘린다.
          const end = next ? next.min : 100;
          return (
            <span
              key={band.level}
              className="absolute inset-y-0"
              style={{
                left: `${band.min}%`,
                width: `${end - band.min}%`,
                backgroundColor: STATUS_BAND[band.level],
              }}
            />
          );
        })}
        <span
          className="absolute inset-y-0 left-0 transition-[width] duration-500 ease-out"
          style={{ width: `${score}%`, backgroundColor: visual.hex, opacity: 0.45 }}
        />
        <span
          className="absolute inset-y-0 w-[2px] transition-[left] duration-500 ease-out"
          style={{ left: `calc(${score}% - 1px)`, backgroundColor: visual.hex }}
        />
      </div>

      {showScale && (
        <div className="mt-1.5 flex justify-between font-mono text-[11px] tabular-nums text-fg-subtle">
          {PROVISIONAL_ANOMALY_TICKS.map((tick) => (
            <span key={tick}>{tick}</span>
          ))}
        </div>
      )}
    </div>
  );
}
