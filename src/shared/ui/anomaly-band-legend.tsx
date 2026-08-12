import { anomalyBandLabel, PROVISIONAL_STATUS_LEVELS } from '@/shared/config/provisional';
import { STATUS_VISUAL } from '@/shared/config/status-visual';
import { cn } from '@/shared/lib/cn';

/** 이상 점수 4구간 경계. 차트를 보는 화면마다 같은 범례를 써야 구간이 흔들리지 않는다 */
export function AnomalyBandLegend({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      {PROVISIONAL_STATUS_LEVELS.map((level) => (
        <span key={level} className="flex items-center gap-1 text-[11px] text-fg-subtle">
          <span
            aria-hidden
            className="inline-block size-1.5 rounded-[1px]"
            style={{ backgroundColor: STATUS_VISUAL[level].hex, opacity: 0.6 }}
          />
          {anomalyBandLabel(level)}
        </span>
      ))}
    </div>
  );
}
