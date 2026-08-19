import { PRIORITY_BY_LEVEL } from '../config/constants';
import type { Alarm } from '../model/types';

/**
 * 알람은 **등급**을 들고, 우선순위는 `PRIORITY_BY_LEVEL`로 파생한다.
 *
 * 예전에는 우선순위를 직접 들었다 — 대응 규칙이 원문에 없어(`INC-02`) 파생할 수 없었기
 * 때문이다. **2026-08-19 사용자 확인으로 추정 매핑을 쓰기로 했다.** 파생으로 바꾸면 등급과
 * 우선순위가 어긋날 수 없고, 확정 답변이 오면 매핑 한 곳만 고치면 된다.
 *
 * 등급 배정은 알람 내용에 맞췄다 — 기준 초과 예상·이상 점수 급상승은 `위험`, 복합 패턴은
 * `경고`, 상관 이탈·전류 이상은 `주의`, 통신 두절·변동폭 확대는 사건 통지라 `정상`이다.
 */
const ALARM_SOURCE: Omit<Alarm, 'priority'>[] = [
  {
    id: 'A-2481',
    siteId: 'S-02',
    level: 'warning',
    condition: 'anomaly',
    siteName: '구미 염색 2공장',
    title: '복합 이상 패턴 탐지',
    detail: 'TOC 상승과 DO 저하가 동시에 진행. 기여 변수 상위 2개가 상관 이탈.',
    raisedAtIso: '2026-08-11T14:12:00Z',
    state: 'open',
  },
  {
    id: 'A-2480',
    siteId: 'S-02',
    level: 'critical',
    condition: 'pollutionSurge',
    siteName: '구미 염색 2공장',
    title: 'TOC 급변 — 6시간 내 배출기준 초과 예상',
    detail: 'LSTM 예측 상한이 47 mg/L. 약품 주입량 사전 조정 권장.',
    raisedAtIso: '2026-08-11T14:05:00Z',
    state: 'open',
  },
  {
    id: 'A-2479',
    siteId: 'S-07',
    level: 'critical',
    condition: 'anomaly',
    siteName: '평택 도금 A라인',
    title: '이상 점수 급상승 — 도금 폐수 유입 의심',
    detail: '최근 2시간 EC·탁도가 동반 상승. 전처리 공정 점검 필요.',
    raisedAtIso: '2026-08-11T13:52:00Z',
    state: 'open',
  },
  {
    id: 'A-2478',
    siteId: 'S-07',
    level: 'caution',
    condition: 'equipment',
    siteName: '평택 도금 A라인',
    title: '폭기 블로워 전류 이상 패턴',
    detail: '정상 운전 패턴에서 벗어난 전류 파형이 반복 관측됨.',
    raisedAtIso: '2026-08-11T13:41:00Z',
    state: 'acknowledged',
  },
  {
    id: 'A-2477',
    siteId: 'S-05',
    level: 'caution',
    condition: 'qualityShift',
    siteName: '포항 화학 1공장',
    title: 'pH-EC 상관 이탈',
    detail: '개별 항목은 정상 범위이나 항목 간 관계가 학습 패턴에서 벗어남.',
    raisedAtIso: '2026-08-11T13:20:00Z',
    state: 'acknowledged',
  },
  {
    id: 'A-2476',
    siteId: 'S-04',
    level: 'normal',
    condition: 'equipment',
    siteName: '안동 식품 B동',
    title: 'ECP 통신 두절 — 로컬 저장 전환',
    detail: '13:35 이후 수신 없음. 복구 시 로컬 7일 버퍼가 일괄 전송된다.',
    raisedAtIso: '2026-08-11T13:36:00Z',
    state: 'open',
  },
  {
    id: 'A-2475',
    siteId: 'S-10',
    level: 'normal',
    condition: 'qualityShift',
    siteName: '광주 전자부품 세정',
    title: '탁도 주간 변동폭 확대',
    detail: '최근 12시간 변동폭이 기준 대비 1.6배.',
    raisedAtIso: '2026-08-11T11:58:00Z',
    state: 'resolved',
  },
];

/** 우선순위는 등급에서 나온다 — 둘을 따로 적으면 어긋날 수 있다 `[INC-02]` */
export const ALARMS: Alarm[] = ALARM_SOURCE.map((alarm) => ({
  ...alarm,
  priority: PRIORITY_BY_LEVEL[alarm.level],
}));


/**
 * 한 사업장의 알람만 최신순으로 준다.
 *
 * 이전에는 인자를 받고도 전 사업장을 돌려주며 선택 사업장만 위로 올렸다. 이 함수를 쓰는
 * 곳은 셋 다 **단일 사업장 분석 옆의 "관련 알람" 패널**이라, 남의 사업장이 섞이면
 * 운영자에게도 오독이다. 전 사업장 목록은 알람 이력 화면(SCR-OP-007)이 맡는다.
 */
export function getAlarmsForView(siteId: string): Alarm[] {
  return ALARMS.filter((a) => a.siteId === siteId).sort((a, b) =>
    b.raisedAtIso.localeCompare(a.raisedAtIso),
  );
}

export function countOpenAlarms(siteId: string): number {
  return ALARMS.filter((a) => a.state === 'open' && a.siteId === siteId).length;
}

/**
 * 전 사업장 미확인 수. **이름으로 범위를 드러낸다** — 무인자 호출로 전 사업장을 세면
 * 호출부만 보고는 의도인지 실수인지 알 수 없다. 통합 관제(운영자 전용)가 쓴다.
 */
export function countOpenAlarmsAcrossSites(): number {
  return ALARMS.filter((a) => a.state === 'open').length;
}

/** 사업장 카드에 표시할 미확인 알람 수 */
export function openAlarmCountBySite(): Record<string, number> {
  return ALARMS.reduce<Record<string, number>>((acc, a) => {
    if (a.state === 'open') acc[a.siteId] = (acc[a.siteId] ?? 0) + 1;
    return acc;
  }, {});
}

/** siteId를 주면 그 사업장만, 주지 않으면 전 사업장을 센다 */
export function countByPriority(
  state: Alarm['state'] = 'open',
  siteId?: string,
): Record<string, number> {
  return ALARMS.filter((a) => a.state === state && (!siteId || a.siteId === siteId)).reduce<
    Record<string, number>
  >((acc, a) => {
    acc[a.priority] = (acc[a.priority] ?? 0) + 1;
    return acc;
  }, {});
}

/**
 * 사업장별 이상 탐지 알람 건수. 상태를 가리지 않는다 — **탐지되었는가**가 기준이고
 * 확인·조치 여부는 다른 질문이다. 설비 이상은 세지 않는다(수질 사고 예방과 다른 축).
 */
export function countAnomalyAlarms(siteId: string): number {
  return ALARMS.filter((a) => a.siteId === siteId && a.condition === 'anomaly').length;
}
