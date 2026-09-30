import { TELEMETRY_PENDING_NOTE } from '@/entities/measurement';
import { Skeleton, SkeletonRegion } from '@/shared/ui/skeleton';
import styles from './run-investigation-skeleton.module.scss';

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
      className={styles.layout}
    >
      <div className={styles.runs}>
        {Array.from({ length: PLACEHOLDER_RUNS }, (_, i) => (
          <Skeleton key={i} className={styles.run} />
        ))}
      </div>

      <div className={styles.reading}>
        <Skeleton className={styles.summary} />

        <div className={styles.scoreRow}>
          <Skeleton className={styles.score} />
          <Skeleton className={styles.gauge} />
        </div>

        <div className={styles.metaRow}>
          <Skeleton className={styles.metaModel} />
          <Skeleton className={styles.metaWindow} />
          <Skeleton className={styles.metaComputed} />
        </div>

        <div className={styles.contributions}>
          {Array.from({ length: CONTRIBUTION_ROWS }, (_, i) => (
            <div key={i} className={styles.contribution}>
              <div className={styles.contributionSide}>
                <Skeleton className={styles.labelModel} />
                <Skeleton className={styles.barModel} />
              </div>
              <div className={styles.contributionSide}>
                <Skeleton className={styles.labelMeasured} />
                <Skeleton className={styles.barMeasured} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </SkeletonRegion>
  );
}
