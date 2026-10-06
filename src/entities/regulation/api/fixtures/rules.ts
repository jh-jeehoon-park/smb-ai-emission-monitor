import { DISCHARGE_LIMITS } from '@/shared/config/discharge-limits';
import { PROVISIONAL_DEMO_LIMITS } from '@/shared/config/provisional';
import { MEASUREMENT_ITEMS, type MeasurementItemCode } from '@/shared/config/measurement';
import type { RegulatoryRule } from '../../model/types';

/**
 * **지금 우리가 손에 쥔 규정 전부다** `[사용자 요청 2026-09-28: 설정 재설계 검토]`.
 *
 * 두 원문 어디에도 배출허용기준 값이 없다 `[TBD-45]`. `[공정자료 p.11]`이 준 수치는 1일
 * 배출량 2,000㎥ 이상 사업장의 BOD·SS·COD뿐이고 **셋 다 우리 계측 항목이 아니다.**
 * 그래서 법정 규정은 **pH 한 줄**이고 나머지는 시연값이다.
 *
 * **법령 표를 지어내 채우지 않는다**(`README` §3.1의 «지어내지 않는 둘»). 지역구분별·
 * 규모별 시트를 우리가 만들면 화면은 그럴듯해지지만 값은 그냥 틀린 값이 된다. 대신
 * 구조에 **자리만 두고** 시연값으로 채운 뒤, 형태가 맞는지를 회의에서 먼저 묻는다
 * `[사용자 지적 2026-09-28: 화면은 mock으로 표출하고 적합도는 주기 회의에서 판별한다]`.
 */

/**
 * pH만 법정 판정을 한다.
 *
 * **`scope`가 비어 있다** — 지역·규모·경로를 가리지 않는다는 뜻이고, 이것이 `[공정자료 p.11]`이
 * 실제로 말한 바다(*"pH는 통상 5.8~8.6 범위가 널리 적용됩니다"*). 규모·지역별 시트가
 * 따로 있다는 서술은 **다른 항목들**에 대한 것이다.
 *
 * **`NATIONAL`로 두되 출처 문구가 한계를 적는다.** 원천 종류를 하나 더 만들지 않는 이유는
 * 이 한 줄 때문에 분류 체계를 늘리면 다음 사람이 그 분류의 뜻을 다시 추측하게 되기 때문이다 —
 * 한계는 분류가 아니라 `citation`이 말한다.
 */
const PH_RULE: RegulatoryRule = {
  id: 'RULE-PH-COMMON',
  pollutantCode: 'pH',
  source: 'NATIONAL',
  effect: 'BASE',
  comparator: 'RANGE',
  min: 5.8,
  max: 8.6,
  unit: MEASUREMENT_ITEMS.pH.unit,
  scope: {},
  /* 법령 원문을 갖고 있지 않아 시행일을 모른다 `[TBD-45]` */
  effectiveFrom: null,
  effectiveTo: null,
  /*
   * **화면이 이미 쓰는 문자열을 그대로 쓴다.** 규정의 근거 문구가 옛 표의 `source`와 갈리면
   * 두 경로가 같은 값을 내고도 **출처만 다르게 적는다** — 소비처를 옮길 때 그 차이가 화면에
   * 드러난다.
   */
  citation: DISCHARGE_LIMITS.pH!.source,
};

/**
 * 시연 규정의 근거 문구. **`법정 기준 아님`을 문구 안에 넣는다** — 화면이 이 문자열을 그대로
 * 보여 주므로 심사자가 값과 함께 그 사실을 읽는다.
 */
export const DEMO_LIMIT_SOURCE = '[시연 기본값] 법정 기준 아님 — 허가증 값을 넣으면 덮인다';

/** 사용자가 넣은 값의 근거 문구. 우리가 정한 값이 아니라 사용자가 넣은 값임을 밝힌다 */
export const userLimitSource = (updatedIso: string | null) =>
  updatedIso
    ? `[사용자 설정 ${updatedIso.slice(0, 10)}] 사업장 허가증 입력값`
    : '[사용자 설정] 사업장 허가증 입력값';

/**
 * 시연 임계값을 **규정의 한 줄로** 담는다.
 *
 * 값은 `PROVISIONAL_DEMO_LIMITS`가 정본이다 — 같은 숫자를 두 곳에 적으면 한쪽만 바뀐다
 * (임시값 규약: `PROVISIONAL_` 접두사는 `provisional.ts` 한 파일에만).
 *
 * `source: 'DEMO'`라 **법정 판정을 하지 않는다**(`resolveDischargeStandard`가 법정 규정이
 * 아무 답도 주지 못했을 때만 쓰고, 그때 상태는 `PROVISIONAL`이다).
 */
const DEMO_RULES: RegulatoryRule[] = Object.entries(PROVISIONAL_DEMO_LIMITS).map(
  ([code, entry]) => ({
    id: `RULE-DEMO-${code}`,
    pollutantCode: code as MeasurementItemCode,
    source: 'DEMO',
    effect: 'BASE',
    comparator: 'MAX',
    min: entry.min,
    max: entry.max,
    unit: MEASUREMENT_ITEMS[code as MeasurementItemCode].unit,
    scope: {},
    effectiveFrom: null,
    effectiveTo: null,
    citation: DEMO_LIMIT_SOURCE,
  }),
);

export const REGULATORY_RULES: readonly RegulatoryRule[] = [PH_RULE, ...DEMO_RULES];
