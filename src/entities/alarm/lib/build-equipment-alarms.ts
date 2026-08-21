import type { StatusLevel } from '@/shared/config/provisional';
import { PRIORITY_BY_LEVEL } from '../config/constants';
import type { Alarm } from '../model/types';

/**
 * 설비 알람을 만드는 데 필요한 만큼의 설비 정보.
 *
 * **`entities/equipment`를 import하지 않는다** — 같은 레이어끼리는 참조하지 않는다(FSD §8).
 * 대신 필요한 모양만 여기서 선언하고 **호출부가 값을 넣어 준다.** 기준표를 인자로 받는
 * `hasLimit(code, table)`, 계측 신호를 인자로 받는 `getOptimization(…, signals)`과 같은 구조다.
 *
 * `getEquipment()`의 반환값이 이 모양을 구조적으로 만족하므로 위젯은 그대로 넘기면 된다.
 */
export interface EquipmentAlarmInput {
  id: string;
  name: string;
  status: StatusLevel;
  /** 걸린 이상 신호의 라벨 — `진동 이상` 등. 비어 있으면 알람을 만들지 않는다 */
  signalLabels: readonly string[];
  anomalySinceIso: string | null;
  anomalyHours: number | null;
}

/**
 * 설비 이상을 알람으로 옮긴다.
 *
 * **회의가 요구한 것이다** — *"현실적으로 가능한 것은 설비에 진동 감지 센서 등을 부착하여
 * **이상 탐지를 통한 알림**, 각 설비의 on/off 가동 상태만 확인할 수 있음"* `[회의 2026-08-20]`.
 * 원문 화면 예시도 `10:15 송풍기-1 진동 이상 경고`를 알림 유형으로 든다 `[원문 발표 p.18 그림]`.
 *
 * **손으로 쓰지 않고 설비 상태에서 만든다** `[사용자 지적 2026-08-21]`. 손으로 쓴 알람은
 * 설비 카드와 어긋난다 — 실제로 열 사업장 중 두 곳에만 설비 알람이 있어서, 카드가
 * `진동 이상 · 3시간`을 띄우는데 `관련 알람`은 비어 있었다. 같은 사실을 두 곳에서 따로 쓰면
 * 반드시 갈린다(**E1**이 단위·자릿수에서 막으려는 것과 같은 부류다).
 *
 * **등급은 설비가 이미 갖고 있다.** `toEquipmentStatus`가 신호 수와 지속 시간으로 낸 값을
 * 그대로 쓰고, 우선순위는 `PRIORITY_BY_LEVEL`로 파생시킨다 — 알람이 자기 등급을 새로
 * 판정하면 같은 설비가 화면마다 다른 등급을 갖는다 `[INC-02]`.
 *
 * **정상 등급인 설비는 알람을 만들지 않는다.** 신호가 없으면 알릴 것이 없다 — 빈 알람을
 * 만들면 목록이 "탐지되었다"로 읽힌다(E4).
 */
export function buildEquipmentAlarms(
  siteId: string,
  siteName: string,
  equipment: readonly EquipmentAlarmInput[],
): Alarm[] {
  const alarms: Alarm[] = [];

  for (const item of equipment) {
    if (item.signalLabels.length === 0) continue;
    /* 신호가 있는데 등급이 정상이면 판정이 어긋난 것이다 — 그런 알람은 만들지 않는다 */
    if (item.status === 'normal') continue;

    const signals = item.signalLabels.join(' · ');
    const duration =
      item.anomalyHours === null
        ? '지속 시간을 알 수 없음 — 가동 상태 수신 없음'
        : `${item.anomalyHours}시간 이어짐`;

    alarms.push({
      /* 설비마다 하나다. 같은 설비의 알람이 둘이면 어느 쪽이 최신인지 알 수 없다 */
      id: `EQA-${siteId}-${item.id}`,
      siteId,
      siteName,
      level: item.status,
      priority: PRIORITY_BY_LEVEL[item.status],
      condition: 'equipment',
      title: `${item.name} ${signals}`,
      detail: `${duration}. 값의 크기는 내지 않는다 — 진동 센서 사양이 원문에 없다 [TBD-49].`,
      /* 언제부터인가를 알람 시각으로 쓴다 — 지금 시각을 쓰면 이상이 방금 시작된 것처럼 읽힌다 */
      raisedAtIso: item.anomalySinceIso ?? DETECTION_TIME_UNKNOWN,
      /* 상태 이력 저장소가 없어 확인·조치 이력을 만들 수 없다(REQ-AD-019 미구현) */
      state: 'open',
    });
  }

  return alarms.sort((a, b) => b.raisedAtIso.localeCompare(a.raisedAtIso));
}

/**
 * 탐지 시각을 모를 때 쓰는 값.
 *
 * 통신이 두절되면 이상이 언제 시작됐는지 알 수 없다. **지금 시각을 넣지 않는다** — 방금
 * 탐지된 것으로 읽히고 목록 맨 위로 올라간다. 아주 과거로 두어 맨 아래에 놓고, 상세 문구가
 * 지속 시간을 모른다고 적는다(E4).
 */
const DETECTION_TIME_UNKNOWN = '1970-01-01T00:00:00Z';
