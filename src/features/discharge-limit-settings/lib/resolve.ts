import { DISCHARGE_LIMITS, type DischargeLimitTable } from '@/shared/config/discharge-limits';
import type { MeasurementItemCode } from '@/shared/config/measurement';
import { UNRESOLVED_REASONS, userLimitSource } from '../config/constants';
import type { LimitSheets, SiteClassification } from './storage';

export interface ResolvedLimits {
  /** 소비처에 그대로 넘길 표. 정적 값과 사용자 값이 항목 단위로 섞인다 */
  table: DischargeLimitTable;
  /** 왜 아직 판정할 수 없는가. 전부 해결됐으면 `null` */
  unresolvedReason: string | null;
  /** 사용자가 넣은 값이 하나라도 쓰였는가. 화면이 출처를 다르게 적는 데 쓴다 */
  isUserSet: boolean;
}

/**
 * 사용자 설정을 정적 표 위에 얹는다.
 *
 * **항목 단위로 떨어진다** — 시트가 있어도 그 항목이 비어 있으면 그 항목만 정적 값을 쓴다.
 * 통째로 갈아치우면 사용자가 TOC만 넣은 순간 pH의 통상 범위(`5.8~8.6`)가 사라진다.
 *
 * pH는 정적 표에 값이 있는데도 **사용자 값이 이긴다** — `[공정자료 p.11]`이 "정확한 적용
 * 구간은 사업장 폐수배출시설 설치허가(신고)증에서 확인"이라 못박았고, 그 허가증은 사용자
 * 손에 있다. 우리 값은 "통상"이고 사용자 값은 그 사업장의 실제 기준이다.
 *
 * **순수 함수다.** localStorage도 React도 모른다 — 그래야 테스트가 쉽고 서버에서도 돈다.
 */
export function resolveLimitTable(
  sheets: LimitSheets | null,
  classification: SiteClassification,
  updatedIso: string | null,
): ResolvedLimits {
  const { regionGrade, dischargeScale } = classification;

  /* 두 축 중 하나라도 없으면 어느 시트를 볼지 정할 수 없다. 오늘과 같은 상태다 */
  if (!regionGrade || !dischargeScale) {
    return {
      table: DISCHARGE_LIMITS,
      unresolvedReason: UNRESOLVED_REASONS.noClassification,
      isUserSet: false,
    };
  }

  const sheet = sheets?.[regionGrade]?.[dischargeScale];
  if (!sheet || Object.keys(sheet).length === 0) {
    return {
      table: DISCHARGE_LIMITS,
      unresolvedReason: UNRESOLVED_REASONS.noSheet,
      isUserSet: false,
    };
  }

  const table: DischargeLimitTable = { ...DISCHARGE_LIMITS };
  let used = false;

  for (const [code, entry] of Object.entries(sheet)) {
    if (!entry) continue;
    used = true;
    table[code as MeasurementItemCode] = {
      min: entry.min,
      max: entry.max,
      source: userLimitSource(updatedIso),
      /* 값이 들어왔으므로 판정할 수 있다. 이 필드가 `null`이 되는 것이 곧 "기준이 있다"다 */
      unavailableReason: null,
    };
  }

  /* 시트에 없는 항목이 남아 있으면 그 항목은 여전히 미확정이다 — 전부 됐다고 적지 않는다 */
  const stillMissing = Object.entries(table).some(
    ([, limit]) => limit && limit.unavailableReason !== null,
  );

  return {
    table,
    unresolvedReason: stillMissing ? UNRESOLVED_REASONS.noItem : null,
    isUserSet: used,
  };
}
