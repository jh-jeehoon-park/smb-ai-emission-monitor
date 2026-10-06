import { PROVISIONAL_STALE_SAMPLES } from '@/shared/config/provisional';
import { COLLECTION_INTERVAL_MINUTES } from '@/shared/config/measurement';

/** 한 표본의 방류 여부. **모르면 `null`이다** — `false`로 적으면 사실 주장이 된다(E4) */
export interface DischargeSample {
  t: string;
  discharging: boolean | null;
}

export interface DischargeBand {
  fromIso: string;
  toIso: string;
}

/**
 * **방류를 멈춘 구간**을 이어 붙인다 — 차트 배경 밴드가 된다.
 *
 * `null`(두절)은 밴드에 넣지 않는다. 멈춘 것과 못 본 것은 다르고, 못 본 구간에 `방류 중단`
 * 밴드를 깔면 확인되지 않은 시간을 확인된 사실로 만든다(**E4**). 두절은 두절 밴드가 맡는다.
 *
 * 그래서 `false — null — false`는 **두 구간**이지 하나가 아니다. 이어 붙이면 그 사이의
 * 모름이 지워진다.
 */
export function idleBands(samples: DischargeSample[]): DischargeBand[] {
  const bands: DischargeBand[] = [];
  let open: DischargeBand | null = null;

  for (const sample of samples) {
    if (sample.discharging === false) {
      if (open) open.toIso = sample.t;
      else open = { fromIso: sample.t, toIso: sample.t };
      continue;
    }
    if (open) {
      bands.push(open);
      open = null;
    }
  }
  if (open) bands.push(open);

  return bands;
}

export interface DischargeRun {
  /** 마지막 표본의 상태. `null`이면 수신이 없다 */
  discharging: boolean | null;
  /** 그 상태가 이어진 시간(분). 상태를 모르면 `null` */
  minutes: number | null;
  /** 그 상태가 시작된 시각. 상태를 모르면 `null` · 창 전체가 같은 상태면 `null` */
  sinceIso: string | null;
  /**
   * **창 첫 표본까지 같은 상태였는가.** 그렇다면 언제 시작됐는지 **알 수 없다** — 창 밖은
   * 보이지 않는다. 화면이 `~부터`라 적지 않게 하는 신호다.
   */
  fromWindowStart: boolean;
}

/**
 * **지금 상태와 그것이 이어진 시간.**
 *
 * 뒤에서부터 같은 상태가 몇 표본이나 이어졌는지 센다.
 *
 * **창 전체가 같은 상태면 시작 시각을 내지 않는다**(`sinceIso: null`). 그 경우 창의 첫
 * 표본은 24시간 전이라 시:분만 적으면 **어제 시각을 오늘처럼** 말하게 되고, 애초에 언제
 * 시작됐는지는 창 밖이라 알 수 없다 — `~부터`는 확인되지 않은 주장이 된다. 실제로 그렇게
 * 적었다가 `금일 배출 현황`이 `14:25부터`(= 어제 14:25)라 말했다 `[사용자 요청 2026-08-28]`.
 * 지속 시간은 그대로 낸다 — `24시간`은 **창 길이**이지 사실을 넘겨 말하는 것이 아니다.
 */
export function currentRun(samples: DischargeSample[]): DischargeRun {
  /*
   * **마지막 한 칸이 비었다고 두절이 아니다** `[사용자 지적 2026-09-01]`. 격자의 가장 최근
   * 칸은 그 시각의 표본이 아직 도착하지 않은 순간이 늘 있다 — fixture는 모든 칸을 채우므로
   * 드러나지 않았고, 이 화면이 계측 서버로 옮겨 오자 정상 방류 중인 사업장이 주기마다
   * `통신 두절`로 깜빡였다. 계측 쪽이 같은 함정을 `isReceptionStalled`로 이미 좁혀 두었고
   * (명세 §4.5의 비활성 기준 = 수집 주기 × 3) 여기서도 같은 폭만큼 꼬리를 건너뛴다.
   *
   * **꼬리를 «건너뛰는» 것이지 «채우는» 것이 아니다.** 그 폭을 넘겨 비어 있으면 그대로
   * 두절이고, 전 구간 결측도 그대로 참이다 — 좁힌 것은 한 칸짜리 깜빡임뿐이다(E4).
   */
  const tail = samples.slice(-PROVISIONAL_STALE_SAMPLES);
  const stalled = tail.length > 0 && tail.every((sample) => sample.discharging === null);

  let end = samples.length - 1;
  if (!stalled) while (end >= 0 && samples[end]!.discharging === null) end -= 1;

  const last = stalled ? undefined : samples[end];
  if (!last || last.discharging === null) {
    return { discharging: null, minutes: null, sinceIso: null, fromWindowStart: false };
  }

  let count = 0;
  let sinceIso = last.t;
  for (let i = end; i >= 0; i -= 1) {
    const sample = samples[i]!;
    if (sample.discharging !== last.discharging) break;
    count += 1;
    sinceIso = sample.t;
  }

  const fromWindowStart = count === end + 1;
  return {
    discharging: last.discharging,
    minutes: count * COLLECTION_INTERVAL_MINUTES,
    sinceIso: fromWindowStart ? null : sinceIso,
    fromWindowStart,
  };
}
