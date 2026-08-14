import { describe, expect, it } from 'vitest';
import { SITES, getSite } from './index';

describe('사업장 fixture — 시연이 성립하는 조건', () => {
  it('통신 두절 사업장이 최소 1곳 있다', () => {
    /**
     * 전부 online이면 결측·두절 처리(E4)와 "산출 불가" 빈 상태가 화면에서 한 번도
     * 그려지지 않는다. 심사에서 보여야 하는 것은 값이 잘 나오는 화면만이 아니라
     * **없을 때 지어내지 않는 화면**이다. 이 조건이 깨지면 그 경로가 죽는다.
     */
    expect(SITES.filter((s) => !s.online).length).toBeGreaterThanOrEqual(1);
  });

  it('통신 두절 사업장은 이상 점수와 등급이 비어 있다', () => {
    // 두절이면 산출값이 없다. 0이나 '정상'으로 채우면 화면이 거짓을 말한다(E3·E4)
    for (const site of SITES.filter((s) => !s.online)) {
      expect(site.anomalyScore).toBeNull();
      expect(site.status).toBeNull();
    }
  });

  it('정상 사업장은 이상 점수가 0~100 안에 있다', () => {
    // 서버 산출 범위 (사업계획서 p.64). 범위 밖은 수집 파이프라인 버그다
    for (const site of SITES.filter((s) => s.online)) {
      expect(site.anomalyScore).not.toBeNull();
      expect(site.anomalyScore as number).toBeGreaterThanOrEqual(0);
      expect(site.anomalyScore as number).toBeLessThanOrEqual(100);
    }
  });

  it('없는 사업장 ID를 물어도 화면이 깨지지 않는다', () => {
    // URL 쿼리는 사용자가 바꿀 수 있다. 첫 사업장으로 떨어져야 셸 헤더가 빈칸이 되지 않는다
    expect(getSite('없는-사업장')).toBe(SITES[0]);
  });
});
