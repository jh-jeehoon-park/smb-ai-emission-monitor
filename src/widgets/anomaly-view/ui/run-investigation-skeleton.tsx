import { TELEMETRY_PENDING_NOTE } from '@/entities/measurement';
import { Skeleton, SkeletonRegion } from '@/shared/ui/skeleton';

/** 구간 목록에 세워 두는 줄 수. 실제 건수는 사업장마다 다르므로 **적게** 잡는다 */
const PLACEHOLDER_RUNS = 3;
/** 기여 변수는 언제나 다섯 행이다(`contributionsFor`) — 지어낸 수가 아니다 */
const CONTRIBUTION_ROWS = 5;

/**
 * 이상 구간 조사가 **아직 답을 모르는 동안** `[사용자 지적 2026-09-07]`.
 *
 * 구간은 이상 점수(계측과 별개)에서 나오지만 **판독의 오른쪽 절반이 계측**이다 — 기여 변수
 * 옆의 실측·분포가 그것이다. 반쪽만 그리면 «점수는 있는데 계측만 비었다»가 결측으로 읽히므로
 * (**E4**) 카드를 통째로 덮는다.
 *
 * 줄 수를 적게 잡는 이유: 구간 건수는 사업장마다 0~8건으로 갈려 **맞힐 수 없다.** 스켈레톤이
 * 큰 수를 세워 두면 값이 도착할 때 오히려 더 크게 줄어든다.
 */
export function RunInvestigationSkeleton() {
  return (
    <SkeletonRegion
      label={TELEMETRY_PENDING_NOTE}
      className="grid gap-5 @[46rem]:grid-cols-[minmax(0,232px)_minmax(0,1fr)]"
    >
      <div className="space-y-1.5">
        {Array.from({ length: PLACEHOLDER_RUNS }, (_, i) => (
          <Skeleton key={i} className="h-[68px] rounded-nested" />
        ))}
      </div>

      <div className="space-y-4">
        <Skeleton className="h-3 w-3/4" />

        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-border pt-3">
          {/* `VALUE_LG`(22px)와 같은 높이로 덮는다 — 어긋나면 값이 올 때 카드가 튄다 */}
          <Skeleton className="h-[22px] w-16" />
          <Skeleton className="h-2.5 min-w-[180px] flex-1" />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="h-5 w-40 rounded-chip" />
          <Skeleton className="h-5 w-44 rounded-chip" />
          <Skeleton className="h-5 w-36 rounded-chip" />
        </div>

        <div className="space-y-3 border-t border-border pt-3">
          {Array.from({ length: CONTRIBUTION_ROWS }, (_, i) => (
            <div key={i} className="grid gap-x-4 gap-y-1.5 @[30rem]:grid-cols-2">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-2 rounded-chip" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2.5 rounded-chip" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </SkeletonRegion>
  );
}
