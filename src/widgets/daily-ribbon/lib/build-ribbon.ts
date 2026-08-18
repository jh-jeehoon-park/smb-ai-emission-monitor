import { TIMELINE_POINT_COUNT } from '@/shared/lib/timeline';

/**
 * 리본 한 칸의 상태.
 *
 * **`unknown`은 `off`와 다르다.** 수신하지 못한 구간을 "꺼져 있었다"로 칠하면 없는 사실을
 * 주장하게 된다 — 결측을 0으로 그리지 않는 것과 같은 이유다(E4).
 */
export type RibbonState = 'on' | 'off' | 'unknown';

/** 같은 상태가 이어지는 구간. 표본마다 사각형을 그리면 288개가 쌓인다 */
export interface RibbonRun {
  state: RibbonState;
  /** 시작 표본 인덱스 */
  from: number;
  /** 표본 개수 */
  length: number;
}

/**
 * 표본별 상태를 구간으로 묶는다(런렝스).
 *
 * 상태가 바뀌는 지점에서만 끊으므로, 하루 종일 방류한 사업장은 사각형 하나가 된다.
 */
export function toRuns(states: readonly RibbonState[]): RibbonRun[] {
  const runs: RibbonRun[] = [];

  for (let i = 0; i < states.length; i += 1) {
    const state = states[i]!;
    const last = runs[runs.length - 1];

    if (last && last.state === state) last.length += 1;
    else runs.push({ state, from: i, length: 1 });
  }

  return runs;
}

/**
 * `boolean | null`을 리본 상태로 옮긴다.
 *
 * `isDischargingAt`처럼 **모름을 null로 돌려주는** 판정을 그대로 받기 위한 것이다.
 * 여기서 `null`을 `off`로 접으면 그 판정이 애써 지킨 구분이 화면 직전에 사라진다.
 */
export function toState(value: boolean | null): RibbonState {
  if (value === null) return 'unknown';
  return value ? 'on' : 'off';
}

/** 값이 있으면 가동으로 본다 — 전류계가 도는 동안이 가동이다(`[데이터셋 …/04_…]` 전류계위치=유입펌프) */
export function runningState(current: number | null): RibbonState {
  if (current === null) return 'unknown';
  return current > 0 ? 'on' : 'off';
}

/**
 * 켜져 있던 표본 수. **하루 내내 모름이면 0이 아니라 `null`이다.**
 *
 * 통신이 끊긴 사업장에 "방류 0시간"이라고 적으면 방류가 없었다는 사실 주장이 된다 —
 * 결측을 0으로 그리지 않는 것과 같은 이유다(E4). 리포트의 `countDischargeHours`도
 * 같은 규칙을 쓴다.
 *
 * 일부만 모름이면 **확인된 수**를 돌려준다. 부풀리는 것보다 적게 잡히는 편이 안전하다.
 */
export function countOnSamples(runs: readonly RibbonRun[]): number | null {
  if (runs.length > 0 && runs.every((run) => run.state === 'unknown')) return null;
  return runs.reduce((acc, run) => (run.state === 'on' ? acc + run.length : acc), 0);
}

export interface AlarmMarker {
  id: string;
  index: number;
  priority: string;
  title: string;
  timeIso: string;
}

/**
 * 리본이 다루는 표본 수는 시간축과 **같아야 한다.**
 * 어긋나면 네 행의 같은 x가 서로 다른 시각을 가리켜, 겹쳐 보는 목적 자체가 무너진다.
 */
export function assertFullDay(states: readonly RibbonState[], label: string): void {
  if (states.length !== TIMELINE_POINT_COUNT) {
    throw new Error(`리본 '${label}' 표본 ${states.length}개 — ${TIMELINE_POINT_COUNT}개여야 한다`);
  }
}
