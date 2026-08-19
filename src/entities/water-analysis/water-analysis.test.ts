import { describe, expect, it } from 'vitest';
import { roundTo } from '@/shared/lib/prng';
import { FORECAST_TARGETS } from '@/entities/prediction';
import { ANALYSIS_BASE } from './config/constants';
import { getAnalysisRounds, getEstimated, hasAnalyzer, hasEstimation } from './api/fixtures';
import { buildComparison, computeMetrics, measuredMean } from './lib/compare';
import {
  ANALYSIS_ITEMS,
  ANALYSIS_ITEM_CODES,
  ANALYZER_SITE_ID,
  LAB_ROUND_COUNT,
} from './config/constants';

/**
 * **슬라이스끼리 직접 참조하지 않는다**(FSD §8). 그래서 기저값을 양쪽에 두었는데,
 * 두 곳이 갈리면 대조표의 오차가 두 시연 값의 우연한 차이를 보여 주게 된다.
 * 이 테스트가 그 갈림을 잡는다 — 프로덕션 코드가 아니라 테스트가 두 슬라이스를 잇는 자리다.
 */
describe('예측 계열과 기저가 어긋나지 않는다', () => {
  it.each(['TOC', 'TN', 'TP'] as const)('%s의 기저가 예측 프로파일과 같다', (code) => {
    expect(ANALYSIS_BASE[code]).toBe(FORECAST_TARGETS[code].base);
  });
});

