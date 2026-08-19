import { describe, expect, it } from 'vitest';
import { PROVISIONAL_STATUS_LEVELS, type StatusLevel } from '@/shared/config/provisional';
import { ALARMS, PRIORITY_BY_LEVEL, type AlarmPriority } from '@/entities/alarm';

/**
 * 등급 ↔ 우선순위 대응은 **원문에 없다** `[INC-02]`. `[원문 발표 p.20 그림]`이 둘을 다른
 * 열로 보여주며 준 쌍은 `경고 → 높음`·`주의 → 중간` 둘뿐이고, 나머지는 우리 추정이다
 * `[사용자 확인 2026-08-19]`. 근거와 위험은 `docs/specs/assumptions.md` §3.1.
 *
 * 추정이므로 더더욱 **성질이 깨지지 않는지** 검사한다.
 */
describe('등급 → 우선순위 매핑', () => {
  it('모든 등급에 우선순위가 있다 — 빠지면 알람이 우선순위를 잃는다', () => {
    for (const level of PROVISIONAL_STATUS_LEVELS) {
      expect(PRIORITY_BY_LEVEL[level]).toBeDefined();
    }
  });

  /** 그림이 준 두 쌍이다. 이것과 어긋나면 추정의 근거 자체가 사라진다 */
  it('원문 예시와 어긋나지 않는다 — 경고는 최상위, 주의는 중간', () => {
    expect(PRIORITY_BY_LEVEL.warning).toBe('urgent');
    expect(PRIORITY_BY_LEVEL.caution).toBe('caution');
  });

  /** 등급이 높아질수록 우선순위가 낮아지면 안 된다 */
  it('단조 대응이다', () => {
    const rank: Record<AlarmPriority, number> = { info: 0, caution: 1, urgent: 2 };
    const order: StatusLevel[] = ['normal', 'caution', 'warning', 'critical'];

    const ranks = order.map((level) => rank[PRIORITY_BY_LEVEL[level]]);
    for (let i = 1; i < ranks.length; i += 1) {
      expect(ranks[i]!).toBeGreaterThanOrEqual(ranks[i - 1]!);
    }
  });

  it('가장 높은 등급은 가장 높은 우선순위다 — 낮추면 대응이 늦어진다', () => {
    expect(PRIORITY_BY_LEVEL.critical).toBe('urgent');
  });
});

describe('알람이 등급과 우선순위를 함께 갖는다', () => {
  it('우선순위가 등급에서 파생됐다 — 둘이 어긋날 수 없다', () => {
    for (const alarm of ALARMS) {
      expect(alarm.priority).toBe(PRIORITY_BY_LEVEL[alarm.level]);
    }
  });

  it('시연 데이터가 등급 3종 이상을 보여준다 — 한 등급뿐이면 열이 무의미하다', () => {
    expect(new Set(ALARMS.map((a) => a.level)).size).toBeGreaterThanOrEqual(3);
  });
});
