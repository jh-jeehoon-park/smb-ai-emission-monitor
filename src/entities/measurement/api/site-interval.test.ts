import { describe, expect, it } from 'vitest';
import type { TbTimeseries } from '@/shared/api/thingsboard';
import { TB_TIMESERIES_MAX, tbTimeseriesLimit } from '@/shared/api/thingsboard';
import { intervalLabel } from '../lib/interval-label';
import {
  COLLECTION_INTERVAL_MS,
  buildGrid,
  newestSample,
  resolveIntervalSeconds,
  toTelemetryWindow,
} from './telemetry.mapper';
import {
  TELEMETRY_KEY_PREFIX,
  pollIntervalMs,
  telemetryQueryKey,
  telemetryTailQueryKey,
} from './use-site-series';

/**
 * **수집 주기는 사업장마다 다르다** `[사용자 요청 2026-09-16]`.
 *
 * 서버가 `intervalSeconds` 채널로 알려 주기 전까지 앱은 전 사업장이 1분이라 가정했고, 5초로
 * 보내는 사업장 하나가 그 가정 때문에 **24시간 중 3.9시간만** 그려졌다(실측: 1,440칸 중 235칸).
 * `limit`이 1,500 고정이라 `orderBy=ASC`와 맞물려 가장 오래된 구간만 받았기 때문이다.
 *
 * 여기서 잠그는 것은 셋이다 — ① 주기를 그대로 믿지 않는다 ② 조회 구간이 주기를 따라간다
 * ③ 표시 격자는 흔들리지 않는다.
 */
const SITE = 'S-01';
const HOURS_24_MS = 24 * 60 * 60_000;
const DEFAULT_SECONDS = COLLECTION_INTERVAL_MS / 1000;

describe('resolveIntervalSeconds — 서버 값을 그대로 믿지 않는다', () => {
  it('범위 안의 값은 그대로 쓴다', () => {
    expect(resolveIntervalSeconds(5)).toBe(5);
    expect(resolveIntervalSeconds(60)).toBe(60);
    expect(resolveIntervalSeconds(600)).toBe(600);
  });

  /**
   * 채널이 없던 시절의 동작으로 떨어진다. **0을 그대로 받으면 `limit` 계산이 0으로 나누기가
   * 되고**, 지나치게 크면 표본이 한 점도 격자에 맞지 않는다.
   */
  it('없거나 범위를 벗어나면 표시 격자 간격으로 떨어진다', () => {
    for (const bad of [null, undefined, Number.NaN, 0, -5, 601, 10_000]) {
      expect(resolveIntervalSeconds(bad), String(bad)).toBe(DEFAULT_SECONDS);
    }
  });
});

describe('tbTimeseriesLimit — 조회 구간이 주기를 따라간다', () => {
  it('1분 사업장은 예전 고정값(1,500) 언저리다 — 지금 돌던 것이 그대로 돈다', () => {
    const limit = tbTimeseriesLimit(HOURS_24_MS, 60_000);
    expect(limit).toBeGreaterThanOrEqual(1440);
    expect(limit).toBeLessThan(1600);
  });

  /** **이것이 고치려는 결함이다.** 17,280표본이 1,500에 잘려 22시간이 비어 있었다 */
  it('5초 사업장은 24시간을 다 담을 만큼 커진다', () => {
    const limit = tbTimeseriesLimit(HOURS_24_MS, 5_000);
    expect(limit).toBeGreaterThanOrEqual(HOURS_24_MS / 5_000);
  });

  it('주기가 터무니없이 작아도 울타리를 넘지 않는다', () => {
    expect(tbTimeseriesLimit(HOURS_24_MS, 1)).toBe(TB_TIMESERIES_MAX);
    expect(tbTimeseriesLimit(HOURS_24_MS, 0)).toBe(TB_TIMESERIES_MAX);
  });
});

