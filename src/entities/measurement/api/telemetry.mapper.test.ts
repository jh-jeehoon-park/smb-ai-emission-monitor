import { describe, expect, it } from 'vitest';
import type { TbTimeseries } from '@/shared/api/thingsboard';
import { COLLECTION_INTERVAL_MINUTES } from '@/shared/config/measurement';
import { formatClock, formatDateTime } from '@/shared/lib/format';
import {
  EQUIPMENT_SERIES_CODES,
  ESTIMATE_SERIES_CODES,
  RECEIVED_SERIES_CODES,
  WATER_SERIES_CODES,
  SERIES_CODES,
  UNRECEIVED_SERIES_CODES,
} from '../config/constants';
import {
  COLLECTION_INTERVAL_MS,
  TELEMETRY_KEYS,
  buildGrid,
  gridRange,
  toTelemetryWindow,
  unreceivedCodes,
} from './telemetry.mapper';

const LIMIT = 1500;
const POINTS = 5;

/** 격자에 정확히 얹히는 시각 하나를 기준으로 잡는다 */
const END_MS = Math.floor(Date.UTC(2026, 7, 27, 5, 20) / COLLECTION_INTERVAL_MS) * COLLECTION_INTERVAL_MS;
const grid = buildGrid(END_MS, POINTS);

const at = (index: number) => grid[index]!;

function raw(overrides: TbTimeseries): TbTimeseries {
  return overrides;
}

describe('buildGrid — 격자를 먼저 만들고 채운다', () => {
  it('표본 수만큼 만들고 수집 주기 간격으로 놓는다', () => {
    expect(grid).toHaveLength(POINTS);
    expect(at(1) - at(0)).toBe(COLLECTION_INTERVAL_MINUTES * 60_000);
  });

  it('격자가 수집 주기에 정렬된다 — 정렬되지 않으면 표본이 칸에 얹히지 않는다', () => {
    for (const ts of grid) expect(ts % COLLECTION_INTERVAL_MS).toBe(0);
  });

  /** `[startTs, endTs)` 반열림이라 끝을 그대로 주면 최신 1점이 사라진다 (명세 §4.4) */
  it('조회 구간의 끝이 마지막 표본보다 한 주기 뒤다', () => {
    const { startTs, endTs } = gridRange(grid);
    expect(startTs).toBe(at(0));
    expect(endTs).toBe(at(POINTS - 1) + COLLECTION_INTERVAL_MS);
  });
});

describe('toTelemetryWindow — 결측 규약(E4)', () => {
  it('값이 없는 칸은 null이다 — 0으로 채우지 않는다', () => {
    const { points } = toTelemetryWindow(raw({ pH: [{ ts: at(2), value: '7.11' }] }), grid, LIMIT);

    expect(points.map((p) => p.pH)).toEqual([null, null, 7.11, null, null]);
  });

  /**
   * 명세 §6.4 — 방지시설 미가동 구간의 전류 0은 **측정된 사실**이다. 결측으로 바꾸면
   * 무단방류 의심 판정이 사라진다.
   */
  it('값 0과 값 없음을 가른다', () => {
    const { points } = toTelemetryWindow(
      raw({ current: [{ ts: at(0), value: '0' }] }),
      grid,
      LIMIT,
    );

    expect(points[0]!.current).toBe(0);
    expect(points[1]!.current).toBeNull();
  });

  /** 키마다 타임스탬프 집합이 다르다. 순서대로 zip하면 밀린다 (명세 §6.2) */
  it('키마다 다른 시각에 값이 와도 각자 제 칸에 얹힌다', () => {
    const { points } = toTelemetryWindow(
      raw({
        pH: [{ ts: at(0), value: '7.0' }],
        TOC: [{ ts: at(3), value: '3.5' }],
      }),
      grid,
      LIMIT,
    );

    expect(points[0]!.pH).toBe(7.0);
    expect(points[0]!.TOC).toBeNull();
    expect(points[3]!.pH).toBeNull();
    expect(points[3]!.TOC).toBe(3.5);
  });

  it('숫자로 읽히지 않는 값은 null이다 — NaN을 흘려보내지 않는다', () => {
    const { points } = toTelemetryWindow(
      raw({ pH: [{ ts: at(0), value: '' }, { ts: at(1), value: null }] }),
      grid,
      LIMIT,
    );

    expect(points[0]!.pH).toBeNull();
    expect(points[1]!.pH).toBeNull();
  });

  /**
   * 유량 둘만 서버 이름이 다르다(`flowIn`·`flowOut`). 우리 이름을 서버에 맞춰 바꾸지 않고
   * 매퍼가 잇는다 — 서버 채널 이름이 화면 계약이 되면 저쪽이 바꿀 때마다 전 화면이 깨진다.
   */
  it('flowIn·flowOut이 우리 이름으로 얹힌다', () => {
    const { points } = toTelemetryWindow(
      raw({ flowIn: [{ ts: at(0), value: '430' }], flowOut: [{ ts: at(0), value: '412' }] }),
      grid,
      LIMIT,
    );

    expect(points[0]!.inflow).toBe(430);
    expect(points[0]!.flow).toBe(412);
  });

  /** 옛 5분 채널이다. 1분 백필과 섞여 5분 배수 시각에만 옛 값이 남아 있어 쓰지 않는다 */
  it('옛 flow 채널은 읽지 않는다', () => {
    const { points } = toTelemetryWindow(raw({ flow: [{ ts: at(0), value: '999' }] }), grid, LIMIT);

    expect(points[0]!.flow).toBeNull();
  });
});