describe('회차 — 성적서 형식을 따른다', () => {
  const rounds = getAnalysisRounds('S-01');

  it('6개월 × 월 2회만큼 만든다', () => {
    expect(rounds).toHaveLength(LAB_ROUND_COUNT);
  });

  it('최신이 맨 앞이다', () => {
    const dates = rounds.map((r) => r.receivedIso);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it('회차마다 시료 8건 · 항목 5종이다', () => {
    for (const round of rounds) {
      expect(round.samples).toHaveLength(8);
      for (const sample of round.samples) {
        expect(Object.keys(sample.values).sort()).toEqual([...ANALYSIS_ITEM_CODES].sort());
      }
    }
  });

  it('발급번호·접수번호가 회차마다 다르다 — 성적서를 구분할 수 없으면 목록이 무의미하다', () => {
    expect(new Set(rounds.map((r) => r.issueNo)).size).toBe(rounds.length);
  });

  it('같은 사업장은 몇 번을 불러도 같은 값이다 — 시드가 고정이다', () => {
    expect(getAnalysisRounds('S-01')).toEqual(rounds);
  });

  /** 사람이 시료를 떠다 분석한다. ECP가 끊겨도 결과는 나온다 `[공정자료 p.13]` */
  it('통신 두절 사업장도 회차가 나온다', () => {
    expect(getAnalysisRounds('S-04')).toHaveLength(LAB_ROUND_COUNT);
    expect(hasEstimation('S-04')).toBe(false);
  });
});

describe('대조표 — 추정 없는 항목을 빼지 않는다', () => {
  const round = getAnalysisRounds('S-01')[0]!;
  const rows = buildComparison(round, () => 20);

  it('법정 점검 항목이 모두 남는다', () => {
    expect(rows.map((r) => r.code)).toEqual([...ANALYSIS_ITEM_CODES]);
  });

  it('SS·COD는 AI 열이 비고 이유가 붙는다', () => {
    for (const code of ['SS', 'COD'] as const) {
      const row = rows.find((r) => r.code === code)!;
      expect(row.estimated).toBeNull();
      expect(row.error).toBeNull();
      expect(row.unavailableReason).not.toBeNull();
    }
  });

  it('SS의 사유가 탁도로 대신할 수 없다는 사실을 말한다', () => {
    expect(rows.find((r) => r.code === 'SS')!.unavailableReason).toContain('탁도');
  });

  it('추정 대상 3종은 오차가 계산된다', () => {
    for (const code of ['TOC', 'TN', 'TP'] as const) {
      const row = rows.find((r) => r.code === code)!;
      expect(row.estimated).toBe(20);
      expect(row.error).toBeCloseTo(20 - row.measured!, 5);
    }
  });

  /** 통신이 끊기면 AI 열이 빈다 — 실측은 그대로 있다 */
  it('추정이 없으면 오차도 없다', () => {
    const offline = buildComparison(round, () => null);
    expect(offline.every((r) => r.estimated === null && r.error === null)).toBe(true);
    expect(offline.every((r) => r.measured !== null)).toBe(true);
  });
});

describe('검증 지표(E3) — 없는 성능을 만들지 않는다', () => {
  it('표본이 1개면 R²·MAE가 null이다', () => {
    const m = computeMetrics([{ measured: 10, estimated: 11 }]);
    expect(m.r2).toBeNull();
    expect(m.mae).toBeNull();
    expect(m.sampleCount).toBe(1);
  });

  it('실측이 전부 같은 값이면 R²를 내지 않는다 — 분모가 0이다', () => {
    const m = computeMetrics([
      { measured: 10, estimated: 11 },
      { measured: 10, estimated: 9 },
    ]);
    expect(m.r2).toBeNull();
    expect(m.mae).toBeCloseTo(1, 5);
  });

  it('완전히 일치하면 R²가 1이고 MAE가 0이다', () => {
    const m = computeMetrics([
      { measured: 10, estimated: 10 },
      { measured: 20, estimated: 20 },
    ]);
    expect(m.r2).toBeCloseTo(1, 5);
    expect(m.mae).toBe(0);
  });

  it('MAE는 부호를 상쇄하지 않는다', () => {
    const m = computeMetrics([
      { measured: 10, estimated: 12 },
      { measured: 20, estimated: 18 },
    ]);
    expect(m.mae).toBeCloseTo(2, 5);
  });

  it('표본 수를 값과 함께 낸다', () => {
    expect(computeMetrics([]).sampleCount).toBe(0);
  });
});

describe('분석기는 1개소뿐이다', () => {
  it('대표 사업장만 true다', () => {
    expect(hasAnalyzer(ANALYZER_SITE_ID)).toBe(true);
    expect(hasAnalyzer('S-01')).toBe(false);
  });
});

describe('실측 평균', () => {
  const round = getAnalysisRounds('S-02')[0]!;

  /**
   * 평균을 **항목 자릿수로 반올림해** 낸다 — 화면마다 다르게 반올림하지 않기 위해서다(E1).
   * 반올림은 저장소 전체가 쓰는 `roundTo`(half-up)다. `toFixed`는 이진 표현 때문에
   * 정확히 `.x5`인 값에서 다르게 떨어진다(25.45 → 25.5 vs 25.4).
   */
  it('시료 8건의 평균을 항목 자릿수로 낸다', () => {
    const values = round.samples.map((s) => s.values.TOC!).filter((v) => v !== undefined);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;

    expect(measuredMean(round, 'TOC')).toBe(roundTo(mean, ANALYSIS_ITEMS.TOC.decimals));
  });

  it('항목이 없으면 null이다 — 0으로 채우지 않는다(E4)', () => {
    const empty = { ...round, samples: [] };
    expect(measuredMean(empty, 'TOC')).toBeNull();
  });
});

/**
 * AI 추정은 **그 회차의 실측을 따라간다.**
 *
 * 실측과 무관하게 뽑으면 두 난수가 상관이 없어 R²가 음수로 나오고(실제로 −1.8이 나왔다)
 * 화면이 "AI가 평균만도 못하다"고 말하게 된다 — 모델 성능이 아니라 생성 방식의 결과다.
 */
describe('회차별 AI 추정값', () => {
  const rounds = getAnalysisRounds('S-01');

  it('회차마다 값이 다르다 — 같으면 대조표가 무의미하다', () => {
    const values = rounds.map((r) => getEstimated(r, 'TOC'));
    expect(new Set(values).size).toBeGreaterThan(1);
  });

  it('그 회차 실측에서 멀지 않다', () => {
    for (const round of rounds) {
      const measured = measuredMean(round, 'TOC')!;
      const estimated = getEstimated(round, 'TOC')!;
      expect(Math.abs(estimated - measured)).toBeLessThan(measured * 0.1);
    }
  });

  it('AI 추정 대상이 아닌 항목은 null이다', () => {
    expect(getEstimated(rounds[0]!, 'SS')).toBeNull();
    expect(getEstimated(rounds[0]!, 'COD')).toBeNull();
  });

  /** 통신이 끊기면 산출이 중단된다. 실측은 사람이 뜨므로 그대로 있다 */
  it('통신 두절 사업장은 추정이 없다', () => {
    const offline = getAnalysisRounds('S-04');
    expect(getEstimated(offline[0]!, 'TOC')).toBeNull();
    expect(measuredMean(offline[0]!, 'TOC')).not.toBeNull();
  });

  it('같은 회차를 몇 번 물어도 같은 값이다', () => {
    expect(getEstimated(rounds[0]!, 'TOC')).toBe(getEstimated(rounds[0]!, 'TOC'));
  });

  /** 항목마다 시드를 벌린다 — 안 벌리면 세 항목의 오차가 같은 방향으로만 움직인다 */
  it('항목별로 오차 방향이 갈린다', () => {
    const signs = rounds.map((round) =>
      (['TOC', 'TN', 'TP'] as const).map((code) =>
        Math.sign(getEstimated(round, code)! - measuredMean(round, code)!),
      ),
    );
    expect(signs.some(([a, b, c]) => a !== b || b !== c)).toBe(true);
  });
});