describe('pollIntervalMs — 표시 격자보다 자주 묻지 않는다', () => {
  /**
   * 5초마다 물어도 **새로 생기는 칸이 없다** — 화면의 칸이 1분이다. 얻는 것은 오른쪽 끝의
   * 신선도뿐이고 그 대가가 24시간치(실측 8.8MB) × 12다.
   */
  it('격자보다 빠른 사업장은 격자 간격으로 묻는다', () => {
    expect(pollIntervalMs(5)).toBe(COLLECTION_INTERVAL_MS);
    expect(pollIntervalMs(60)).toBe(COLLECTION_INTERVAL_MS);
  });

  it('격자보다 느린 사업장은 그만큼 느리게 묻는다', () => {
    expect(pollIntervalMs(600)).toBe(600_000);
  });
});

describe('intervalLabel — 초와 분을 가른다', () => {
  it('1분 미만은 초로 적는다 — `0.08분`이라 적을 수는 없다', () => {
    expect(intervalLabel(5)).toBe('5초');
    expect(intervalLabel(30)).toBe('30초');
  });

  it('나누어떨어지면 분으로 적는다', () => {
    expect(intervalLabel(60)).toBe('1분');
    expect(intervalLabel(600)).toBe('10분');
  });

  it('나누어떨어지지 않으면 초로 남긴다', () => {
    expect(intervalLabel(90)).toBe('90초');
  });
});

/** 격자 시각 5칸 */
const END_MS = Math.floor(Date.UTC(2026, 8, 16, 3, 0) / COLLECTION_INTERVAL_MS) * COLLECTION_INTERVAL_MS;
const GRID = buildGrid(END_MS, 5);

function windowOf(raw: TbTimeseries, intervalMs: number) {
  return toTelemetryWindow(raw, GRID, 100_000, SITE, intervalMs);
}

describe('격자에 얹기 — 주기가 달라도 표시 격자는 흔들리지 않는다', () => {
  /**
   * 5초는 60초를 나누어떨어뜨리므로 칸 시각에 표본이 **그대로 있다.** 이때는 예전과 똑같이
   * 정확히 같은 시각만 본다 — 허용오차를 켜면 두절 구간의 빈 칸을 옆 표본으로 메운다(**E4**).
   */
  it('5초로 와도 칸마다 그 시각의 값이 앉는다', () => {
    const pHOut = GRID.flatMap((ts) =>
      Array.from({ length: 12 }, (_, i) => ({ ts: ts + i * 5_000, value: 7 + i / 100 })),
    );
    const { points } = windowOf({ pHOut }, 5_000);

    expect(points).toHaveLength(GRID.length);
    /* 칸 시각의 표본은 i=0 이라 7.00이다 — 12개 중 그것이 앉는다 */
    expect(points.map((p) => p.pH)).toEqual(GRID.map(() => 7));
  });

  /** 5초로 와도 **빠진 칸은 빈 채로 남는다.** 옆 표본이 메우면 두절이 사라진다 */
  it('5초 사업장의 두절 칸을 옆 표본으로 메우지 않는다', () => {
    const pHOut = GRID.flatMap((ts, index) =>
      index === 2 ? [] : Array.from({ length: 12 }, (_, i) => ({ ts: ts + i * 5_000, value: 7 })),
    );
    const { points } = windowOf({ pHOut }, 5_000);

    expect(points[2]!.pH).toBeNull();
  });

  /**
   * 90초처럼 나누어떨어지지 않으면 칸 시각과 겹치는 표본이 거의 없다. 그때만 가까운 표본을
   * 끌어온다 — 그러지 않으면 **값이 오고 있는데도 화면이 통째로 결측이 된다.**
   */
  it('나누어떨어지지 않는 주기는 가까운 표본을 얹는다', () => {
    const pHOut = GRID.map((ts, index) => ({ ts: ts + (index % 2 === 0 ? 0 : 20_000), value: 8 }));
    const { points } = windowOf({ pHOut }, 90_000);

    expect(points.every((p) => p.pH === 8)).toBe(true);
  });

  /** 끌어오는 거리는 주기의 절반까지다. 그 밖이면 정렬 문제가 아니라 진짜 결측이다 */
  it('주기의 절반보다 멀리 떨어진 표본은 끌어오지 않는다', () => {
    const pHOut = [{ ts: GRID[0]! + 44_000, value: 8 }];
    const { points } = windowOf({ pHOut }, 90_000);

    expect(points[0]!.pH).toBe(8);

    const far = [{ ts: GRID[0]! + 46_000, value: 8 }];
    expect(windowOf({ pHOut: far }, 90_000).points[0]!.pH).toBeNull();
  });
});