describe('toTelemetryWindow — 방류는 서버가 주는 채널이다', () => {
  it('1은 방류 중, 0은 방류 아님, 없으면 모름이다', () => {
    const { discharging } = toTelemetryWindow(
      raw({ discharging: [{ ts: at(0), value: '1' }, { ts: at(1), value: '0' }] }),
      grid,
      LIMIT,
    );

    expect(discharging.slice(0, 3)).toEqual([true, false, null]);
  });
});

describe('toTelemetryWindow — 잘림 방어', () => {
  /** 명세 §4.4 — limit을 넘으면 에러가 아니라 200으로 조용히 잘린다 */
  it('응답 개수가 limit과 같으면 잘린 것으로 본다', () => {
    const full = grid.map((ts) => ({ ts, value: '7' }));

    expect(toTelemetryWindow(raw({ pH: full }), grid, POINTS).truncated).toBe(true);
    expect(toTelemetryWindow(raw({ pH: full }), grid, POINTS + 1).truncated).toBe(false);
  });
});

describe('시각 표기 — 화면 포맷터가 KST로 읽는다', () => {
  /**
   * 이 저장소의 시각 문자열은 **KST 벽시계 값에 `Z`가 붙은 것**이다. 실 epoch을 그대로
   * `toISOString()`하면 화면이 9시간 어긋난 값에 KST 라벨을 붙인다.
   */
  it('실 epoch이 KST 벽시계로 찍힌다', () => {
    const { points } = toTelemetryWindow(raw({}), grid, LIMIT);
    const kst = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(at(0)));

    expect(formatClock(points[0]!.t)).toBe(kst);
    expect(formatDateTime(points[0]!.t)).not.toContain('NaN');
  });
});

describe('요청 키는 사전에서만 만든다', () => {
  /** 없는 키를 물으면 에러가 아니라 유령 표본이 온다 (명세 §7.1) */
  it('서버에 없는 채널을 요청하지 않는다', () => {
    const keys = TELEMETRY_KEYS.split(',');

    /* 우리 이름이 아니라 **서버 이름**으로 물어야 한다 */
    expect(keys).toContain('flowIn');
    expect(keys).toContain('flowOut');
    expect(keys).not.toContain('inflow');
    expect(keys).not.toContain('flow');
    expect(keys).not.toContain('vibration');
    expect(keys).toContain('discharging');
  });

  it('한 점도 오지 않은 계열을 미수신으로 센다', () => {
    expect(unreceivedCodes(raw({ pH: [{ ts: at(0), value: '7' }] }))).toContain('TOC');
    expect(unreceivedCodes(raw({ pH: [{ ts: at(0), value: '7' }] }))).toContain('inflow');
    expect(unreceivedCodes(raw({ pH: [{ ts: at(0), value: '7' }] }))).not.toContain('pH');
  });
});

