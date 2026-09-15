import type { StatusLevel } from '@/shared/config/provisional';
import { PRIORITY_BY_LEVEL } from '../config/constants';
import type { Alarm } from '../model/types';

/**
 * 처리 판정에 필요한 만큼의 계측 정보.
 *
 * **`entities/measurement`를 import하지 않는다** — 같은 레이어끼리는 참조하지 않는다(FSD §8).
 * 필요한 모양만 선언하고 **호출부가 값을 넣어 준다.** `EquipmentAlarmInput`과 같은 구조다.
 *
 * `changePercent`가 `null`이면 **한쪽이라도 모르는 것**이다 — 여기서 다시 계산하지 않는다.
 * 계산식을 두 곳에 두면 화면과 알람이 다른 판정을 낸다.
 */
export interface TreatmentRowInput {
  code: string;
  label: string;
  /** 유입 대비 변화율(%). 부호를 살린다 — 폭기가 올리는 DO는 양의 방향이다 */
  changePercent: number | null;
  /** 이 항목에 «유사 = 처리 미흡»이 성립하는가 `[TBD-59]` */
  similar: boolean;
}

/**
 * 유사 항목 수 → 등급.
 *
 * **새 등급 축을 만들지 않는다.** `PROVISIONAL_STATUS_LEVELS` 넷을 그대로 쓰고 우선순위는
 * `PRIORITY_BY_LEVEL`로 파생시킨다 — 알람이 자기 우선순위를 직접 쓰면 등급과 어긋나는 길이
 * 다시 열린다 `[INC-02]`.
 *
 * 경계는 판정 대상 5종 위에서 잡았다 — 하나면 잡음일 수 있고, 절반을 넘으면 공정 전체가
 * 멈춘 정황이다. **원문 근거가 없다** `[TBD-59]`.
 */
const LEVEL_BY_SIMILAR_COUNT: readonly { atLeast: number; level: StatusLevel }[] = [
  { atLeast: 4, level: 'critical' },
  { atLeast: 3, level: 'warning' },
  { atLeast: 1, level: 'caution' },
];

/**
 * **유입과 유출이 거의 같으면 처리가 안 된 것이다** `[회의 2026-09-08: 유입·유출에 동일한
 * 센서를 달아 … 동일할 시 공정 처리 과정 중 문제가 있는 것]` `[사용자 요청 2026-09-10]`.
 *
 * 폐수가 공정을 지나며 수질이 개선되어야 하는데 나갈 때도 그대로라면 공정 어딘가가 일을
 * 하지 않은 것이다. **물의 양은 이것을 말하지 않는다** — 들어온 만큼 나가는 것은 정상이다.
 *
 * **사업장마다 하나로 묶는다.** 항목마다 알람을 내면 한 번의 정체가 다섯 줄이 되어 목록이
 * 그 사업장으로 덮인다 — 사용자가 봐야 하는 것은 «이 사업장의 공정이 멈췄다» 한 가지다.
 * 그래서 id도 사업장당 하나이고, 확인 처리가 항목이 늘 때마다 풀리지 않는다.
 *
 * **근거가 없으면 만들지 않는다**(**E4**). 두절이면 `changePercent`가 전부 `null`로 와서
 * 유사 항목이 0이 되고 알람이 서지 않는다 — «판정 불가»를 «정상»으로 바꾸지 않기 위해
 * 화면이 그 사실을 따로 적는다.
 */
export function buildTreatmentAlarms(
  siteId: string,
  siteName: string,
  rows: readonly TreatmentRowInput[],
  raisedAtIso: string | null,
): Alarm[] {
  const judged = rows.filter((row) => row.changePercent !== null);
  const similar = judged.filter((row) => row.similar);
  if (similar.length === 0) return [];

  const level =
    LEVEL_BY_SIMILAR_COUNT.find((band) => similar.length >= band.atLeast)?.level ?? 'caution';

  return [
    {
      /* 사업장마다 하나 — 항목이 늘고 줄어도 같은 알람이라 확인 처리가 유지된다 */
      id: `TRA-${siteId}`,
      siteId,
      siteName,
      level,
      priority: PRIORITY_BY_LEVEL[level],
      condition: 'treatmentStall',
      title: `${similar.map((row) => row.label).join(' · ')} 유입과 거의 같음`,
      detail:
        `판정 대상 ${judged.length}개 항목 중 ${similar.length}개가 유입값과 거의 같습니다. ` +
        `공정 처리 단계를 확인해 주십시오. 유사 판정 기준은 우리가 정한 임시값입니다.`,
      /* 언제부터인가를 모르면 지금 시각을 쓰지 않는다 — 방금 시작된 것으로 읽힌다 */
      raisedAtIso: raisedAtIso ?? DETECTION_TIME_UNKNOWN,
      /* 상태 이력 저장소가 없어 확인·조치 이력을 만들 수 없다(REQ-AD-019 미구현) */
      state: 'open',
    },
  ];
}

/**
 * 탐지 시각을 모를 때 쓰는 값. `build-equipment-alarms.ts`와 같은 규약이다 —
 * 지금 시각을 넣으면 방금 탐지된 것으로 읽혀 목록 맨 위로 올라간다(E4).
 */
const DETECTION_TIME_UNKNOWN = '1970-01-01T00:00:00Z';
