'use client';

import { useMemo } from 'react';
import { DEMO_NOW_ISO } from '@/shared/config/demo';
import { LEGAL_CHECK_ITEMS } from '@/shared/config/discharge-limits';
import {
  REGULATORY_RULES,
  getRegulatoryProfile,
  resolveDischargeStandard,
  type SiteRegulatoryProfile,
  type StandardRow,
} from '@/entities/regulation';
import { useSelectedSiteId } from '@/features/site-selection';
import { sheetsToRules } from '../lib/sheets-to-rules';
import { classificationOf, useLimitSettingsStore } from './limit-settings-context';

/**
 * 지금 선택한 사업장의 **법정 점검 5항목**에 적용되는 기준 — 규정에서 산출한 값이다
 * `[사용자 요청 2026-09-28: 설정 재설계 검토]`.
 *
 * `useDischargeLimits()`와 **무엇이 다른가** — 그쪽은 항목별 숫자 표(`DischargeLimitTable`)를
 * 내고 이쪽은 **왜 그 값인지까지** 낸다(`ResolvedStandard.trace`). 지금은 이 화면 하나가
 * 쓰고, 나머지 소비처는 아직 그쪽이다 — 두 경로가 같은 답을 내는 것을 화면에서 확인한 뒤
 * 하나씩 옮긴다.
 *
 * **사용자가 설정 화면에서 넣은 값을 규정으로 함께 넣는다**(`sheetsToRules`). 넣지 않으면
 * 이 표만 fixture 규정을 보고 설정 화면의 입력을 무시해, **한 화면이 다른 화면과 다른
 * 진실을 말한다.**
 *
 * **`asOf`는 시연 기준 시각이다** — 이 저장소의 화면은 고정된 시점을 본다(`DEMO_NOW_ISO`).
 * 실제 시각을 읽으면 렌더마다 값이 달라져 하이드레이션이 어긋난다.
 */
export function useSiteStandards(): StandardRow[] {
  const store = useLimitSettingsStore();
  const { siteId } = useSelectedSiteId();

  return useMemo(() => {
    const classification = classificationOf(store, siteId);
    const rules = [
      ...REGULATORY_RULES,
      ...sheetsToRules(store.sheets, classification, store.updatedIso),
    ];
    /*
     * **사용자가 넣은 사실관계가 fixture를 덮는다** `[사용자 요청 2026-09-28: 설정 재설계 검토]`.
     *
     * fixture는 원문·현장조사에 없는 값을 전부 `null`로 두고, 사업장 규제정보 탭에서 채운
     * 것만 얹는다 — 서버가 생기면 이 병합이 그대로 서버 질의로 바뀐다.
     */
    const profile: SiteRegulatoryProfile = {
      ...getRegulatoryProfile(siteId),
      regionGrade: classification.regionGrade,
      dailyWastewaterM3: classification.dailyWastewaterM3,
      dischargeRoute: classification.dischargeRoute,
      verificationStatus: classification.regionGrade ? 'SELF_REPORTED' : 'UNVERIFIED',
    };

    return LEGAL_CHECK_ITEMS.map((item) => ({
      label: item.label,
      code: item.code,
      /*
       * **`SS`는 판정 자체가 없다** — 우리 계측에도 AI 추정에도 없어서 기준을 넣어도
       * 견줄 값이 없다(`[공정자료 p.5·19]`). 5항목을 그대로 적고 보유 여부를 따로 표시한다는
       * 원칙 그대로라, 행은 남기고 `standard`만 비운다.
       */
      standard:
        item.code === null
          ? null
          : resolveDischargeStandard({
              profile,
              rules,
              pollutantCode: item.code,
              asOf: DEMO_NOW_ISO,
            }),
    }));
  }, [store, siteId]);
}
