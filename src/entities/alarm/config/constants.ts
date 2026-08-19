import type { StatusLevel } from '@/shared/config/provisional';
import type { AlarmPriority } from '../model/types';

/**
 * 상태 등급 → 알람 우선순위.
 *
 * **원문에 대응 규칙이 없다** `[INC-02]`. 등급 4단계(`[원문 발표 p.15·18]`)와 우선순위
 * 3단계(`[원문 p.32]`)가 따로 정의될 뿐이다. `[원문 발표 p.20 그림]`의 알람 목록이 둘을
 * **다른 열**로 보여주고 예시가 `경고 → 높음` · `주의 → 중간`이라 **별개 축이되 단조 대응**임만
 * 알 수 있다.
 *
 * 그 두 쌍을 그대로 두고 나머지를 미뤄 넣었다 — `위험`은 `경고`보다 높으니 최상위, `정상` 등급의
 * 알람은 상태 악화가 아니라 사건 통지(통신 두절 등)이니 `정보`다. **`위험 → 긴급`과
 * `정상 → 정보`는 그림에 없는 쌍이며 우리 추정이다** `[사용자 확인 2026-08-19: 추정으로 진행]`.
 *
 * 4→3 축소라 어딘가는 합쳐야 하는데 최상위를 합쳤다 — 긴급을 주의로 낮추면 대응이 늦어진다.
 * 근거와 위험은 [`docs/specs/assumptions.md`](../../../../docs/specs/assumptions.md) §3.1.
 *
 * **확정되면 이 표 하나만 바꾼다.** 화면도 테스트도 여기를 참조한다.
 */
export const PRIORITY_BY_LEVEL: Record<StatusLevel, AlarmPriority> = {
  critical: 'urgent',
  warning: 'urgent',
  caution: 'caution',
  normal: 'info',
};
