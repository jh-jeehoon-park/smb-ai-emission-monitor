import { MEASUREMENT_ITEMS, type MeasurementItemCode } from '@/shared/config/measurement';

/** 표시 기준 시간대. 모든 시각 표기에 함께 노출한다(E5). */
export const DISPLAY_TIMEZONE = 'KST';

/**
 * 결측은 null로 들어온다. 0으로 대체하면 배출량 급감으로 오독된다(E4).
 * 화면에서는 값 대신 '—'를 보여준다.
 */
export function formatValue(code: MeasurementItemCode, value: number | null): string {
  if (value === null || Number.isNaN(value)) return '—';
  return value.toFixed(MEASUREMENT_ITEMS[code].decimals);
}

export function formatWithUnit(code: MeasurementItemCode, value: number | null): string {
  const item = MEASUREMENT_ITEMS[code];
  const text = formatValue(code, value);
  if (text === '—') return text;
  return item.unit ? `${text} ${item.unit}` : text;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 고정 오프셋으로 다룬다 — 시연 데이터가 KST 기준으로 생성되어 있다. */
export function formatClock(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** 날짜만. 회차 목록처럼 시각이 의미 없는 자리에 쓴다 */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(
    d.getUTCHours(),
  )}:${pad(d.getUTCMinutes())}`;
}

const KST = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  // hour12:false는 구현에 따라 자정을 '24'로 준다. h23으로 못박아 '00'을 보장한다
  hourCycle: 'h23',
});

/**
 * 브라우저가 어느 시간대에 있든 KST 벽시계로 옮긴다.
 *
 * 위 포맷터들과 달리 **실제 시간대 변환을 한다.** 시연 데이터의 ISO는 이미 KST 값이라
 * UTC 게터로 그대로 읽으면 되지만, 현재 시각은 사용자의 시간대를 따라 들어오기 때문이다.
 * 화면 전체가 KST 표기를 쓰므로(E5) 여기만 로컬 시간대를 따르면 한 화면에 두 기준이 섞인다.
 */
export function formatKstDateTime(date: Date): string {
  const p = Object.fromEntries(KST.formatToParts(date).map((part) => [part.type, part.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

/**
 * 실 계측의 epoch 밀리초를 이 저장소의 시각 표기로 옮긴다.
 *
 * **`Z`가 붙지만 UTC가 아니다.** 위 포맷터들(`formatClock`·`formatDateTime`…)이 UTC 게터로
 * 읽으므로, 그 자리에 들어갈 문자열은 **KST 벽시계 값**이어야 한다 — 시연 데이터가 처음부터
 * 그 관례로 쓰여 있다(`shared/config/demo.ts`).
 *
 * 실 epoch을 그대로 `toISOString()`하면 화면이 **9시간 어긋난 값에 KST 라벨**을 붙인다.
 * 관례를 지키는 자리를 여기 하나로 모아 두어, 서버에서 온 시각은 반드시 이 함수를 지난다.
 */
export function kstIsoFromEpoch(epochMs: number): string {
  return `${formatKstDateTime(new Date(epochMs)).replace(' ', 'T')}Z`;
}

const KST_WALL_CLOCK = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: 'numeric',
  day: 'numeric',
  weekday: 'short',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  // h12는 자정을 '0시'로 준다. hourCycle을 못박아 '12시'를 보장한다
  hourCycle: 'h12',
});

/**
 * 사람이 시계를 볼 때의 표기 — `8월 20일 (목) 오전 10:17:56`.
 *
 * `formatKstDateTime`과 **쓰임이 다르다.** 그쪽은 데이터의 시각을 적는 자리라 정렬·대조가
 * 되게 `YYYY-MM-DD HH:MM:SS`를 쓴다. 이쪽은 헤더의 현재 시각이라 연을 빼고 월·일·요일과
 * 오전/오후로 적는다 `[사용자 요청 2026-08-20]`. **초는 남긴다** — 시계가 살아 있다는 것을
 * 초가 보여 준다 `[사용자 요청 2026-08-20]`.
 *
 * 조각을 직접 이어 붙인다 — 로케일이 정하는 순서(`8. 20. 목`)에 맡기면 요구한 형식과 달라진다.
 */
export function formatKstWallClock(date: Date): string {
  const p = Object.fromEntries(
    KST_WALL_CLOCK.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return `${p.month}월 ${p.day}일 (${p.weekday}) ${p.dayPeriod} ${p.hour}:${p.minute}:${p.second}`;
}

export function formatRelative(iso: string, nowIso: string): string {
  const diffMin = Math.round((new Date(nowIso).getTime() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return '방금';
  if (diffMin < 60) return `${diffMin}분 전`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}
