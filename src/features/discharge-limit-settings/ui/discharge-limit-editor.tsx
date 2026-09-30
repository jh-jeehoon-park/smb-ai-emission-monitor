'use client';

import { useState } from 'react';
import { ArrowRight, MapPinned } from 'lucide-react';
import { ACTION_BUTTON } from '@/shared/ui/action-button';
import { EmptyState } from '@/shared/ui/empty-state';
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
import { UNRESOLVED_REASONS } from '../config/constants';
import { classificationOf, useLimitSettingsStore } from '../model/limit-settings-context';
import { validEntry, type LimitEntry, type LimitSheets } from '../lib/storage';
import { TABLE_HEAD_CELL, TABLE_HEAD_ROW, TABLE_ROOT, TABLE_ROW, TABLE_SCROLL } from '@/shared/ui/table';
import { cn } from '@/shared/lib/cn';
import styles from './discharge-limit-editor.module.scss';

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
/** 이 편집기를 담는 패널의 제목 옆 툴팁에 쓴다 — 값과 같은 파일에 있어야 함께 고쳐진다 */
export const DISCHARGE_LIMIT_NOTE = (
  <>
    <strong className={styles.emphasis}>빈 칸은 미설정이며 0이 아닙니다.</strong> 지우면 그 항목은 초과를
    판정하지 않고 화면에 `{UNRESOLVED_LIMIT_TEXT}`로 남습니다. 값의 옳고 그름은 검사하지 않습니다 —
    <strong className={styles.emphasis}> 법령이 원천</strong>이며 우리는 범위가 뒤집혔는지와 센서 측정 범위
    안인지만 봅니다.
  </>
);

export function DischargeLimitEditor({
  siteId,
  onGoToFacts,
}: {
  siteId: string;
  /**
   * 분류가 없을 때 **어디로 가서 풀면 되는지**를 버튼으로 준다. 탭 전환은 화면(위젯)이 쥐고
   * 있어 여기서는 부르기만 한다.
   */
  onGoToFacts?: () => void;
}) {
  const store = useLimitSettingsStore();
  const own = classificationOf(store, siteId);
  const [scale, setScale] = useState<DischargeScale>(own.dischargeScale ?? DISCHARGE_SCALES[0]);

  /*
   * **분류가 없으면 입력받지 않는다** `[사용자 요청 2026-09-28: 설정 재설계 검토]`.
   *
   * 두 가지가 한꺼번에 잘못됐다.
   * ① `resolveLimitTable`이 지역구분·규모 둘 중 하나라도 없으면 **입력한 시트를 통째로
   *    무시한다** — 넣어도 화면이 달라지지 않는다(실측).
   * ② 그런데도 표가 열려 있었고, 규모 세그먼트가 `DISCHARGE_SCALES[0]`(2,000㎥ 이상)로
   *    선택된 채 떴다. 실증 사업장은 전부 4·5종(200㎥ 미만)이라, 나중에 관리자가 분류를
   *    제대로 넣어도 그때 입력한 값은 **다른 시트에 있어 영영 읽히지 않는다**(실측으로
   *    저장소에 `{"가지역":{"2,000㎥ 이상":{…}}}`이 남았다).
   *
   * 안내는 **툴팁이 아니라 본문에** 둔다 — 한때 이 문구가 `InfoTip` 안에만 있어 열기 전까지
   * DOM에 존재하지도 않았다.
   */
  if (!own.regionGrade || !own.dischargeScale) {
    return (
      <EmptyState
        icon={<MapPinned className={styles.emptyGlyph} strokeWidth={1.8} />}
        title="사업장 규제정보가 먼저 필요합니다"
        description={UNRESOLVED_REASONS.noClassification}
        action={
          onGoToFacts ? (
            <button type="button" onClick={onGoToFacts} className={ACTION_BUTTON}>
              사업장 규제정보 입력
              <ArrowRight aria-hidden className={styles.glyph} strokeWidth={2} />
            </button>
          ) : null
        }
      />
    );
  }

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
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <SegmentedControl
          className={styles.scales}
          ariaLabel="1일 폐수배출량 규모"
          value={scale}
          onChange={setScale}
          options={DISCHARGE_SCALES.map((option) => ({ value: option, label: option }))}
        />
        {own.dischargeScale === scale && own.regionGrade ? (
          <span className={styles.appliedSheet}>
            이 사업장에 적용되는 시트 · {own.regionGrade}
          </span>
        ) : null}
      </div>

      <div className={TABLE_SCROLL}>
        <table className={cn(TABLE_ROOT, styles.table)}>
          <caption className={styles.caption}>
            지역구분별 방류 기준치. 행은 지역구분, 열은 법정 점검 항목이다. 값을 지우면 미설정으로
            돌아간다.
          </caption>
          <thead>
            <tr className={TABLE_HEAD_ROW}>
              <th className={TABLE_HEAD_CELL}>지역구분</th>
              {LEGAL_CHECK_ITEMS.map((item) => (
                <th key={item.label} className={TABLE_HEAD_CELL}>
                  {item.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {REGION_GRADES.map((region) => (
              <tr key={region} className={TABLE_ROW}>
                <th
                  scope="row"
                  className={styles.region}
                >
                  {region}
                  {own.regionGrade === region ? (
                    <span className={styles.ownRegion}>우리 사업장</span>
                  ) : null}
                </th>
                {LEGAL_CHECK_ITEMS.map((item) => (
                  <td key={item.label} className={styles.cell}>
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
    return <p className={styles.notMeasured}>계측 없음</p>;
  }

  const item = MEASUREMENT_ITEMS[code];
  const kind = LIMIT_INPUT_KIND[code] ?? 'max';
  const invalid = (entry.min !== null || entry.max !== null) && !validEntry(code, entry);
  const error = invalid ? '범위가 뒤집혔거나 측정 범위 밖입니다' : null;

  if (kind === 'range') {
    return (
      <div className={styles.range}>
        <NumberField
          className={styles.rangeField}
          label={`${label} 하한`}
          value={entry.min}
          onChange={(min) => onChange({ ...entry, min })}
          unit={item.unit}
          decimals={item.decimals}
          range={item.range}
          error={error}
        />
        <NumberField
          className={styles.rangeField}
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
      className={styles.maxField}
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
