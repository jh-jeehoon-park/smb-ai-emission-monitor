import type { Alarm } from '../model/types';

/**
 * 우선순위는 상태 등급에서 자동으로 파생하지 않는다.
 * 등급 4단계와 우선순위 3단계의 대응 관계가 원문에 없기 때문이다(TBD-21).
 * 확정 전까지는 각 알람이 우선순위를 직접 들고 있는다.
 */
export const ALARMS: Alarm[] = [
  {
    id: 'A-2481',
    siteId: 'S-02',
    priority: 'urgent',
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
    priority: 'urgent',
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
    priority: 'urgent',
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
    priority: 'caution',
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
    priority: 'caution',
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
    priority: 'info',
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
    priority: 'info',
    condition: 'qualityShift',
    siteName: '광주 전자부품 세정',
    title: '탁도 주간 변동폭 확대',
    detail: '최근 12시간 변동폭이 기준 대비 1.6배.',
    raisedAtIso: '2026-08-11T11:58:00Z',
    state: 'resolved',
  },
];

/** 선택한 사업장의 알람을 위로 올린다. 전 사업장 목록이라는 성격은 유지한다 */
export function getAlarmsForView(siteId: string): Alarm[] {
  return [...ALARMS].sort((a, b) => {
    const aMine = a.siteId === siteId ? 0 : 1;
    const bMine = b.siteId === siteId ? 0 : 1;
    if (aMine !== bMine) return aMine - bMine;
    return b.raisedAtIso.localeCompare(a.raisedAtIso);
  });
}

export function countOpenAlarms(siteId?: string): number {
  return ALARMS.filter((a) => a.state === 'open' && (!siteId || a.siteId === siteId)).length;
}

/** 사업장 카드에 표시할 미확인 알람 수 */
export function openAlarmCountBySite(): Record<string, number> {
  return ALARMS.reduce<Record<string, number>>((acc, a) => {
    if (a.state === 'open') acc[a.siteId] = (acc[a.siteId] ?? 0) + 1;
    return acc;
  }, {});
}

export function countByPriority(state: Alarm['state'] = 'open'): Record<string, number> {
  return ALARMS.filter((a) => a.state === state).reduce<Record<string, number>>((acc, a) => {
    acc[a.priority] = (acc[a.priority] ?? 0) + 1;
    return acc;
  }, {});
}
