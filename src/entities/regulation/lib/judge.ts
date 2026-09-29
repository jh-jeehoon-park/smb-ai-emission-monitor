import type { ComplianceResult, ResolvedStandard } from '../model/types';

/**
 * 측정값이 기준을 지켰는가.
 *
 * **순서가 뜻이다** `[사용자 요청 2026-09-28: 설정 재설계 검토]`. 여섯 상태가 동시에 참일 수
 * 있어 무엇을 먼저 보느냐가 화면의 말을 정한다.
 *
 * | 순서 | 왜 먼저인가 |
 * |---|---|
 * | `NOT_APPLICABLE` | 대상이 아닌 항목에 «수신 없음»을 적으면 없는 의무를 만든다 |
 * | `CONFLICT` | 기준 자체가 정해지지 않았는데 값을 견주면 아무 뜻이 없다 |
 * | `NO_MEASUREMENT` | 기존 규약 그대로다 — 값 없음을 기준 유무보다 먼저 본다(`verdict.ts`) |
 * | `PENDING_STANDARD` | 값은 있는데 견줄 것이 없다 |
 *
 * **경계값은 초과가 아니다** — 5.8과 8.6은 허용 범위 안이다. `<`·`>`로 비교한다.
 *
 * **`basis`를 함께 낸다.** 시연값으로 넘은 것을 「법정 초과」라 적지 않기 위해서다 —
 * 화면 문구와 색이 이 값으로 갈린다.
 */
export function judgeCompliance(
  standard: ResolvedStandard,
  value: number | null,
): ComplianceResult {
  const none = { judgement: 'NOT_APPLICABLE', basis: 'none', standard } as const;

  if (standard.status === 'NOT_APPLICABLE') return none;
  if (standard.status === 'CONFLICT') {
    return { judgement: 'CONFLICT', basis: 'none', standard };
  }
  if (value === null) {
    return { judgement: 'NO_MEASUREMENT', basis: 'none', standard };
  }
  if (standard.status === 'UNRESOLVED') {
    return { judgement: 'PENDING_STANDARD', basis: 'none', standard };
  }

  const { min, max } = standard;
  /* 값이 있다고 했는데 경계가 없으면 견줄 것이 없다 — 「기준 안」으로 떨어뜨리지 않는다 */
  if (min === null && max === null) {
    return { judgement: 'PENDING_STANDARD', basis: 'none', standard };
  }

  const over = (min !== null && value < min) || (max !== null && value > max);
  return {
    judgement: over ? 'EXCEEDED' : 'COMPLIANT',
    basis: standard.status === 'RESOLVED' ? 'legal' : 'provisional',
    standard,
  };
}
