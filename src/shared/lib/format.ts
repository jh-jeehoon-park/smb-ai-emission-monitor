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

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(
    d.getUTCHours(),
  )}:${pad(d.getUTCMinutes())}`;
}

export function formatRelative(iso: string, nowIso: string): string {
  const diffMin = Math.round((new Date(nowIso).getTime() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return '방금';
  if (diffMin < 60) return `${diffMin}분 전`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}
