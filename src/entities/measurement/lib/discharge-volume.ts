import { COLLECTION_INTERVAL_MINUTES } from '@/shared/config/measurement';
import type { MeasurementPoint } from '../model/types';

const MINUTES_PER_DAY = 24 * 60;

/**
 * 그 시각이 속한 날의 자정(ISO).
 *
 * 시연 데이터의 ISO는 **이미 KST 벽시계 값**이라(`format.ts`) 앞 10자를 그대로 잘라 쓴다 —
 * 시간대 변환을 한 번 더 하면 자정이 아홉 시간 밀린다.
 */
function midnightOf(iso: string): string {
  return `${iso.slice(0, 10)}T00:00:00Z`;
}

export interface DailyDischargeVolume {
  /** 자정 이후 내보낸 양(m³). **셀 표본이 하나도 없으면 `null`이다 — `0`이 아니다** */
  volumeM3: number | null;
  /** 계산에 쓴 표본 수 */
  counted: number;
  /** 결측이라 뺀 표본 수 */
  missing: number;
  /** 셈이 시작된 시각(자정) */
  fromIso: string;
  /** 마지막으로 센 시각 */
  toIso: string;
}

/**
 * **금일 누적 배출량** — 자정부터 마지막 표본까지 내보낸 물의 양.
 *
 * `[원문 p.1]`이 `배출 데이터`(유량·수위·방류 여부)의 활용 목적을 *"배출량 및 부하량 산정
 * 기반 데이터"* 라 규정한다. 이 함수가 그중 배출량 쪽이다 `[사용자 요청 2026-08-28]`.
 *
 * ```
 * 누적[m³] = Σ ( flow_i [m³/day] × 수집주기[분] / 1440 )
 * ```
 *
 * **`금일`이 계산을 정한다.** 시연 시간축은 마지막 표본에서 뒤로 24시간이라, 그대로 더하면
 * `금일 누적`에 **어제 값이 섞인다.** 자정에서 자른다 — 그 구간은 24시간 창 안에 있어 셈이
 * 성립한다.
 *
 * **결측은 빼고 몇 개를 뺐는지 남긴다**(**E4**). 빼기만 하면 얼마나 비었는지 알 수 없고,
 * `0`으로 채우면 "그동안 안 내보냈다"는 사실 주장이 된다. 전 구간이 결측이면 `0 m³`이 아니라
 * **모름**이다 — 부르는 쪽이 `수신 없음`이라 적는다.
 *
 * **유량이 `0`인 표본은 뺀 것이 아니라 센 것이다.** 방류하지 않은 시간은 수신됐고 값이 0이다
 * (fixture가 `isDischargingAt`에 맞춰 0으로 만든다). 결측과 구분되어야 한다.
 */
export function dailyDischargeVolume(points: MeasurementPoint[]): DailyDischargeVolume {
  const last = points[points.length - 1];
  const fromIso = last ? midnightOf(last.t) : '';
  const perSample = COLLECTION_INTERVAL_MINUTES / MINUTES_PER_DAY;

  let sum = 0;
  let counted = 0;
  let missing = 0;
  let toIso = fromIso;

  for (const point of points) {
    if (point.t < fromIso) continue;
    if (point.flow === null) {
      missing += 1;
      continue;
    }
    sum += point.flow * perSample;
    counted += 1;
    toIso = point.t;
  }

  return {
    volumeM3: counted === 0 ? null : sum,
    counted,
    missing,
    fromIso,
    toIso,
  };
}

export interface CumulativePoint {
  t: string;
  /** 그 시각까지의 누적(m³). **결측 표본은 `null`이다** — 선을 끊어 그린다(E4) */
  m3: number | null;
}

/**
 * 위 누적을 **시각별로 펼친 것**. 차트가 이 계열을 그린다.
 *
 * **결측 표본에서 선을 끊는다**(`null`). 이어 그리면 그 구간에도 셈이 이어진 것처럼 보이는데,
 * 실제로는 못 본 시간이라 얼마가 나갔는지 모른다 — 총계가 그만큼 적게 잡히는 이유가 이
 * 끊긴 자리다. 이어진 뒤의 값은 **끊기기 전 누적에서 이어진다**(0으로 되돌아가지 않는다).
 *
 * 방류를 멈춘 구간은 유량이 0이라 계단이 평평해진다 — 끊긴 것과 눈으로 갈린다.
 */
export function dailyDischargeSeries(points: MeasurementPoint[]): CumulativePoint[] {
  const last = points[points.length - 1];
  if (!last) return [];

  const fromIso = midnightOf(last.t);
  const perSample = COLLECTION_INTERVAL_MINUTES / MINUTES_PER_DAY;
  let sum = 0;

  return points
    .filter((point) => point.t >= fromIso)
    .map((point) => {
      if (point.flow === null) return { t: point.t, m3: null };
      sum += point.flow * perSample;
      return { t: point.t, m3: sum };
    });
}
