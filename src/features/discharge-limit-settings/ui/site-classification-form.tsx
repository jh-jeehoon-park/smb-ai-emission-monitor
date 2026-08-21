'use client';

import {
  DISCHARGE_SCALES,
  REGION_GRADES,
  type DischargeScale,
  type RegionGrade,
} from '@/shared/config/discharge-limits';
import { SegmentedControl } from '@/shared/ui/segmented-control';
import { classificationOf, useLimitSettingsStore } from '../model/limit-settings-context';

const UNSET = '미설정';

/**
 * 사업장의 지역구분·배출량 규모.
 *
 * **이것이 없으면 기준치표를 고를 수 없다.** 법령 표가 두 축으로 갈리므로
 * `[공정자료 p.11]` 둘 다 정해야 어느 시트를 볼지 결정된다 — 기준치를 입력해 둬도 이 둘이
 * 비어 있으면 화면은 계속 `미확정`을 적는다.
 *
 * **우리가 값을 추측하지 않는다.** 실증 사업장 10개소의 두 축이 전부 `null`인 것은 원문에
 * 없기 때문이고(`[TBD-45]`), 여기서 사용자가 고르는 것으로 채운다.
 */
export function SiteClassificationForm({ siteId }: { siteId: string }) {
  const store = useLimitSettingsStore();
  const current = classificationOf(store, siteId);

  return (
    <div className="space-y-4">
      <Row
        label="지역구분"
        note="배출허용기준표의 첫 번째 축 [공정자료 p.11]"
        options={REGION_GRADES}
        value={current.regionGrade}
        onChange={(next) =>
          store.setClassification(siteId, { ...current, regionGrade: next as RegionGrade | null })
        }
      />
      <Row
        label="1일 폐수배출량 규모"
        note="두 번째 축. 종별이 배출량으로 갈린다 [공정자료 p.11]"
        options={DISCHARGE_SCALES}
        value={current.dischargeScale}
        onChange={(next) =>
          store.setClassification(siteId, {
            ...current,
            dischargeScale: next as DischargeScale | null,
          })
        }
      />

      <p className="max-w-[70ch] border-t border-border pt-3 text-[11px] leading-relaxed text-fg-subtle">
        두 축이 정해지면 아래 <strong className="text-fg-muted">방류 기준치</strong> 탭에서 그
        조합의 값을 읽어 초과를 판정합니다. 정확한 적용 구간은{' '}
        <strong className="text-fg-muted">사업장 폐수배출시설 설치허가(신고)증</strong>에서
        확인합니다 [공정자료 p.11] — 우리가 정하는 값이 아닙니다.
      </p>
    </div>
  );
}

/**
 * 한 축. **`미설정`을 선택지로 둔다** — 잘못 고른 것을 되돌릴 방법이 없으면 한 번 고른 뒤
 * 되돌릴 수 없고, 그 상태가 "확정"으로 읽힌다.
 */
function Row({
  label,
  note,
  options,
  value,
  onChange,
}: {
  label: string;
  note: string;
  options: readonly string[];
  value: string | null;
  onChange: (next: string | null) => void;
}) {
  return (
    <div>
      <p className="text-[12px] text-fg">{label}</p>
      <p className="mt-0.5 text-[11px] text-fg-subtle">{note}</p>
      <SegmentedControl
        className="mt-1.5 flex-wrap"
        ariaLabel={label}
        value={value ?? UNSET}
        onChange={(next) => onChange(next === UNSET ? null : next)}
        options={[
          { value: UNSET, label: UNSET },
          ...options.map((option) => ({ value: option, label: option })),
        ]}
      />
    </div>
  );
}
