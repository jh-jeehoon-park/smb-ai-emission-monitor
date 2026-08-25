import { anomalyBandLabel, PROVISIONAL_STATUS_LEVELS } from '@/shared/config/provisional';
import { STATUS_VISUAL } from '@/shared/config/status-visual';
import { cn } from '@/shared/lib/cn';

/**
 * 이상 점수 4구간 경계. 차트를 보는 화면마다 같은 범례를 써야 구간이 흔들리지 않는다.
 *
 * **줄바꿈을 허용한다** `[회의 피드백 2026-08-24: 범례를 숫자와 설명으로]`. 라벨이
 * `0–49`에서 `0–49 정상`으로 길어졌고 글자도 12px로 커져 한 줄에 안 들어가는 폭이 생겼다.
 * 넘치면 잘리는 대신 접히고, 접혔을 때 위아래 간격(`gap-y-1`)은 좌우보다 좁게 둔다 —
 * 같으면 두 줄이 별개 목록으로 보인다.
 */
export function AnomalyBandLegend({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-2.5 gap-y-1', className)}>
      {PROVISIONAL_STATUS_LEVELS.map((level) => (
        <span key={level} className="flex items-center gap-1 text-[12px] text-fg-subtle">
          <span
            aria-hidden
            className="inline-block size-1.5 rounded-[2px]"
            style={{ backgroundColor: STATUS_VISUAL[level].hex, opacity: 0.6 }}
          />
          {anomalyBandLabel(level)}
        </span>
      ))}
    </div>
  );
}