/**
 * **두 목록의 합이 곧 계열 전부여야 한다.**
 *
 * 어느 쪽에도 없는 계열은 매퍼가 손대지 않아 `MeasurementPoint`의 그 칸이 `undefined`로 남는다 —
 * 타입은 `number | null`이라 소비처가 `=== null`로 걸러도 통과하고, 병합 뒤 실제로 그 상태였다.
 * 그동안 이 불변식은 `constants.ts`의 산문뿐이었다. `UNRECEIVED_SERIES_CODES`가 비면서
 * (수위 채널이 도착했다 `[사용자 확인 2026-09-07]`) 그 산문이 가리키던 예시도 사라져,
 * 여기서 값으로 못박는다.
 */
describe('계열이 빠짐없이 갈린다', () => {
  it('수신 목록과 미수신 목록의 합이 SERIES_CODES와 같다', () => {
    const covered = [...RECEIVED_SERIES_CODES, ...UNRECEIVED_SERIES_CODES];

    expect([...covered].sort()).toEqual([...SERIES_CODES].sort());
    /* 양쪽에 겹쳐 있으면 매퍼가 null로 덮은 뒤 값을 얹거나 그 반대가 된다 */
    expect(new Set(covered).size).toBe(covered.length);
  });

  /** 수위는 백엔드 요청이 반영되어 서버에서 온다 — fixture로 메우던 자리가 아니다 */
  it('수위가 서버 계열이다', () => {
    expect(RECEIVED_SERIES_CODES).toContain('level');
    expect(TELEMETRY_KEYS.split(',')).toContain('level');
  });

  /**
   * **TN·TP를 서버에서 받는다** `[사용자 요청 2026-09-08]`.
   *
   * **이 검사는 뒤집힌 것이다.** 하루 전까지 정반대를 지켰다 `[사용자 확인 2026-09-07]` —
   * *"서버에 채널이 있고 값도 오지만 화면 표출을 위해 넣어 둔 것이고, 이 사업의 주된 목적은
   * 그 둘을 AI로 예측하는 것이다. 계측 계열로 올리면 예측 대상이 계측값으로 둔갑해 과제의
   * 성과 지표가 화면에서 사라진다(E3)."*
   *
   * 그 걱정은 그대로 옳고, 막는 자리가 바뀌었다. **프로토타입에서는 화면에 값이 그려지는
   * 것이 1순위**이고 AI 소프트 센싱은 과제 성공 이후다 — 값을 안 받으면 오염도 추정 화면이
   * 내장 생성값을 그리는데, 그쪽이 오히려 **«직접 계측»이라 적고 있었다.** 받아 오는 편이
   * 더 정직하다.
   *
   * 대신 **두 자리가 대신 막는다**: 아래 검사가 수질 필터·격자에 오르지 못하게 하고,
   * 화면은 원천을 `AI 산출 예정`으로 적는다(`entities/prediction`의 `SeriesOrigin`).
   */
  it('TN·TP를 서버에 물어본다', () => {
    const keys = TELEMETRY_KEYS.split(',');

    expect(keys).toContain('TN');
    expect(keys).toContain('TP');
  });

  /**
   * **그래도 «수질 계측»은 아니다.** `WATER_SERIES_CODES`가 계측 격자의 `수질 8종`과 시계열
   * 화면의 필터를 만든다 — 여기 오르면 요청하지 않은 화면 넷이 그 둘을 계측으로 그리고(**A2**),
   * 위 주석이 걱정하던 «예측 대상이 계측값으로 둔갑»이 실제로 일어난다.
   */
  it('수질 필터·격자에는 오르지 않는다', () => {
    expect(WATER_SERIES_CODES).not.toContain('TN');
    expect(WATER_SERIES_CODES).not.toContain('TP');
    expect(EQUIPMENT_SERIES_CODES).not.toContain('TN');
    expect(EQUIPMENT_SERIES_CODES).not.toContain('TP');
    expect(ESTIMATE_SERIES_CODES).toEqual(['TN', 'TP']);
  });
});
