import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ALARM_PREVIEW_MAX_HEIGHT } from '../config/constants';

/**
 * **알람이 옆 카드를 늘리지 않는다** `[사용자 지적 2026-09-07]`.
 *
 * 두 카드가 한 격자 행이라 키가 큰 쪽이 행 높이를 정한다. 알람은 건수만큼 길어지므로
 * `이상 탐지 결과`가 그만큼 늘어나 **아래가 비었다** — 비는 쪽은 알람이 아니라 옆 카드였다.
 *
 * jsdom에는 배치가 없어 «두 건이 보이는가»는 잴 수 없다. 대신 **상한이 실제로 걸리는
 * 형태인지**를 본다 — 그 형태가 무너지는 경로가 눈에 안 띄기 때문이다(아래 `min-h-0`).
 */
const source = readFileSync('src/widgets/admin-overview/ui/admin-overview-view.tsx', 'utf8');

/** 알람 카드의 `bodyClassName`에 들어간 것 */
const bodyClass = /<Panel title="알람" bodyClassName=\{`([^`]+)`\}/.exec(source)?.[1] ?? '';

describe('알람 카드 — 두 건 남짓만 보이고 스크롤한다', () => {
  it('알람 카드를 찾았다 — 못 찾으면 아래 검사가 조용히 통과한다', () => {
    expect(bodyClass).not.toBe('');
  });

  it('상한과 스크롤을 함께 건다', () => {
    /* 값이 아니라 **상수를 가리키는지**를 본다 — 숫자를 인라인으로 적으면 근거가 흩어진다 */
    expect(bodyClass).toContain('${ALARM_PREVIEW_MAX_HEIGHT}');
    expect(bodyClass).toContain('overflow-y-auto');
  });

  it('상수가 높이 상한 클래스다', () => {
    expect(ALARM_PREVIEW_MAX_HEIGHT).toMatch(/^max-h-\[\d+px\]$/);
  });

  /**
   * **이것이 빠지면 상한이 아무 일도 하지 않는다.** 본문은 `flex-1`이라 flex 자식의 기본
   * `min-height: auto`가 걸리고, CSS에서 `min-height`는 `max-height`를 이긴다 — 카드는
   * 그대로 늘어나고 화면에서는 «고쳤는데 왜 그대로지»로만 보인다.
   */
  it('`min-h-0`이 함께 있다 — 없으면 min-height가 max-height를 이긴다', () => {
    expect(bodyClass).toContain('min-h-0');
  });

  /** 목록이 본문인 화면까지 자르면 안 된다 — 상한은 이 화면만의 것이다 */
  it('알람 이력·이상 탐지 화면에는 상한이 없다', () => {
    for (const path of [
      'src/widgets/alarms-view/ui/alarms-view.tsx',
      'src/widgets/anomaly-view/ui/anomaly-view.tsx',
    ]) {
      expect(readFileSync(path, 'utf8'), path).not.toContain(ALARM_PREVIEW_MAX_HEIGHT);
    }
  });
});
