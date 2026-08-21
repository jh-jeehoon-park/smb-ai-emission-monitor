import { STORAGE_KEYS } from '@/shared/config/storage';

export const LIMIT_STORAGE_KEY = STORAGE_KEYS.dischargeLimits;
export const CLASSIFICATION_STORAGE_KEY = STORAGE_KEYS.siteClassification;

/**
 * 기준치가 없는 이유. **셋을 구분한다** — 무엇을 해야 하는지가 다르다.
 *
 * 예전에는 `unavailableReason` 하나로 "표가 없다"만 말했다. 사용자가 설정할 수 있게 된
 * 지금은 "**당신이** 무엇을 해야 하는가"가 달라진다 — 사업장 분류를 고르는 것과 기준치를
 * 입력하는 것은 다른 일이다.
 */
export const UNRESOLVED_REASONS = {
  noClassification:
    '사업장의 지역구분·배출량 규모가 설정되지 않았습니다 — 사업장 설정에서 고르면 기준표를 적용합니다 [TBD-45]',
  noSheet:
    '이 지역구분·규모 조합의 기준치가 입력되지 않았습니다 — 사업장 설정에서 입력하면 초과를 판정합니다 [TBD-45]',
  noItem: '이 항목의 기준치가 입력되지 않았습니다 [TBD-45]',
} as const;

/**
 * 사용자가 입력한 값의 출처 표기.
 *
 * **`[사용자 설정]`으로 적는 이유**는 원문·공정자료와 구분하려는 것이다. 화면은 이 문자열을
 * 그대로 보여 주므로(`water-quality-grid`의 `title={limit.source}`) 심사자가 이 기준이 어디서
 * 왔는지 바로 안다 — 우리가 정한 값이 아니라 사용자가 넣은 값이다.
 */
export const userLimitSource = (updatedIso: string | null) =>
  updatedIso ? `[사용자 설정 ${updatedIso.slice(0, 10)}] 사업장 허가증 입력값` : '[사용자 설정] 사업장 허가증 입력값';
