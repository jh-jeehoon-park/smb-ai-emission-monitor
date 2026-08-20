import { describe, expect, it } from 'vitest';
import { PROVISIONAL_STATUS_LEVELS } from '@/shared/config/provisional';
import { TIMELINE_POINT_COUNT, isMissingAt, isTreatmentIdleAt } from '@/shared/lib/timeline';
import {
  RUL_HISTORY_DAYS,
  STATUS_TIMELINE_HOURS,
  daysUntilDepleted,
  getEquipment,
  getRulHistory,
  getRulSeries,
  getStatusTimeline,
  getTreatmentTimeline,
} from '@/entities/equipment';
import { SAMPLES_PER_STATUS_CELL } from './config/constants';

const online = getEquipment('S-02');
const offline = getEquipment('S-04');

describe('잔여 수명 추이', () => {
  const history = getRulHistory('S-02', online[0]!);

  it('오늘까지 하루 간격으로 이어진다', () => {
    expect(history).toHaveLength(RUL_HISTORY_DAYS + 1);
    expect(history[history.length - 1]!.dayOffset).toBe(0);
  });

  /**
   * **늘어나면 안 된다.** 잔여 수명이 늘려면 정비가 있어야 하는데 우리에겐 정비 이력이
   * 없다(`REQ-AD-019`). 오르내리면 화면이 설명할 수 없는 사건을 암시한다.
   */
  it('과거에서 오늘로 올수록 줄어든다', () => {
    for (let i = 1; i < history.length; i += 1) {
      expect(history[i]!.rul).toBeLessThanOrEqual(history[i - 1]!.rul);
    }
  });

  it('오늘 값이 카드의 잔여 수명과 같다 — 그래프와 숫자가 갈리면 안 된다', () => {
    expect(history[history.length - 1]!.rul).toBe(online[0]!.remainingUsefulLifeDays);
  });

  it('설비마다 다른 자취를 갖는다', () => {
    const a = getRulHistory('S-02', online[0]!).map((p) => p.rul);
    const b = getRulHistory('S-02', online[1]!).map((p) => p.rul);
    expect(a).not.toEqual(b);
  });

  it('같은 설비는 몇 번을 불러도 같다 — 시드가 고정이다', () => {
    expect(getRulHistory('S-02', online[0]!)).toEqual(history);
  });
});

describe('예측 계열', () => {
  const series = getRulSeries('S-02', online[0]!);
  const today = series.find((p) => p.day === 0)!;

  it('오늘을 사이에 두고 지나온 값과 앞날이 나뉜다', () => {
    expect(series.filter((p) => p.day < 0).every((p) => p.actual !== null && p.projected === null))
      .toBe(true);
    expect(series.filter((p) => p.day > 0).every((p) => p.actual === null && p.projected !== null))
      .toBe(true);
  });

  /** 오늘 칸에 둘 다 없으면 파선이 하루 떨어진 곳에서 따로 시작해 선이 끊겨 보인다 */
  it('오늘 칸은 두 값을 같이 갖는다', () => {
    expect(today.actual).toBe(today.projected);
  });

  it('마지막 점이 0이다 — 어디서 바닥에 닿는지가 이 그래프의 요지다', () => {
    expect(series[series.length - 1]!.projected).toBe(0);
    expect(series[series.length - 1]!.day).toBe(daysUntilDepleted(online[0]!));
  });

  it('앞날도 단조 감소다', () => {
    const ahead = series.filter((p) => p.day > 0).map((p) => p.projected!);
    for (let i = 1; i < ahead.length; i += 1) {
      expect(ahead[i]!).toBeLessThanOrEqual(ahead[i - 1]!);
    }
  });
});

describe('고갈 예상 시점', () => {
  it('고장 확률이 높을수록 빨리 닿는다', () => {
    const sorted = [...online].sort((a, b) => b.failureProbability - a.failureProbability);
    const risky = sorted[0]!;
    const safe = sorted[sorted.length - 1]!;
    /* 남은 수명 자체가 다르므로 하루당 감소가 더 큰지로 본다 */
    expect(risky.remainingUsefulLifeDays / daysUntilDepleted(risky)).toBeGreaterThan(
      safe.remainingUsefulLifeDays / daysUntilDepleted(safe),
    );
  });
});

