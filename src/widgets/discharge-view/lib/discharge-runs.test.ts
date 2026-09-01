import { describe, expect, it } from 'vitest';
import { COLLECTION_INTERVAL_MINUTES } from '@/shared/config/measurement';
import { SITE_SCENARIOS } from '@/shared/config/demo-scenario';
import { getOutageWindow } from '@/shared/lib/timeline';
import { getMeasurementSeries } from '@/entities/measurement';
import { currentRun, idleBands, type DischargeSample } from './discharge-runs';

const OFFLINE_SITE = SITE_SCENARIOS.find((s) => !s.online)!;

function samples(states: (boolean | null)[]): DischargeSample[] {
  return states.map((discharging, i) => ({
    t: `2026-08-21T${String(Math.floor(i / 12)).padStart(2, '0')}:${String((i % 12) * 5).padStart(2, '0')}:00Z`,
    discharging,
  }));
}

describe('방류 중단 구간 묶기', () => {
  it('이어진 중단을 한 띠로 만든다', () => {
    const bands = idleBands(samples([true, false, false, true]));
    expect(bands).toHaveLength(1);
    expect(bands[0]!.fromIso).toContain('00:05');
    expect(bands[0]!.toIso).toContain('00:10');
  });

  /**
   * **`false — null — false`는 두 구간이다.** 이어 붙이면 그 사이의 «모름»이 지워져,
   * 확인되지 않은 시간이 «멈춰 있었다»는 사실로 둔갑한다(**E4**).
   */
  it('두절이 끼면 띠를 잇지 않는다', () => {
    expect(idleBands(samples([false, null, false]))).toHaveLength(2);
  });

  it('두절만 있으면 띠가 없다', () => {
    expect(idleBands(samples([null, null]))).toHaveLength(0);
  });
});

describe('지금 상태와 지속 시간', () => {
  it('마지막 상태가 이어진 표본 수로 시간을 낸다', () => {
    const run = currentRun(samples([true, false, false, false]));
    expect(run.discharging).toBe(false);
    expect(run.minutes).toBe(3 * COLLECTION_INTERVAL_MINUTES);
    expect(run.sinceIso).toContain('00:05');
    expect(run.fromWindowStart).toBe(false);
  });

  /**
   * **창 전체가 같은 상태면 `~부터`를 내지 않는다.**
   *
   * 그 시작점은 24시간 전이라 시:분만 적으면 **어제 시각을 오늘처럼** 말한다 — `금일 배출
   * 현황`이 실제로 `14:25부터`(= 어제 14:25)라 적었다. 언제 시작됐는지는 창 밖이라 애초에
   * 알 수 없으므로 단정하지 않는 것이 맞다.
   */
  it('창 전체가 같은 상태면 시작 시각을 내지 않는다', () => {
    const run = currentRun(samples([true, true, true]));
    expect(run.fromWindowStart).toBe(true);
    expect(run.sinceIso).toBeNull();
    expect(run.minutes).toBe(3 * COLLECTION_INTERVAL_MINUTES);
  });

  /**
   * 모르는 상태를 `방류 중`으로도 `중단`으로도 적지 않는다(**E4**).
   *
   * **다만 «마지막 한 칸»은 두절이 아니다** `[사용자 지적 2026-09-01]`. 이 검사는 한때
   * `[true, null]`로 «모름»을 기대했는데, 그것은 fixture가 모든 칸을 채우던 시절의 전제다 —
   * 실측에서는 가장 최근 칸의 표본이 아직 도착하지 않은 순간이 늘 있어 정상 방류 중인
   * 사업장이 주기마다 `통신 두절`로 깜빡였다. 계측 쪽이 같은 함정을 `isReceptionStalled`로
   * 이미 좁혀 두었고(명세 §4.5의 비활성 기준 = 수집 주기 × 3) 여기도 같은 폭을 쓴다.
   */
  it('꼬리 한 칸이 비어도 두절로 적지 않는다', () => {
    const run = currentRun(samples([true, true, null]));
    expect(run.discharging).toBe(true);
    expect(run.minutes).toBe(2 * COLLECTION_INTERVAL_MINUTES);
  });

  it('비활성 기준을 넘겨 비면 그때는 모름이다', () => {
    const run = currentRun(samples([true, null, null, null]));
    expect(run.discharging).toBeNull();
    expect(run.minutes).toBeNull();
    expect(run.sinceIso).toBeNull();
  });

  it('표본이 없으면 모름이다', () => {
    expect(currentRun([]).discharging).toBeNull();
  });
});

/**
 * **완전히 두절된 사업장은 두절 띠조차 그려지지 않는다.**
 *
 * `getOutageWindow`는 *잠시* 끊긴 구간을 위한 것이라 전 구간 두절이면 `null`을 돌려준다.
 * 그 사실을 모른 채 차트를 그리면 **축만 남은 빈 그림**이 되어 값이 없다는 사실을 화면이
 * 말하지 않는다(**R19**·**E4**). 그래서 그릴 값이 하나도 없으면 차트 대신 글을 둔다.
 */
describe('전 구간 두절', () => {
  it('띠도 없고 지금 상태도 모름이다', () => {
    const all = samples([null, null, null]);
    expect(idleBands(all)).toHaveLength(0);
    expect(currentRun(all).discharging).toBeNull();
    expect(getOutageWindow(OFFLINE_SITE.id)).toBeNull();
  });

  it('시연 데이터에 전 구간 두절 사업장이 있다', () => {
    expect(OFFLINE_SITE).toBeDefined();
    expect(getMeasurementSeries(OFFLINE_SITE.id).every((p) => p.flow === null)).toBe(true);
  });
});
