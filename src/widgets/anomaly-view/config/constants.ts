import { PROVISIONAL_ANOMALY_RUN_MIN_MINUTES } from '@/shared/config/provisional';
import { minutesToSamples } from '@/shared/lib/timeline';

/** 고른 이상 구간을 URL에 남기는 키. 링크를 보내면 «왜 91점이지?»가 그대로 전달된다(§8·**P6**) */
export const RUN_QUERY_KEY = 'run';

/**
 * 구간이 하나도 없을 때 URL에 남는 값.
 *
 * `useQueryState`는 **허용 목록이 비어 있으면 안 된다** — 빈 배열을 주면 어떤 값도 허용되지
 * 않아 기본값조차 걸러진다. 구간 시작 시각은 ISO라 이 값과 겹칠 수 없다.
 */
export const NO_RUN = 'none';

/**
 * 구간으로 셀 최소 표본 수. **분에서 옮긴다** — 표본 수를 박아 두면 수집 주기가 바뀔 때
 * 구간이 조용히 늘거나 준다(`[INC-111]`이 남긴 교훈).
 */
export const RUN_MIN_SAMPLES = minutesToSamples(PROVISIONAL_ANOMALY_RUN_MIN_MINUTES);
