'use client';

import { useState } from 'react';
import {
  DISCHARGE_SCALES,
  LEGAL_CHECK_ITEMS,
  LIMIT_INPUT_KIND,
  REGION_GRADES,
  type DischargeScale,
  type RegionGrade,
  UNRESOLVED_LIMIT_TEXT,
} from '@/shared/config/discharge-limits';
import { MEASUREMENT_ITEMS, type MeasurementItemCode } from '@/shared/config/measurement';
import { NumberField } from '@/shared/ui/number-field';
import { SegmentedControl } from '@/shared/ui/segmented-control';
import { classificationOf, useLimitSettingsStore } from '../model/limit-settings-context';
import { validEntry, type LimitEntry, type LimitSheets } from '../lib/storage';

const EMPTY: LimitEntry = { min: null, max: null };

/**
 * 지역 × 항목 기준치 편집.
 *
 * **규모를 세그먼트로 쪼갠다.** 전체는 (지역 4 × 규모 4 × 항목 5) = 80칸인데 한 화면에
 * 그리면 아무도 읽지 못한다. 실제 법령 표도 규모별 시트로 인쇄된다.
 *
 * 행은 `REGION_GRADES`, 열은 `LEGAL_CHECK_ITEMS`를 **그대로** 쓴다 — 새 항목 목록을 만들면
 * 법정 점검 5항목과 갈린다. `SS`는 `code: null`이라 입력할 수 없다: 우리 계측에도 AI 추정에도
 * 없어서(`[공정자료 p.5·19]`) 기준을 넣어도 비교할 값이 없다.
 */
export function DischargeLimitEditor({ siteId }: { siteId: string }) {
  const store = useLimitSettingsStore();
  const own = classificationOf(store, siteId);
  const [scale, setScale] = useState<DischargeScale>(own.dischargeScale ?? DISCHARGE_SCALES[0]);

  const update = (region: RegionGrade, code: MeasurementItemCode, next: LimitEntry) => {
    const sheets: LimitSheets = structuredClone(store.sheets);
    sheets[region] ??= {};
    sheets[region]![scale] ??= {};

    /*
     * **값이 하나도 없으면 항목을 지운다.** 남겨 두면 `resolveLimitTable`이 그것을
     * "판정 가능"으로 표시하고, 경계가 없어 모든 값에 `기준 안`을 돌려준다 — 기준을 모르는
     * 항목이 안전한 항목으로 둔갑한다. 지우면 정직하게 `미확정`으로 돌아간다.
     */
    if (next.min === null && next.max === null) {
      delete sheets[region]![scale]![code];
    } else {
      sheets[region]![scale]![code] = next;
    }
    store.setSheets(sheets);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <SegmentedControl
          className="flex-wrap"
          ariaLabel="1일 폐수배출량 규모"
          value={scale}
          onChange={setScale}
          options={DISCHARGE_SCALES.map((option) => ({ value: option, label: option }))}
        />
        {own.dischargeScale === scale && own.regionGrade ? (
          <span className="text-[11px] text-fg-subtle">
            이 사업장에 적용되는 시트 · {own.regionGrade}
          </span>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-[12px]">
          <caption className="sr-only">
            지역구분별 방류 기준치. 행은 지역구분, 열은 법정 점검 항목이다. 값을 지우면 미설정으로
            돌아간다.
          </caption>
          <thead>
            <tr className="border-b border-border text-[11px] text-fg-subtle">
              <th className="px-3 py-2 text-left font-normal">지역구분</th>
              {LEGAL_CHECK_ITEMS.map((item) => (
                <th key={item.label} className="px-3 py-2 text-left font-normal">
                  {item.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {REGION_GRADES.map((region) => (
              <tr key={region} className="border-b border-border last:border-0">
                <th
                  scope="row"
                  className="whitespace-nowrap px-3 py-2.5 text-left font-normal text-fg"
                >
                  {region}
                  {own.regionGrade === region ? (
                    <span className="ml-1.5 text-[11px] text-fg-subtle">우리 사업장</span>
                  ) : null}
                </th>
                {LEGAL_CHECK_ITEMS.map((item) => (
                  <td key={item.label} className="px-3 py-2 align-top">
                    <ItemCell
                      code={item.code}
                      label={item.label}
                      entry={store.sheets[region]?.[scale]?.[item.code ?? 'pH'] ?? EMPTY}
                      onChange={(next) => item.code && update(region, item.code, next)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="max-w-[76ch] border-t border-border pt-2.5 text-[11px] leading-relaxed text-fg-subtle">
        <strong className="text-fg-muted">빈 칸은 미설정이며 0이 아닙니다.</strong> 지우면 그
        항목은 초과를 판정하지 않고 화면에 `{UNRESOLVED_LIMIT_TEXT}`로 남습니다. 값의 옳고 그름은
        검사하지 않습니다 — <strong className="text-fg-muted">법령이 원천</strong>이며 우리는
        범위가 뒤집혔는지와 센서 측정 범위 안인지만 봅니다.
      </p>
    </div>
  );
}

/**
 * 한 항목 칸. `range` 항목(pH)만 하한·상한 두 칸이다 — `LIMIT_INPUT_KIND`가 그것을 정한다.
 */
function ItemCell({
  code,
  label,
  entry,
  onChange,
}: {
  code: MeasurementItemCode | null;
  label: string;
  entry: LimitEntry;
  onChange: (next: LimitEntry) => void;
}) {
  /* SS는 계측·추정 대상이 아니라 기준을 넣어도 비교할 값이 없다 */
  if (!code) {
    return <p className="pt-1 text-[11px] leading-snug text-fg-subtle">계측 없음</p>;
  }

  const item = MEASUREMENT_ITEMS[code];
  const kind = LIMIT_INPUT_KIND[code] ?? 'max';
  const invalid = (entry.min !== null || entry.max !== null) && !validEntry(code, entry);
  const error = invalid ? '범위가 뒤집혔거나 측정 범위 밖입니다' : null;

  if (kind === 'range') {
    return (
      <div className="flex items-start gap-1.5">
        <NumberField
          className="w-[84px]"
          label={`${label} 하한`}
          value={entry.min}
          onChange={(min) => onChange({ ...entry, min })}
          unit={item.unit}
          decimals={item.decimals}
          range={item.range}
          error={error}
        />
        <NumberField
          className="w-[84px]"
          label="상한"
          value={entry.max}
          onChange={(max) => onChange({ ...entry, max })}
          unit={item.unit}
          decimals={item.decimals}
          range={item.range}
        />
      </div>
    );
  }

  return (
    <NumberField
      className="w-[110px]"
      label={`${label} 상한`}
      value={entry.max}
      onChange={(max) => onChange({ min: null, max })}
      unit={item.unit}
      decimals={item.decimals}
      range={item.range}
      error={error}
    />
  );
}
