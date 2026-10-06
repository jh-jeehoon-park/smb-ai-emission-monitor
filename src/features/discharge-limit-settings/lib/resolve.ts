import { DISCHARGE_LIMITS, type DischargeLimitTable } from '@/shared/config/discharge-limits';
import type { MeasurementItemCode } from '@/shared/config/measurement';
import { DEMO_NOW_ISO } from '@/shared/config/demo';
import {
  REGULATORY_RULES,
  resolveDischargeStandard,
  userLimitSource,
  type RegulatoryRule,
  type ResolvedStandard,
  type SiteRegulatoryProfile,
} from '@/entities/regulation';
import { UNRESOLVED_REASONS } from '../config/constants';
import { sheetsToRules } from './sheets-to-rules';
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
 * 그 사업장에 적용되는 기준표.
 *
 * **속을 갈아 끼웠다 — 겉은 그대로다** `[사용자 요청 2026-09-28: 설정 재설계 검토]`.
 *
 * 한때 이 함수가 «정적 표 위에 시연값을 얹고 그 위에 사용자 값을 덮는» 세 겹을 직접 쌓았다.
 * 그 방식은 **«왜 이 값인가»를 남기지 못했고**, 겹치는 순서가 이 파일 하나에만 있어
 * 사업장별 차이·방류 경로·시행일 같은 축을 넣을 자리가 없었다.
 *
 * 지금은 **규정(Rule) + 사업장 사실관계(Profile)를 Resolver에 넣은 결과**를 옛 표 모양으로
 * 옮겨 담는다. 화면 여덟이 이 함수의 반환을 쓰므로 **시그니처를 그대로 두는 것이 이 단계의
 * 요점이다** — 위젯을 하나도 고치지 않고 판정의 출처가 바뀐다. 기존 검사 22건이 그대로
 * 동치 증명이 된다(통과하면 옛 동작이 보존된 것이다).
 *
 * **순수 함수다.** localStorage도 React도 모른다 — 서버가 생기면 그대로 서버로 간다.
 *
 * 다음 단계에서 소비처가 `ResolvedStandard`를 직접 받게 되면 이 어댑터는 사라진다 —
 * 그때 잃는 것이 `trace`이므로, 옮기기 전까지는 이 표가 **값만** 나른다는 것을 알고 쓴다.
 */
export function resolveLimitTable(
  sheets: LimitSheets | null,
  classification: SiteClassification,
  updatedIso: string | null,
): ResolvedLimits {
  const userRules = sheetsToRules(sheets, classification, updatedIso);
  const rules: RegulatoryRule[] = [...REGULATORY_RULES, ...userRules];
  const profile = profileFrom(classification);

  const table: DischargeLimitTable = {};
  for (const code of codesOf(rules)) {
    table[code] = toLimit(
      code,
      resolveDischargeStandard({ profile, rules, pollutantCode: code, asOf: DEMO_NOW_ISO }),
      updatedIso,
    );
  }

  return {
    table,
    unresolvedReason: reasonFor(classification, userRules, table),
    isUserSet: userRules.length > 0,
  };
}

/**
 * 표에 담을 항목.
 *
 * **옛 표의 키를 반드시 포함한다** — `DISCHARGE_LIMITS`에 있던 네 항목이 빠지면 화면이
 * 「기준 대상 아님」과 「기준을 모른다」를 구별하지 못한다(둘 다 `undefined`가 된다).
 * 거기에 규정이 다루는 항목을 더한다.
 */
function codesOf(rules: readonly RegulatoryRule[]): MeasurementItemCode[] {
  const codes = new Set(Object.keys(DISCHARGE_LIMITS) as MeasurementItemCode[]);
  for (const rule of rules) codes.add(rule.pollutantCode);
  return [...codes];
}

/**
 * **분류가 프로필이 된다.** 사업장 규제정보 탭이 채우는 값이 그대로 사실관계다.
 *
 * `siteId`는 비운다 — 이 함수는 «지금 고른 사업장»의 표를 만들고 그 id는 부르는 쪽이 알며,
 * 표에는 실리지 않는다.
 */
function profileFrom(classification: SiteClassification): SiteRegulatoryProfile {
  return {
    siteId: '',
    regionGrade: classification.regionGrade,
    dailyWastewaterM3: classification.dailyWastewaterM3,
    dischargeRoute: classification.dischargeRoute,
    receivingFacilityId: null,
    industryCodes: null,
    facilityCodes: null,
    dischargedPollutants: null,
    hazardousPollutants: null,
    specialAreaCodes: null,
    evidence: [],
    verificationStatus: classification.regionGrade ? 'SELF_REPORTED' : 'UNVERIFIED',
  };
}

/**
 * 산출 결과를 옛 표 한 칸으로.
 *
 * **`unavailableReason`이 «판정할 수 없다»의 자리다.** 값이 있어도 법정 판정이 아닌 경우는
 * 그 필드가 아니라 `basis`가 말한다 — 둘을 겹치면 시연값이 판정 자격을 함께 얻는다
 * (그 결함으로 화면이 「기준보다 높음」을 적었다).
 */
function toLimit(
  code: MeasurementItemCode,
  standard: ResolvedStandard,
  updatedIso: string | null,
) {
  const citation =
    standard.trace.find((entry) => entry.outcome === 'DECISIVE')?.reason ??
    DISCHARGE_LIMITS[code]?.source ??
    '—';

  switch (standard.status) {
    case 'RESOLVED':
    case 'PROVISIONAL':
      return {
        min: standard.min,
        max: standard.max,
        /* 사용자가 넣은 값은 화면이 이미 알던 문구로 적는다 — 출처 칸이 판본마다 갈리면 안 된다 */
        source: standard.decisiveRuleId?.startsWith('RULE-USER-')
          ? userLimitSource(updatedIso)
          : citation,
        unavailableReason: null,
        basis: standard.status === 'RESOLVED' ? ('legal' as const) : ('provisional' as const),
      };
    case 'NOT_APPLICABLE':
      return {
        min: null,
        max: null,
        source: citation,
        unavailableReason: '이 사업장 이 항목은 적용 대상이 아닙니다',
        basis: 'legal' as const,
      };
    case 'CONFLICT':
      return {
        min: null,
        max: null,
        source: citation,
        unavailableReason: '규정이 서로 다른 값을 줍니다 — 어느 쪽이 우선인지 근거가 없습니다',
        basis: 'legal' as const,
      };
    default:
      return {
        min: null,
        max: null,
        source: DISCHARGE_LIMITS[code]?.source ?? '—',
        unavailableReason:
          DISCHARGE_LIMITS[code]?.unavailableReason ?? UNRESOLVED_REASONS.noItem,
        basis: 'legal' as const,
      };
  }
}

/**
 * **무엇을 해야 하는가**가 셋 다 다르다 — 사업장 분류를 고르는 것, 그 조합의 기준치를 넣는 것,
 * 남은 항목을 채우는 것.
 */
function reasonFor(
  classification: SiteClassification,
  userRules: readonly RegulatoryRule[],
  table: DischargeLimitTable,
): string | null {
  if (!classification.regionGrade || !classification.dischargeScale) {
    return UNRESOLVED_REASONS.noClassification;
  }
  if (userRules.length === 0) return UNRESOLVED_REASONS.noSheet;

  /* 법정 근거를 얻지 못한 항목이 남아 있으면 전부 됐다고 적지 않는다 */
  const stillMissing = Object.values(table).some(
    (limit) => limit && (limit.unavailableReason !== null || limit.basis !== 'legal'),
  );
  return stillMissing ? UNRESOLVED_REASONS.noItem : null;
}