/**
 * **꼬리 — 수집 주기에 맞춰 화면이 움직인다** `[사용자 요청 2026-09-16]`.
 *
 * 격자의 마지막 칸은 분 경계라 최대 2분까지 묵는다. 5초로 보내는 사업장에서는 그동안
 * 스물네 점이 버려지고, 전체 창을 다시 받아도 **화면은 한 글자도 바뀌지 않는다**(실측).
 * 그래서 최신 한 점만 따로 받아 마지막 칸에 앉힌다.
 */
describe('newestSample — 가장 새로운 표본 한 점', () => {
  const T = Date.UTC(2026, 8, 16, 5, 3, 55);

  it('계열마다 마지막 시각이 달라도 **가장 새로운 한 시각**의 값만 모은다', () => {
    const sample = newestSample({
      pHOut: [{ ts: T - 5_000, value: 7 }, { ts: T, value: 8.31 }],
      /* 이 계열은 5초 뒤처져 있다 — 그 값을 끌어오면 서로 다른 시각이 한 줄에 앉는다 */
      DOOut: [{ ts: T - 5_000, value: 1.2 }],
    });

    expect(sample).not.toBeNull();
    expect(sample!.epochMs).toBe(T);
    expect(sample!.values.pH).toBe(8.31);
    expect(sample!.values.DO).toBeNull();
  });

  it('한 점도 없으면 null이다 — 없는 «지금 값»을 지어내지 않는다', () => {
    expect(newestSample({})).toBeNull();
    expect(newestSample({ pHOut: [] })).toBeNull();
  });

  it('방류 플래그는 0을 `false`로 옮긴다 — 없는 것과 가르기 위해서다', () => {
    expect(newestSample({ discharging: [{ ts: T, value: 0 }] })!.discharging).toBe(false);
    expect(newestSample({ discharging: [{ ts: T, value: 1 }] })!.discharging).toBe(true);
    expect(newestSample({ pHOut: [{ ts: T, value: 7 }] })!.discharging).toBeNull();
  });
});

/**
 * **「다시 시도」가 꼬리까지 덮어야 한다** `[사용자 요청 2026-09-16: 검토]`.
 *
 * 검토에서 실제로 걸린 결함이다 — 꼬리 키를 `['telemetry-tail', …]`이라 손으로 적었더니
 * 접두가 달라 무효화가 비껴갔고, 「다시 시도」를 눌러도 **창만 새로 받고 꼬리는 옛 값으로
 * 남았다.** 화면에서는 «눌렀는데 현재값이 그대로»로 보인다.
 */
describe('계측 쿼리 키', () => {
  /** TanStack 의 접두 매칭 — 앞에서부터 원소가 같으면 덮인다 */
  const covers = (prefix: readonly unknown[], key: readonly unknown[]) =>
    prefix.every((part, i) => JSON.stringify(part) === JSON.stringify(key[i]));

  it('창과 꼬리가 둘 다 「다시 시도」의 접두 키에 덮인다', () => {
    expect(covers(TELEMETRY_KEY_PREFIX, telemetryQueryKey('S-10'))).toBe(true);
    expect(covers(TELEMETRY_KEY_PREFIX, telemetryTailQueryKey('S-10'))).toBe(true);
  });

  /** 꼬리가 창을 덮어써서도 안 된다 — 둘은 다른 자료다 */
  it('창과 꼬리가 서로 다른 키다', () => {
    expect(telemetryQueryKey('S-10')).not.toEqual(telemetryTailQueryKey('S-10'));
  });

  it('사업장이 다르면 키도 다르다', () => {
    expect(telemetryTailQueryKey('S-10')).not.toEqual(telemetryTailQueryKey('S-02'));
  });
});
