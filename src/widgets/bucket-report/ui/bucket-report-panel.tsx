'use client';

import { Download } from 'lucide-react';
import { MEASUREMENT_ITEMS , type MeasurementItemCode } from '@/shared/config/measurement';
import { cn } from '@/shared/lib/cn';
import { downloadCsv } from '@/shared/lib/csv';
import { formatClock, formatValue } from '@/shared/lib/format';
import { ABSENT_ITEM_LABEL } from '@/features/site-provisioning';
import { Panel } from '@/shared/ui/panel';
import { InfoTip } from '@/shared/ui/tooltip';
import { SegmentedControl } from '@/shared/ui/segmented-control';
import { TABLE_HEAD_CELL, TABLE_HEAD_ROW, TABLE_ROOT, TABLE_ROW, TABLE_SCROLL } from '@/shared/ui/table';
import {
  BUCKET_OPTIONS,
  STAT_LABELS,
  STAT_OPTIONS,
  TELEMETRY_PENDING_NOTE,
  WINDOW_HOURS,
  buildBucketReport,
  bucketReportToCsv,
  sliceRecentHours,
  type BucketRow,
  type BucketStat,
  type BucketUnit,
  type MeasurementPoint,
  type SeriesCode,
} from '@/entities/measurement';
import { ACTION_BUTTON_QUIET } from '@/shared/ui/action-button';

/**
 * 구간이 행인 센서 리포트.
 *
 * **두 화면이 같은 표를 쓴다** — 시계열 변화(SCR-OP-003)와 리포트(SCR-OP-008)
 * `[사용자 요청 2026-08-21: 해당 페이지 내에 '시계열 변화' 페이지와 같이 집계와 같은 리포트도 필요함]`.
 * 각자 만들면 같은 사업장의 같은 구간이 두 화면에서 다른 값으로 보인다 — 결측을 세는 규칙
 * 하나만 갈려도 그렇게 된다(**E1**).
 *
 * 요약표가 하루 전체를 한 줄로 접는 반면 이쪽은 **시간의 흐름**을 보인다. 5분 표본 288개를
 * 늘어놓으면 값을 읽는 것이 아니라 세는 일이 된다.
 *
 * 집계 단위·통계 선택은 **호출부가 들고 있다** — 시계열 화면은 URL(`?bucket=`·`?stat=`)에
 * 두고 리포트 화면은 자기 상태에 둔다. 이 컴포넌트가 URL을 읽으면 두 화면이 같은 쿼리 키를
 * 다투게 된다.
 */
export function BucketReportPanel({
  points,
  codes,
  absentCodes = [],
  hours,
  unit,
  stat,
  onUnitChange,
  onStatChange,
  siteName,
  baseIso,
  pending = false,
}: {
  points: MeasurementPoint[];
  codes: readonly SeriesCode[];
  /**
   * 이 사업장에 **장비가 없는** 항목 `[사용자 요청 2026-09-28]` `[TBD-61]`.
   *
   * **열을 지우지 않는다** — 열 머리가 곧 항목이라, 빼면 «그 항목을 재지 않는다»는 사실이
   * 표에서 사라진다. 칸에 그렇게 적는다(수질 격자의 「미설치」 카드와 같은 말).
   */
  absentCodes?: readonly MeasurementItemCode[];
  /** 볼 구간. 리포트 화면의 기간 필터가 이 값을 정한다 */
  hours: number;
  unit: BucketUnit;
  stat: BucketStat;
  onUnitChange: (next: BucketUnit) => void;
  onStatChange: (next: BucketStat) => void;
  siteName: string;
  /** CSV 파일명에 넣을 기준 시각 */
  baseIso: string;
  /**
   * 첫 응답을 기다리는 중인가 `[사용자 지적 2026-09-07]`.
   *
   * **이 표는 스켈레톤을 그릴 수 없다** — 행이 구간이라 몇 줄이 될지는 데이터가 정한다.
   * 지어낸 줄 수가 틀리면 값이 올 때 오히려 더 크게 튄다. 그래서 빈 상자에 문구만 바꾼다.
   */
  pending?: boolean;
}) {
  const window = sliceRecentHours(points, hours);
  const rows = buildBucketReport(window, codes, unit, stat);

  return (
    <Panel
      title="구간별 집계"
      titleAside={
        <InfoTip
          label="무엇을 어떻게 세는가"
          content={`구간마다 ${STAT_LABELS[stat]}을 냅니다. 결측은 계산에서 빼고 건수로만 세며, 구간 전체가 결측이면 수신 없음입니다 — 0으로 채우면 값 자체가 거짓이 됩니다. 일·월 집계는 없습니다 — 시연 데이터의 축적 구간이 ${WINDOW_HOURS}시간이라 일 단위로 묶으면 한 행뿐이고 월은 만들 수 없습니다. 이력이 쌓이면 단위만 더하면 됩니다.`}
        />
      }
      action={
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            ariaLabel="집계 단위"
            options={BUCKET_OPTIONS}
            value={unit}
            onChange={onUnitChange}
          />
          <SegmentedControl
            ariaLabel="보이는 통계"
            options={STAT_OPTIONS}
            value={stat}
            onChange={onStatChange}
          />
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                `${siteName}_구간집계_${STAT_LABELS[stat]}_${baseIso.slice(0, 10)}.csv`,
                bucketReportToCsv(rows, codes, stat, absentCodes),
              )
            }
            className={ACTION_BUTTON_QUIET}
          >
            <Download size={12} strokeWidth={2} />
            CSV 내보내기
          </button>
        </div>
      }
    >
      <BucketTable rows={rows} codes={codes} absentCodes={absentCodes} stat={stat} pending={pending} />
    </Panel>
  );
}

