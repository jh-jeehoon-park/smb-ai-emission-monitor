import { formatDate } from '@/shared/lib/format';
import type { Alarm } from '@/entities/alarm';

export interface AlarmDayGroup {
  /** `YYYY-MM-DD`. 그룹의 키이자 정렬 기준이다 */
  date: string;
  /** 화면에 적는 이름 — `오늘`·`어제`·`M월 D일` */
  label: string;
  alarms: Alarm[];
}

/** 하루가 몇 밀리초인가. 날짜 문자열을 빼서 세므로 시간대 변환은 하지 않는다 */
const DAY_MS = 86_400_000;

function dayLabel(date: string, today: string): string {
  if (date === today) return '오늘';

  const diff = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / DAY_MS);
  if (diff === 1) return '어제';

  const [, month, day] = date.split('-');
  return `${Number(month)}월 ${Number(day)}일`;
}

/**
 * 알람 이력을 **하루 단위로 묶는다** `[사용자 지시 2026-08-25]`.
 *
 * 16건이 한 덩어리로 이어지면 "언제 일어난 일인가"를 줄마다 다시 읽어야 한다. 이력의 첫
 * 질문은 시점이므로 날짜가 목록의 위계를 만든다 — 그룹 머리가 날짜를, 줄이 그 안의 사건을 맡는다.
 *
 * **정렬은 하지 않는다.** 들어온 순서(최신 순)를 그대로 유지하며 경계에서만 끊는다 —
 * 여기서 다시 정렬하면 호출한 쪽이 정한 순서와 조용히 어긋난다.
 *
 * 날짜는 `formatDate`(표시 기준 시간대)를 쓴다. `Date`의 로컬 날짜로 끊으면 화면에 적힌
 * 시각과 그룹이 어긋나는 시간대가 생긴다(E5).
 */
export function groupAlarmsByDay(alarms: readonly Alarm[], nowIso: string): AlarmDayGroup[] {
  const today = formatDate(nowIso);
  const groups: AlarmDayGroup[] = [];

  for (const alarm of alarms) {
    const date = formatDate(alarm.raisedAtIso);
    const last = groups[groups.length - 1];
    if (last && last.date === date) {
      last.alarms.push(alarm);
      continue;
    }
    groups.push({ date, label: dayLabel(date, today), alarms: [alarm] });
  }

  return groups;
}
