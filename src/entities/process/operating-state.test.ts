import { describe, expect, it, vi } from 'vitest';

/**
 * **마지막 표본이 결측인 사업장을 만들어 낸다.**
 *
 * 지금 fixture에는 그런 사업장이 없다 — 통신 두절 구간이 전부 중간에 있다. 없다고 두면
 * 그 경로가 처음 밟히는 날에 `방류 없음 · 0시간째`라는 없는 사실이 화면에 뜬다.
 * 시나리오를 주입할 수 없는 구조라(모듈 최상위 `getScenario`) 모듈을 대체해 재현한다.
 */
const TAIL_OUTAGE_SITE = 'S-01';

vi.mock('@/shared/config/demo-scenario', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/config/demo-scenario')>();
  return {
    ...actual,
    getScenario: (siteId: string) => {
      const scenario = actual.getScenario(siteId);
      // offset 1~11이면 두절 구간이 마지막 표본을 덮는다(OUTAGE_LENGTH = 11)
      return siteId === TAIL_OUTAGE_SITE ? { ...scenario, outageStartOffset: 1 } : scenario;
    },
  };
});

const { getOperatingState } = await import('./api/fixtures');
const { TIMELINE_POINT_COUNT, isDischargingAt } = await import('@/shared/lib/timeline');

describe('getOperatingState — 마지막 표본이 결측일 때', () => {
  it('현재 방류 여부가 null이다 — 전제 확인', () => {
    expect(isDischargingAt(TAIL_OUTAGE_SITE, TIMELINE_POINT_COUNT - 1)).toBeNull();
  });

  /** 0시간째라고 적으면 "방금 멈췄다"는 없는 사실을 주장하게 된다(E4) */
  it('멈춘 시간이 0이 아니라 null이다', () => {
    expect(getOperatingState(TAIL_OUTAGE_SITE).idleHours).toBeNull();
  });

  it('통신은 살아 있으므로 가동 중으로 본다', () => {
    expect(getOperatingState(TAIL_OUTAGE_SITE).running).toBe(true);
  });

  it('두절 구간 밖의 사업장은 영향받지 않는다', () => {
    const other = getOperatingState('S-09');
    expect(other.idleHours).toBe(2);
  });
});
