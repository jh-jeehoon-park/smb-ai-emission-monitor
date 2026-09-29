import { LIMIT_INPUT_KIND } from '@/shared/config/discharge-limits';
import { MEASUREMENT_ITEMS, type MeasurementItemCode } from '@/shared/config/measurement';
import type { RegulatoryRule } from '@/entities/regulation';
import type { LimitSheets, SiteClassification } from './storage';

/**
 * **사용자가 넣은 기준치를 규정 한 줄로 옮긴다** `[사용자 요청 2026-09-28: 설정 재설계 검토]`.
 *
 * 이것이 없으면 새 「적용 기준」 표가 **fixture 규정만 보고** 사용자가 설정 화면에서 넣은
 * 값을 무시한다 — 한 화면이 다른 화면과 다른 진실을 말하게 된다. 두 경로가 같은 답을 내야
 * 소비처를 하나씩 옮길 수 있다.
 *
 * **그 사업장에 적용되는 시트 하나만 옮긴다.** 저장소는 `(지역구분 × 규모 × 항목)` 한 벌이라
 * 사업장 축이 없는데, 여기서 사업장별로 푸는 순간 그 한계가 «사업장마다 다른 값»으로
 * 조용히 바뀐다 — 옛 모델을 그대로 옮기고, 구조를 고치는 일은 규정 관리 화면이 생길 때 한다.
 *
 * **`scope`를 비워 둔다.** 호출부가 이미 그 사업장의 분류로 시트를 골랐으므로 범위 판정을
 * 한 번 더 걸면, 사업장의 배출량 원시 값(`dailyWastewaterM3`)이 아직 전부 `null`이라
 * **모든 규정이 «알 수 없음»으로 떨어져 화면이 통째로 미확정이 된다.**
 *
 * **효력은 `REPLACE`다.** 지금 동작이 그렇다 — 사용자 값이 정적 표와 시연값을 덮는다
 * (`resolve.ts`: *"pH는 정적 표에 값이 있는데도 사용자 값이 이긴다"*). 허가조건이 법령
 * 일반기준을 **대체**하는지 **강화**하는지는 아직 근거가 없어 `[TBD-62]`로 열어 두었고,
 * 확인되면 이 한 줄만 바꾼다.
 */
export function sheetsToRules(
  sheets: LimitSheets | null,
  classification: SiteClassification,
  updatedIso: string | null,
): RegulatoryRule[] {
  const { regionGrade, dischargeScale } = classification;
  if (!regionGrade || !dischargeScale) return [];

  const sheet = sheets?.[regionGrade]?.[dischargeScale];
  if (!sheet) return [];

  const rules: RegulatoryRule[] = [];
  for (const [code, entry] of Object.entries(sheet)) {
    if (!entry) continue;
    const pollutantCode = code as MeasurementItemCode;
    rules.push({
      id: `RULE-USER-${pollutantCode}`,
      pollutantCode,
      source: 'PERMIT_CONDITION',
      effect: 'REPLACE',
      comparator: LIMIT_INPUT_KIND[pollutantCode] === 'range' ? 'RANGE' : 'MAX',
      min: entry.min,
      max: entry.max,
      unit: MEASUREMENT_ITEMS[pollutantCode].unit,
      scope: {},
      /*
       * **입력한 날은 시행일이 아니다.** 그 날짜는 «사용자가 타이핑한 때»이지 허가조건이
       * 효력을 갖기 시작한 때가 아니다 — 허가증의 실제 시행일을 받는 칸이 아직 없다.
       *
       * 넣으면 **값이 조용히 사라지기도 한다**: 화면은 고정된 시연 시각(`DEMO_NOW_ISO` =
       * 2026-08-21)을 보는데 입력 시각은 실제 «지금»이라 «아직 시행 전»으로 걸러진다
       * (만들면서 실제로 밟았다). 입력 시각은 **출처 문구**가 갖는다.
       */
      effectiveFrom: null,
      effectiveTo: null,
      citation: `[사용자 설정${updatedIso ? ` ${updatedIso.slice(0, 10)}` : ''}] 사업장 허가증 입력값 · ${regionGrade} · ${dischargeScale}`,
    });
  }
  return rules;
}
