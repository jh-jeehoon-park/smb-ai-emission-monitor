import { describe, expect, it } from 'vitest';
import { judgeCompliance } from './lib/judge';
import type { ResolvedStandard, StandardStatus } from './model/types';

/**
 * **여섯 상태를 가른다** `[사용자 요청 2026-09-28: 설정 재설계 검토]`.
 *
 * `boolean | null` 하나로는 「값이 없다」와 「기준이 없다」와 「적용 대상이 아니다」가 전부
 * 같은 `null`이 된다 — 화면이 셋에 서로 다른 말을 해야 하는데 구분할 방법이 없다.
 *
 * **모르는 것을 정상으로 만들지 않는다.** `COMPLIANT`는 «견주어 보니 안쪽이었다»는 뜻이고,
 * 견줄 것이 없었던 경우에는 절대 나오지 않는다.
 */
const standard = (status: StandardStatus, min: number | null, max: number | null): ResolvedStandard => ({
  siteId: 'S-TEST',
  pollutantCode: 'TOC',
  asOf: '2026-09-28T00:00:00.000Z',
  status,
  min,
  max,
  unit: 'mg/L',
  matchedRuleIds: [],
  decisiveRuleId: null,
  effectiveFrom: null,
  trace: [],
});

describe('판정 상태', () => {
  it('기준 안이면 COMPLIANT — 법정 근거를 함께 낸다', () => {
    expect(judgeCompliance(standard('RESOLVED', null, 40), 39)).toMatchObject({
      judgement: 'COMPLIANT',
      basis: 'legal',
    });
  });

  it('기준 밖이면 EXCEEDED다', () => {
    expect(judgeCompliance(standard('RESOLVED', null, 40), 41).judgement).toBe('EXCEEDED');
  });

  /** 경계값은 초과가 아니다 — 5.8과 8.6은 허용 범위 안이다 */
  it('경계값은 초과가 아니다', () => {
    expect(judgeCompliance(standard('RESOLVED', 5.8, 8.6), 5.8).judgement).toBe('COMPLIANT');
    expect(judgeCompliance(standard('RESOLVED', 5.8, 8.6), 8.6).judgement).toBe('COMPLIANT');
    expect(judgeCompliance(standard('RESOLVED', 5.8, 8.6), 8.61).judgement).toBe('EXCEEDED');
  });

  /** **시연 임계값 초과는 법정 초과와 같은 문장을 얻지 않는다** — `basis`가 그것을 가른다 */
  it('시연 임계값으로 넘어도 basis가 provisional이다', () => {
    const result = judgeCompliance(standard('PROVISIONAL', null, 40), 41);

    expect(result.judgement).toBe('EXCEEDED');
    expect(result.basis).toBe('provisional');
    expect(result.basis).not.toBe('legal');
  });

  it('값이 없으면 NO_MEASUREMENT다 — 기준 유무보다 먼저 본다', () => {
    expect(judgeCompliance(standard('RESOLVED', null, 40), null).judgement).toBe('NO_MEASUREMENT');
    expect(judgeCompliance(standard('UNRESOLVED', null, null), null).judgement).toBe('NO_MEASUREMENT');
  });

  it('기준을 모르면 PENDING_STANDARD다 — COMPLIANT로 떨어지지 않는다', () => {
    const result = judgeCompliance(standard('UNRESOLVED', null, null), 41);

    expect(result.judgement).toBe('PENDING_STANDARD');
    expect(result.judgement).not.toBe('COMPLIANT');
    expect(result.basis).toBe('none');
  });

  /** **「모른다」와 「대상이 아니다」를 합치지 않는다** */
  it('적용 제외는 NOT_APPLICABLE이고 PENDING_STANDARD와 다르다', () => {
    const result = judgeCompliance(standard('NOT_APPLICABLE', null, null), 41);

    expect(result.judgement).toBe('NOT_APPLICABLE');
    expect(result.judgement).not.toBe('PENDING_STANDARD');
  });

  it('규정이 충돌하면 값을 견주지 않는다', () => {
    expect(judgeCompliance(standard('CONFLICT', null, null), 41).judgement).toBe('CONFLICT');
  });

  /**
   * 상태는 확정인데 경계가 비어 있는 경우 — 저장·파싱이 어긋났을 때 생긴다.
   * **「기준 안」으로 떨어뜨리면 경계 없는 기준이 모든 값을 통과시킨다**(실제로 밟은 함정이다).
   */
  it('경계가 없으면 확정 상태여도 판정하지 않는다', () => {
    expect(judgeCompliance(standard('RESOLVED', null, null), 41).judgement).toBe('PENDING_STANDARD');
  });

  /** 판정이 어디서 나왔는지 화면이 되짚을 수 있어야 한다 */
  it('결과가 근거가 된 기준을 들고 다닌다', () => {
    const base = standard('RESOLVED', null, 40);

    expect(judgeCompliance(base, 39).standard).toBe(base);
  });
});
