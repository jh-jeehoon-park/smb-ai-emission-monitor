import { describe, expect, it } from 'vitest';
import { PROVISIONAL_STALE_SAMPLES } from '@/shared/config/provisional';
import { isReceptionStalled } from './reception';
import type { Reading } from '../model/types';

const filled = (n: number): Reading[] => Array.from({ length: n }, () => 1);
const empty = (n: number): Reading[] => Array.from({ length: n }, () => null);

describe('isReceptionStalled — 아직 안 온 것과 끊긴 것을 가른다', () => {
  /**
   * 계측 서버를 붙이자 정상 수신 중인 사업장의 여덟 항목에 전부 `수신 없음`이 붙었다 — 값은
   * 8.31로 멀쩡히 떠 있는 채로. 격자의 마지막 칸은 그 시각 표본이 아직 도착하지 않은
   * 순간이 늘 있는데 그 한 칸으로 판정하고 있었다.
   */
  it('마지막 한 칸만 비면 두절이 아니다', () => {
    expect(isReceptionStalled([...filled(20), null])).toBe(false);
  });

  it('수집 주기 × 3만큼 이어서 비면 두절이다 — 명세 §4.5와 같은 기준', () => {
    expect(isReceptionStalled([...filled(20), ...empty(PROVISIONAL_STALE_SAMPLES)])).toBe(true);
  });

  it('한 칸 모자라면 아직 두절이 아니다 (경계)', () => {
    expect(isReceptionStalled([...filled(20), ...empty(PROVISIONAL_STALE_SAMPLES - 1)])).toBe(
      false,
    );
  });

  it('전 구간 결측은 그대로 두절이다', () => {
    expect(isReceptionStalled(empty(288))).toBe(true);
  });

  /** 중간에 끊겼다 복구된 구간은 지금 두절이 아니다 */
  it('과거 두절은 지금 두절이 아니다', () => {
    expect(isReceptionStalled([...filled(10), ...empty(30), ...filled(10)])).toBe(false);
  });

  it('계열이 비어 있으면 두절이라 단정하지 않는다', () => {
    expect(isReceptionStalled([])).toBe(false);
  });
});