function BucketTable({
  rows,
  codes,
  absentCodes,
  stat,
  pending,
}: {
  rows: BucketRow[];
  codes: readonly SeriesCode[];
  absentCodes: readonly MeasurementItemCode[];
  stat: BucketStat;
  pending: boolean;
}) {
  if (rows.length === 0) {
    return (
      <p className=" py-8 text-center text-[12px] text-fg-subtle">
        {/* **아직 안 물어본 것을 «표본이 없다»고 적지 않는다**(E4) — 확인된 부재의 어휘다 */}
        {pending ? TELEMETRY_PENDING_NOTE : '이 구간에 표본이 없습니다.'}
      </p>
    );
  }

  return (
    /*
     * **가로로 밀리는 상자는 `TABLE_SCROLL`을 쓴다** `[2026-09-30 검토]` — 이 상자만
     * `overflow-auto`로 손으로 적혀 신호도 규약 검사도 비껴갔다(390px에서 340px이 말없이 숨었다).
     * 첫 열이 고정이라 왼쪽은 흐리지 않고, 세로로도 밀리므로 마우스 환경의 스크롤바 폭을 남긴다.
     */
    <div
      className={cn(
        TABLE_SCROLL,
        'max-h-[560px] overflow-y-auto [--scroll-hint-fade-start:0px]',
        'pointer-fine:[--scroll-hint-bar:var(--scrollbar-size)]',
      )}
    >
      <table className={`${TABLE_ROOT} text-[12px] text-center`}>
        <caption className="sr-only">
          구간별 {STAT_LABELS[stat]}. 행은 구간 시작 시각, 열은 계측 항목이다.
        </caption>
        <thead className="sticky top-0 z-10">
          <tr className={TABLE_HEAD_ROW}>
            <th scope="col" className={`sticky left-0 bg-surface-2 ${TABLE_HEAD_CELL}`}>
              구간
            </th>
            {codes.map((code) => (
              <th key={code} scope="col" className={TABLE_HEAD_CELL}>
                {MEASUREMENT_ITEMS[code].symbol}
                {MEASUREMENT_ITEMS[code].unit && (
                  <span className="ml-1 text-fg-subtle">{MEASUREMENT_ITEMS[code].unit}</span>
                )}
              </th>
            ))}
            <th scope="col" className={TABLE_HEAD_CELL}>
              결측
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.startIso} className={TABLE_ROW}>
              <th
                scope="row"
                className="num sticky left-0 bg-surface py-3.5 text-center font-normal text-fg-muted"
              >
                {formatClock(row.startIso)}
              </th>
              {codes.map((code) => (
                <td
                  key={code}
                  className={
                    absentCodes.includes(code)
                      ? 'num px-3 py-3.5 text-center text-fg-subtle'
                      : 'num px-3 py-3.5 text-center text-fg'
                  }
                >
                  {/*
                   * **셋을 가려 말한다.** 장비가 없으면 「미설치」, 구간 전체가 결측이면 값이
                   * 아니라 그 사실을(E4), 값이 있으면 값을 적는다. 미설치 칸에 숫자를 적으면
                   * 재지도 않은 값을 표가 주장하게 된다.
                   */}
                  {absentCodes.includes(code)
                    ? ABSENT_ITEM_LABEL
                    : formatValue(code, row.values[code] ?? null)}
                </td>
              ))}
              <td className="num px-3 py-3.5 text-center text-fg-subtle">
                {row.missingCount}/{row.totalCount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
