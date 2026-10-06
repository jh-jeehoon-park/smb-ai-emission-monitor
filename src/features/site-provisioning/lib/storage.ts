import { MEASUREMENT_ITEMS, type MeasurementItemCode } from '@/shared/config/measurement';

/**
 * 그 사업장의 계측기 구성.
 *
 * **보유한 것이 아니라 «없는 것»을 담는다.** 실증 현장조사에서 공통 7종이 어디나 있고 빠지는
 * 것이 소수였다(다섯 곳 모두 색도 없음, TN·TP만 곳에 따라 붙는다). 보유 목록을 담으면 항목이
 * 하나 늘 때마다 **모든 사업장의 저장값을 고쳐야** 새 항목이 보이고, 고치지 않은 사업장에서는
 * 조용히 사라진다 — 없는 것을 담으면 새 항목은 기본으로 보인다.
 */
export interface InstrumentSetting {
  /** 이 사업장에 장비가 없는 항목. 비어 있으면 전부 보유 */
  absentCodes: MeasurementItemCode[];
}

export interface SiteProvisioning {
  instruments: InstrumentSetting;
  /**
   * **전력을 계측하는 설비의 id** `[사용자 요청 2026-09-21: 전력계측기를 통한 각 설비별 전력
   * 사용량]`.
   *
   * 현장조사가 이 결정을 **우리 몫으로 명시했다** — *"전체 전력 또는 설비별 전력 중 실제
   * 수집범위는 JH솔루션 검토 후 확정이 필요함"*(에버) · *"JH솔루션에서 AI 분석 목적에 필요한
   * 공정·설비를 선정한 후"*(대호특수강). 다섯 곳 모두 기존 전력량계가 통신 불가이거나
   * 미확인이라, **무엇에 통신형 계기를 달 것인가**가 곧 설치 범위와 비용이 된다.
   *
   * **설비 목록 자체는 담지 않는다.** 대수는 현장이 알려 주는 사실이고(에버 8 · 칠갑 12),
   * 우리가 고를 값이 아니다. 게다가 `ALL_ALARMS`가 모듈 로드 시점에 설비 목록으로 알람을
   * 만들어 두므로, 목록을 설정으로 바꾸면 **없는 설비의 알람이 남는다.**
   */
  meteredEquipmentIds: string[];
}

/** 사업장 → 구성. 사업장마다 다르므로 사업장이 첫 축이다(`StageSettingsBySite`와 같다) */
export type ProvisioningBySite = Record<string, SiteProvisioning>;

const isCode = (v: unknown): v is MeasurementItemCode =>
  typeof v === 'string' && v in MEASUREMENT_ITEMS;

/**
 * 저장값을 **믿을 수 있게 만든다.**
 *
 * 사용자가 콘솔에서 고칠 수 있고 옛 판이 남아 있을 수 있다. 모르는 항목 코드는 조용히 버린다 —
 * 타입 단언으로 넘기면 그 거짓이 계측 격자까지 흘러가 **없는 항목을 「미설치」로 그린다.**
 * `parseStageSettings`가 모르는 단계 id를 버리는 것과 같은 이유다.
 */
export function parseProvisioning(raw: unknown): ProvisioningBySite | null {
  if (!raw || typeof raw !== 'object') return null;

  const out: ProvisioningBySite = {};
  for (const [siteId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue;

    const { instruments } = value as { instruments?: unknown };
    if (!instruments || typeof instruments !== 'object') continue;

    const { absentCodes } = instruments as { absentCodes?: unknown };
    const codes = Array.isArray(absentCodes) ? absentCodes.filter(isCode) : [];

    const { meteredEquipmentIds } = value as { meteredEquipmentIds?: unknown };
    /* 설비 id는 사업장마다 달라질 수 있어 목록으로 검증하지 않는다 — 문자열인지만 본다 */
    const metered = Array.isArray(meteredEquipmentIds)
      ? meteredEquipmentIds.filter((v): v is string => typeof v === 'string')
      : [];

    /*
     * **빈 설정도 남긴다.** 사용자가 끈 항목을 다시 전부 켠 것과 한 번도 설정하지 않은 것은
     * 다르다 — 화면이 「사용자가 정했다」를 적고 되돌리기 버튼을 띄우는 근거가 이 구분이다.
     */
    out[siteId] = { instruments: { absentCodes: codes }, meteredEquipmentIds: metered };
  }
  return out;
}
