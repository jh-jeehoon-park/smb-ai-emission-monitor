import { describe, expect, it } from 'vitest';
import { parseClassification, scaleFromDailyFlow } from './lib/storage';

/**
 * **배출량은 구간이 아니라 원시 값이 정본이다**
 * `[사용자 요청 2026-09-28: 설정 재설계 검토]`.
 *
 * 구간 경계는 법이 정하는 것이라 바뀔 수 있다 — 구간만 저장해 두면 경계가 바뀔 때
 * **사업장 데이터를 전부 다시 분류해야 한다.** 원시 값을 두면 파생 규칙 한 곳만 고친다.
 */
describe('배출량에서 규모 구간이 나온다', () => {
  it('네 구간으로 갈린다', () => {
    expect(scaleFromDailyFlow(150)).toBe('200㎥ 미만');
    expect(scaleFromDailyFlow(350)).toBe('200~700㎥');
    expect(scaleFromDailyFlow(1200)).toBe('700~2,000㎥');
    expect(scaleFromDailyFlow(5000)).toBe('2,000㎥ 이상');
  });

  /** 경계값은 **위 구간**에 들어간다 — 법령 표기(`2,000㎥ 이상`)가 이미 경계를 포함한다 */
  it('경계값은 위 구간이다', () => {
    expect(scaleFromDailyFlow(200)).toBe('200~700㎥');
    expect(scaleFromDailyFlow(700)).toBe('700~2,000㎥');
    expect(scaleFromDailyFlow(2000)).toBe('2,000㎥ 이상');
  });

  /** 실증 5개소는 전부 여기다 — 최대가 대호특수강 배출 191.6㎥/일이다 */
  it('실증 사업장 배출량은 전부 200㎥ 미만이다', () => {
    for (const m3 of [15, 20, 30, 49, 191.6]) {
      expect(scaleFromDailyFlow(m3), String(m3)).toBe('200㎥ 미만');
    }
  });
});

describe('저장값을 믿지 않는다', () => {
  const at = (raw: unknown) => parseClassification({ 'S-02': raw })?.['S-02'];

  /** **원시 값이 구간을 이긴다** — 옛 판에 손으로 고친 구간이 남아 있어도 배출량이 정본이다 */
  it('배출량이 있으면 저장된 구간을 무시한다', () => {
    const parsed = at({ regionGrade: '가지역', dischargeScale: '2,000㎥ 이상', dailyWastewaterM3: 150 });

    expect(parsed?.dischargeScale).toBe('200㎥ 미만');
    expect(parsed?.dailyWastewaterM3).toBe(150);
  });

  it('배출량이 없으면 직접 고른 구간을 쓴다', () => {
    expect(at({ dischargeScale: '200~700㎥' })?.dischargeScale).toBe('200~700㎥');
  });

  /** 음수·문자열·`NaN`은 배출량이 아니다 — 들어오면 구간이 통째로 틀린다 */
  it('배출량이 아닌 값은 버린다', () => {
    for (const bad of [-5, '150', null, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(at({ dailyWastewaterM3: bad })?.dailyWastewaterM3, String(bad)).toBeNull();
    }
  });

  it('모르는 방류 경로는 버린다', () => {
    expect(at({ dischargeRoute: 'PUBLIC_WATER' })?.dischargeRoute).toBe('PUBLIC_WATER');
    expect(at({ dischargeRoute: '아무거나' })?.dischargeRoute).toBeNull();
  });

  /** 옛 판본에는 두 필드가 아예 없다 — 읽다가 터지지 않고 `null`로 떨어져야 한다 */
  it('옛 저장값도 읽힌다', () => {
    const parsed = at({ regionGrade: '가지역', dischargeScale: '200㎥ 미만' });

    expect(parsed?.regionGrade).toBe('가지역');
    expect(parsed?.dailyWastewaterM3).toBeNull();
    expect(parsed?.dischargeRoute).toBeNull();
  });
});

/**
 * **처리수 재이용** `[사용자 결정 2026-09-29: 재이용 (가)]` — 유입·유출 화면이 «유입 − 유출»을
 * 읽을 때 쓴다. 모름(`null`)과 «재이용 없음»을 가른다.
 */
describe('처리수 재이용', () => {
  const at = (raw: unknown) => parseClassification({ 'S-02': raw })?.['S-02'];

  it('일부 재이용이면 양을 읽는다', () => {
    const parsed = at({ reuse: 'partial', reuseDailyM3: 197.5 });
    expect(parsed?.reuse).toBe('partial');
    expect(parsed?.reuseDailyM3).toBe(197.5);
  });

  /** 남은 숫자가 «일부 재이용»처럼 읽힌다 */
  it('재이용이 없거나 모르면 양을 버린다', () => {
    expect(at({ reuse: 'none', reuseDailyM3: 50 })?.reuseDailyM3).toBeNull();
    expect(at({ reuseDailyM3: 50 })?.reuseDailyM3).toBeNull();
  });

  it('모르는 값과 음수 양을 버린다', () => {
    expect(at({ reuse: 'full' })?.reuse).toBeNull();
    expect(at({ reuse: 'partial', reuseDailyM3: -1 })?.reuseDailyM3).toBeNull();
  });

  /** 옛 판본에는 두 필드가 없다 — «재이용 없음»으로 읽으면 확인하지 않은 것을 주장한다 */
  it('옛 저장값은 모름이다', () => {
    const parsed = at({ regionGrade: '가지역' });
    expect(parsed?.reuse).toBeNull();
    expect(parsed?.reuseDailyM3).toBeNull();
  });
});
