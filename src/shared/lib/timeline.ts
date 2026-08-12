import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { COLLECTION_INTERVAL_MINUTES, HISTORY_WINDOW_HOURS } from '@/shared/config/measurement';
import { getScenario } from '@/shared/config/demo-scenario';

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
