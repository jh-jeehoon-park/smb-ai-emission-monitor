import { describe, expect, it } from 'vitest';
import { SITE_SCENARIOS } from '@/shared/config/demo-scenario';
import { isDischargingAt } from '@/shared/lib/timeline';
import { dischargingAt } from './discharging';

const SITE = SITE_SCENARIOS[0]!.id;

/**
 * **한 화면이 두 말을 하지 않게 하는 함수다** `[사용자 지적 2026-09-15]`.
 *
 * 규칙이 세 화면에 흩어져 있을 때 두 화면만 시나리오를 읽었다 — 실측 중에 서버가
 * «방류 중단»을 보내도 벽에는 «방류 중»이 걸릴 수 있었다.
 */
describe('dischargingAt', () => {
  it('서버 값이 있으면 그것을 쓴다 — 시나리오와 달라도', () => {
    const scenario = isDischargingAt(SITE, 0);
    const live = [scenario === true ? false : true];
    expect(dischargingAt(SITE, live, 0)).toBe(live[0]);
    expect(dischargingAt(SITE, live, 0)).not.toBe(scenario);
  });

  it('폴백이면 시나리오를 쓴다 — 두 원천이 같은 값이 된다', () => {
    for (const index of [0, 10, 500]) {
      expect(dischargingAt(SITE, null, index)).toBe(isDischargingAt(SITE, index));
    }
  });

  /** 서버가 그 표본을 비워 보낼 수 있다. **모름을 `false`로 적으면 «안 내보냈다»가 된다**(E4) */
  it('서버가 비운 표본은 모름이다 — false가 아니다', () => {
    expect(dischargingAt(SITE, [null], 0)).toBeNull();
  });

  /** 계열보다 뒤를 물으면 모름이다 — 서버 계열이 우리 시간축보다 짧을 수 있다 */
  it('계열 밖은 모름이다', () => {
    expect(dischargingAt(SITE, [true], 5)).toBeNull();
  });

  /**
   * **첫 응답 전에는 계열이 비어 `-1`이 들어온다** `[검토 2026-09-15]`.
   *
   * 시나리오는 그 음수를 «구간 밖»으로 읽어 `true`를 돌려주고 있었다 — 그래서 현황판과
   * 유입·유출 비교가 **아무것도 받기 전에 «방류 중»이라 단정**했다. 폴백·실측 어느 쪽이든
   * 모름이어야 한다(**E4**).
   */
  it('빈 계열의 맨 끝(-1)은 모름이다 — 폴백에서도', () => {
    for (const site of SITE_SCENARIOS) {
      expect(dischargingAt(site.id, null, -1), site.id).toBeNull();
    }
    expect(dischargingAt(SITE, [], -1)).toBeNull();
  });

  /** 되돌아오면 곧바로 드러나게 — 시나리오 쪽은 여전히 음수에 `true`를 돌려준다 */
  it('막는 자리는 이 함수다 — 시나리오는 그대로다', () => {
    expect(isDischargingAt(SITE, -1)).toBe(true);
  });
});
