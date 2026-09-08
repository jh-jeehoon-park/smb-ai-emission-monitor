import { isSeriesCode, type MeasurementPoint } from '@/entities/measurement';
import type { Contribution } from '@/entities/anomaly';

/**
 * 한 항목이 조회 구간에서 **어디에 모여 있었는가** `[사용자 요청 2026-09-08]`.
 *
 * 기여도 34%만으로는 «그래서 그 값이 이상했나»를 알 수 없다. 같은 구간의 분포를 옆에 두면
 * 그 시각의 값이 평소 자리인지 끝자락인지가 보인다.
 *
 * **평균이 아니라 중앙값·사분위다.** 이상 구간에는 튀는 값이 끼어 있고, 평균은 그것에
 * 끌려간다 — «평소 어디였나»를 묻는 자리라 끌려가면 안 된다.
 */
export interface Distribution {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  /** 센 표본 수. 결측은 빠졌으므로 몇 개로 낸 분포인지 함께 나른다 */
  count: number;
}

/**
 * **결측은 빼고 센다**(**E4**). 하나도 없으면 `0`이 아니라 `null`이다 — 0으로 두면
 * «전부 0이었다»는 사실 주장이 된다.
 */
export function distributionOf(values: readonly (number | null)[]): Distribution | null {
  const sorted = values.filter((v): v is number => v !== null).sort((a, b) => a - b);
  if (sorted.length === 0) return null;

  return {
    min: sorted[0]!,
    q1: quantile(sorted, 0.25),
    median: quantile(sorted, 0.5),
    q3: quantile(sorted, 0.75),
    max: sorted[sorted.length - 1]!,
    count: sorted.length,
  };
}

/**
 * 정렬된 표본에서 분위값. **선형 보간**한다 — 표본이 적을 때 값이 계단으로 튀면 IQR 상자가
 * 눈에 띄게 흔들린다.
 */
function quantile(sorted: readonly number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const low = Math.floor(pos);
  const high = Math.ceil(pos);
  if (low === high) return sorted[low]!;
  return sorted[low]! + (sorted[high]! - sorted[low]!) * (pos - low);
}

/**
 * 그 값이 분포에서 **몇 %에 있는가**(0~100).
 *
 * **초과 판정이 아니다.** 배출허용기준은 지역·규모로 갈려 우리가 정하지 않으며 `[TBD-45]`,
 * 이 값은 «관측된 분포 안에서의 자리»일 뿐이다 — 화면도 `상위 8%`처럼 자리로만 적는다.
 *
 * 같은 값이 여럿이면 그 가운데를 준다(중간 순위) — 계단 하나에 0%와 100%가 붙는 것을 막는다.
 */
export function percentileRank(values: readonly (number | null)[], x: number): number | null {
  const known = values.filter((v): v is number => v !== null);
  if (known.length === 0) return null;

  const below = known.filter((v) => v < x).length;
  const equal = known.filter((v) => v === x).length;

  return ((below + equal / 2) / known.length) * 100;
}

/** 기여 변수 한 줄이 화면에 나르는 것 — 모델이 낸 것과 계측이 낸 것을 **나란히** 둔다 */
export interface ContributionEvidence {
  contribution: Contribution;
  /** 그 시각의 실측값. 결측이면 `null` */
  value: number | null;
  /** 조회 구간의 분포. 계열이 없거나 전 구간 결측이면 `null` */
  distribution: Distribution | null;
  /** 분포 안에서의 자리(0~100). 판정이 아니라 위치다 */
  percentile: number | null;
}

/**
 * 기여 변수에 **그 시각의 실측을 붙인다** `[사용자 요청 2026-09-08]`.
 *
 * **기여도 자체는 손대지 않는다.** 그것은 모델 산출이고 우리에게 모델이 없다 —
 * `[TBD-32]`가 값 정의를 서버 몫으로 못박았다. 화면이 하는 일은 그 옆에 **같은 시각의 계측**과
 * **조회 구간 분포에서의 자리**를 두어 사람이 판단하게 하는 것이다(**E3**).
 *
 * 둘이 어긋나면 어긋난 대로가 정보다 — 모델이 TOC를 지목했는데 TOC가 평소 자리라면
 * 그것이 곧 검증 결과다.
 *
 * **계열이 없는 항목은 값을 비운다.** `MeasurementItemCode`는 `SeriesCode`보다 넓어
 * (진동은 사양이 없다 `[TBD-49]`) 없는 키로 인덱싱하면 `undefined`가 조용히 흐른다.
 */
export function contributionEvidence(
  contributions: readonly Contribution[],
  points: readonly MeasurementPoint[],
  index: number,
): ContributionEvidence[] {
  return contributions.map((contribution) => {
    if (!isSeriesCode(contribution.code)) {
      return { contribution, value: null, distribution: null, percentile: null };
    }

    const code = contribution.code;
    const values = points.map((point) => point[code]);
    const value = points[index]?.[code] ?? null;

    return {
      contribution,
      value,
      distribution: distributionOf(values),
      percentile: value === null ? null : percentileRank(values, value),
    };
  });
}
