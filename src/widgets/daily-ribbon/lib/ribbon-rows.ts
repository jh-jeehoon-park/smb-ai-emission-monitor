import { TIMELINE_POINT_COUNT, isDischargingAt, isMissingAt, timelineIndexAt } from '@/shared/lib/timeline';
import type { Alarm } from '@/entities/alarm';
import type { AnomalyPoint } from '@/entities/anomaly';
import {
  assertFullDay,
  toRuns,
  toState,
  type AlarmMarker,
  type RibbonRun,
} from './build-ribbon';

export interface RibbonData {
  /**
   * **화면에 행으로 그리지 않는다** `[사용자 요청 2026-09-08]` — 상태 띠 셋이 걷혔다.
   * 남은 쓰임은 판독줄의 `방류 N시간` 하나이고, `가동`은 읽는 곳이 없어져 함께 뺐다.
   */
  discharging: RibbonRun[];
  /** 두절 구간의 빗금과 아래 마스킹이 읽는다. 값이 없다는 사실 자체가 정보다(**E4**) */
  receiving: RibbonRun[];
  /** 표본별 이상 점수. 결측은 null이라 선을 끊는다(E4) */
  scores: (number | null)[];
  alarms: AlarmMarker[];
}

/**
 * 네 축을 **하나의 시간축 위에** 올린다.
 *
 * 이 위젯이 존재하는 이유가 여기 있다 — 지금 이 값들은 화면 여러 곳에 흩어져 있어
 * "이상이 튄 그 시각에 방류 중이었나, 설비는 돌았나"를 답하려면 타임스탬프를 눈으로
 * 맞춰야 한다. 사업장이 하나인 사업장 역할은 겹쳐 볼 수 있고, 겹쳐야 의미가 생긴다.
 *
 * **entities를 직접 잇지 않는다**(FSD §8). 각 slice가 만든 값을 받아 여기서 조합한다.
 */
/**
 * **계측 계열을 더는 받지 않는다** `[사용자 요청 2026-09-08]`. `가동` 행이 걷히면서 이 함수가
 * `useSiteSeries`에서 읽던 유일한 값(`point.current`)이 없어졌다 — 지금 이 리본이 쓰는 것은
 * 이상 점수(`anomaly`)·시연 시나리오(`isMissingAt`·`isDischargingAt`)·알람뿐이다.
 *
 * 그래서 **첫 응답을 기다릴 이유도 없어졌다** — 부르는 쪽의 `pending` 관문과 스켈레톤을
 * 함께 걷었다(자세한 이유는 `SCR-AD-003` §3.1).
 */
export function buildRibbon(
  siteId: string,
  anomaly: AnomalyPoint[],
  alarms: Alarm[],
): RibbonData {
  /**
   * 수신 행의 두 상태는 **수신됨 / 모름**이다. `off`를 쓰지 않는다 —
   * 결측은 "받았는데 값이 꺼져 있었다"가 아니라 **그 시각을 모른다**는 뜻이고,
   * `off`(중립면)로 칠하면 방류 중단 같은 '아는 꺼짐'과 같은 색이 된다.
   */
  const receiving = Array.from({ length: TIMELINE_POINT_COUNT }, (_, i) =>
    toState(isMissingAt(siteId, i) ? null : true),
  );

  /**
   * **수신하지 못한 시각의 방류는 모름이다** `[사용자 지적 2026-09-08]`(**E4**).
   *
   * 화면이 한때 세 줄로 서로 모순된 말을 했다 — `수신`은 끊겼다는데 바로 위 `가동`은 그
   * 구간 내내 **가동 중이라 주장**했다. 두 줄이 다른 원천에서 오기 때문이다: 가동은
   * 계측 서버의 전류(실측)에서, 수신·방류는 시연 시나리오에서 온다. 실서버에는 그
   * 시나리오의 두절이 없으므로 전류가 계속 흘렀다.
   *
   * 어느 원천이 옳은지를 여기서 정하지 않는다 — **모른다고 적는 것**이 두 원천이 어긋날 때의
   * 유일하게 맞는 답이다. 받지 못한 시각의 상태를 아는 방법은 없다.
   *
   * **행은 걷혔지만 마스킹은 남는다** `[사용자 요청 2026-09-08]` — 판독줄의 `방류 N시간`이
   * 이 값을 세므로, 못 받은 시간을 방류로 세면 그 숫자가 부풀려진다.
   */
  const discharging = Array.from({ length: TIMELINE_POINT_COUNT }, (_, i) =>
    receiving[i] === 'unknown' ? 'unknown' : toState(isDischargingAt(siteId, i)),
  );

  assertFullDay(discharging, '방류');
  assertFullDay(receiving, '수신');

  return {
    discharging: toRuns(discharging),
    receiving: toRuns(receiving),
    scores: anomaly.map((point) => point.score),
    /* 시간축 밖에서 올라온 알람은 찍지 않는다. 양 끝으로 몰면 없던 시각에 표식이 생긴다 */
    alarms: alarms.flatMap((alarm) => {
      const index = timelineIndexAt(alarm.raisedAtIso);
      if (index === null) return [];

      return [
        {
          id: alarm.id,
          index,
          priority: alarm.priority,
          title: alarm.title,
          timeIso: alarm.raisedAtIso,
        },
      ];
    }),
  };
}
