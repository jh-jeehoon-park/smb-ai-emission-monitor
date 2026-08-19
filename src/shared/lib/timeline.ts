import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { COLLECTION_INTERVAL_MINUTES, HISTORY_WINDOW_HOURS } from '@/shared/config/measurement';
import { getScenario } from '@/shared/config/demo-scenario';
import { clamp } from '@/shared/lib/prng';

/**
 * 시연 데이터의 공통 시간축. 계측·이상점수 등 여러 slice가 같은 축을 써야 하는데
 * slice끼리 직접 참조하면 안 되므로(FSD horizontal import 금지) 여기에 둔다.
 */
export const TIMELINE_POINT_COUNT = (HISTORY_WINDOW_HOURS * 60) / COLLECTION_INTERVAL_MINUTES;

/** 마지막 3시간(36표본)에 심어 둔 이상 상황 구간 */
export const EVENT_START_INDEX = TIMELINE_POINT_COUNT - 36;

/** 통신 두절 구간의 길이(표본 수). 약 55분 */
const OUTAGE_LENGTH = 11;

export function timelineIsoAt(index: number): string {
  const end = new Date(DEMO_NOW_ISO).getTime();
  const stepMs = COLLECTION_INTERVAL_MINUTES * 60_000;
  return (
    new Date(end - (TIMELINE_POINT_COUNT - 1 - index) * stepMs).toISOString().slice(0, 19) + 'Z'
  );
}

/** 시각을 표본 인덱스로 되돌린다. 알람처럼 시각만 가진 값을 시간축에 얹을 때 쓴다 */
export function timelineIndexAt(iso: string): number {
  const stepMs = COLLECTION_INTERVAL_MINUTES * 60_000;
  const back = Math.round((new Date(DEMO_NOW_ISO).getTime() - new Date(iso).getTime()) / stepMs);
  return clamp(TIMELINE_POINT_COUNT - 1 - back, 0, TIMELINE_POINT_COUNT - 1);
}

export interface OutageWindow {
  fromIso: string;
  toIso: string;
}

/**
 * 사업장마다 결측 구간이 다르다. 통신이 끊긴 사업장은 전 구간이 결측이고,
 * 잠시 끊겼던 사업장은 해당 구간만 비어 있다. 계측과 이상 점수가 같은 판정을 써야
 * 한 화면에서 모순이 생기지 않는다(E4).
 */
export function isMissingAt(siteId: string, index: number): boolean {
  const scenario = getScenario(siteId);
  if (!scenario.online) return true;
  if (scenario.outageStartOffset === null) return false;

  const start = TIMELINE_POINT_COUNT - scenario.outageStartOffset;
  return index >= start && index < start + OUTAGE_LENGTH;
}

const SAMPLES_PER_HOUR = 60 / COLLECTION_INTERVAL_MINUTES;

/**
 * 그 시각에 방류하고 있었는가.
 *
 * **모르면 `false`가 아니라 `null`이다.** 통신이 끊긴 구간은 방류 여부를 수신하지 못한
 * 것이지 방류가 없었던 것이 아니다. `false`로 적으면 "방류 안 했다"는 사실 주장이 되어,
 * 결측을 0으로 그리는 것과 같은 거짓말이 된다(E4).
 *
 * 이 판정이 왜 여기 있는지는 `isMissingAt`과 같다 — 리포트·알람·공정이 모두 써야 하는데
 * slice끼리 직접 참조할 수 없다(FSD 수평 import 금지).
 */
export function isDischargingAt(siteId: string, index: number): boolean | null {
  if (isMissingAt(siteId, index)) return null;

  const gap = getScenario(siteId).dischargeGap;
  if (!gap) return true;

  const start = TIMELINE_POINT_COUNT - gap.startOffset;
  return !(index >= start && index < start + gap.hours * SAMPLES_PER_HOUR);
}

/**
 * 그 시각 **방지시설이 멈춰 있었는가**.
 *
 * 판정 대상은 유입펌프 전류다 — 실증 데이터의 전류계가 거기 달려 있다
 * (`docs/datasets/…/04_…` 전류계위치=유입펌프). 계측값이 아니라 시나리오 구간으로 정하고,
 * 계측 fixture가 이 구간에서 전류·전력을 0으로 만든다. **판정과 그림이 한 원천에서 나온다.**
 *
 * 모르면 `null`이다(E4) — 수신하지 못한 시간을 "돌고 있었다"로도 "멈췄다"로도 적지 않는다.
 */
export function isTreatmentIdleAt(siteId: string, index: number): boolean | null {
  if (isMissingAt(siteId, index)) return null;

  const window = getScenario(siteId).idleDischargeWindow;
  if (!window) return false;

  const start = TIMELINE_POINT_COUNT - window.startOffset;
  return index >= start && index < start + window.hours * SAMPLES_PER_HOUR;
}

/**
 * 최근 `window` 표본 중 방류가 **확인된** 시간.
 *
 * 결측 표본은 세지 않는다 — 그래서 통신이 잠시 끊겼던 사업장은 값이 조금 적게 나온다.
 * 부풀리는 것보다 적게 나오는 편이 안전하다. 모자란 만큼은 리포트의 `결측 표본` 열이 설명한다.
 *
 * 전 구간이 두절이면 셀 것이 없다 — 0시간이 아니라 **모름**이다.
 */
export function countDischargeHours(siteId: string, window: number): number | null {
  if (!getScenario(siteId).online) return null;

  const from = Math.max(0, TIMELINE_POINT_COUNT - window);
  let samples = 0;
  for (let i = from; i < TIMELINE_POINT_COUNT; i += 1) {
    if (isDischargingAt(siteId, i)) samples += 1;
  }
  return samples / SAMPLES_PER_HOUR;
}

/** 화면에 "언제 끊겼는지"를 적기 위한 구간. 두절 이력이 없으면 null */
export function getOutageWindow(siteId: string): OutageWindow | null {
  const scenario = getScenario(siteId);
  if (!scenario.online || scenario.outageStartOffset === null) return null;

  const start = TIMELINE_POINT_COUNT - scenario.outageStartOffset;
  return {
    fromIso: timelineIsoAt(start),
    toIso: timelineIsoAt(start + OUTAGE_LENGTH - 1),
  };
}