describe('상태 격자', () => {
  const cells = getStatusTimeline('S-02', online[0]!);

  it('24칸이다 — 원문 예시가 00시~24시를 시간 단위로 끊는다', () => {
    expect(cells).toHaveLength(STATUS_TIMELINE_HOURS);
  });

  /**
   * 격자가 시계열 창을 **남김없이** 덮어야 한다. 모자라면 마지막 시간이 조용히 잘리고,
   * 넘치면 없는 표본을 읽는다. 수집 주기나 창 길이가 바뀌면 여기서 먼저 걸린다.
   */
  it('칸 × 표본 수가 시계열 창과 정확히 맞는다', () => {
    expect(STATUS_TIMELINE_HOURS * SAMPLES_PER_STATUS_CELL).toBe(TIMELINE_POINT_COUNT);
  });

  it('등급은 정의된 4단계 안에 있다', () => {
    for (const cell of cells) {
      if (cell.level === null) continue;
      expect(PROVISIONAL_STATUS_LEVELS).toContain(cell.level);
    }
  });

  /**
   * **결측·미가동은 이 파일이 새로 만들지 않는다.** 두 축을 각자 만들면 한 화면이
   * 서로 다른 말을 한다 — 리본·시계열과 같은 단일 원천을 따라야 한다.
   */
  it('한 시간 안에 결측이 하나라도 있으면 그 칸은 모름이다', () => {
    cells.forEach((cell, hour) => {
      const from = hour * SAMPLES_PER_STATUS_CELL;
      const anyMissing = Array.from({ length: SAMPLES_PER_STATUS_CELL }, (_, k) =>
        isMissingAt('S-02', from + k),
      ).some(Boolean);
      expect(cell.level === null).toBe(anyMissing);
    });
  });

  it('통신 두절 사업장은 전 칸이 모름이다 — 정상으로 채우지 않는다(E4)', () => {
    const offlineCells = getStatusTimeline('S-04', offline[0]!);
    expect(offlineCells.every((c) => c.level === null)).toBe(true);
  });

  /**
   * **마지막 칸이 곧 지금이다.** 카드·표는 `equipment.status`를 쓰므로 여기가 어긋나면
   * 한 화면이 현재 상태를 두 가지로 말한다.
   */
  it('마지막 칸이 카드의 현재 등급과 같다', () => {
    for (const equipment of online) {
      const timeline = getStatusTimeline('S-02', equipment);
      const now = timeline[timeline.length - 1]!;
      if (now.level === null) continue;
      expect(now.level).toBe(equipment.status);
    }
  });

  it('하루가 평평하지 않다 — 한 등급뿐이면 격자를 그릴 이유가 없다', () => {
    const levels = new Set(cells.map((c) => c.level).filter((l) => l !== null));
    expect(levels.size).toBeGreaterThan(1);
  });
});

describe('방지시설 가동 줄', () => {
  /**
   * **설비 칸과 같은 축이되 같은 값이 아니다.** 방지시설은 멈췄는데 방류 펌프는 돌았다는 것이
   * 무단방류 의심의 요지다 — 두 축을 겹치면 그 구분이 사라진다.
   */
  it('설비 격자와 칸 수·시각이 맞는다', () => {
    const treatment = getTreatmentTimeline('S-02');
    const status = getStatusTimeline('S-02', online[0]!);
    expect(treatment.map((c) => c.iso)).toEqual(status.map((c) => c.iso));
  });

  it('판정은 방류 의심 축이 이미 한 것을 시간으로 묶기만 한다', () => {
    getTreatmentTimeline('S-02').forEach((cell, hour) => {
      const from = hour * SAMPLES_PER_STATUS_CELL;
      const samples = Array.from({ length: SAMPLES_PER_STATUS_CELL }, (_, k) =>
        isTreatmentIdleAt('S-02', from + k),
      );
      expect(cell.idle).toBe(
        samples.some((v) => v === null) ? null : samples.some((v) => v === true),
      );
    });
  });

  it('한 표본이라도 모르면 그 시간은 모름이다 — 아는 것만 모아 단정하지 않는다(E4)', () => {
    expect(getTreatmentTimeline('S-04').every((c) => c.idle === null)).toBe(true);
  });
});
