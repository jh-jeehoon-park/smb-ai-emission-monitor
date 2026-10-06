'use client';

import { MEASUREMENT_GRADE_HEX } from '@/shared/config/status-visual';
import { PROVISIONAL_MEASUREMENT_GRADE_LABELS } from '@/shared/config/provisional';
import { clamp } from '@/shared/lib/prng';
/* 자릿수는 항목이 정한다 — 화면이 반올림을 정하면 같은 값이 화면마다 달라진다(E1) */
import { formatValue } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { WINDOW_HOURS } from '../config/constants';
import { verdictText, type PointReading } from '../lib/point-readings';

/**
 * 유출수의 수질 — **줄 목록으로 그린다.**
 *
 * `WaterQualityGrid`(카드 8장 격자 + 미니 차트)를 쓰지 않는다 `[사용자 요청 2026-09-10:
 * 기존 컴포넌트를 가져다 쓰지 말고 새롭게 만들 것 · 기존과 다른 UI 표출]`. 그쪽은 *항목마다
 * 추이를* 보는 격자이고, 이 화면이 묻는 것은 **«지금 값이 오늘 범위의 어디쯤인가»** 다 —
 * 유입 수질 채널이 없어(2026-09-10 실측) 지점 대 지점 대조가 불가능하므로, 같은 지점의
 * **시간**을 대조축으로 삼는다.
 *
 * 그래서 한 줄이 «이름 · 값 · 오늘 폭에서의 자리 · 판정»이다. 카드 격자보다 촘촘하고,
 * 여덟 항목의 자리를 세로로 훑어 비교할 수 있다.
 */
export function QualityRows({
  rows,
  pending,
  title,
}: {
  rows: PointReading[];
  pending: boolean;
  title: string;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-[12px] font-semibold uppercase tracking-wide text-fg-subtle">{title}</h3>

      <dl className="divide-y divide-border overflow-hidden rounded-nested border border-border">
        {rows.map((row) => (
          <Row key={row.code} row={row} pending={pending} />
        ))}
      </dl>
    </section>
  );
}

function Row({ row, pending }: { row: PointReading; pending: boolean }) {
  const verdict = verdictText(row);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 bg-surface px-3 py-2.5 sm:grid-cols-[minmax(0,7rem)_auto_minmax(0,1fr)_auto]">
      <dt className="min-w-0 truncate text-[12px] text-fg-muted" title={row.label}>
        {row.label}
        <span className="ml-1.5 text-fg-subtle">{row.symbol}</span>
      </dt>

      <dd className="flex items-baseline justify-end gap-1 sm:justify-start">
        {pending ? (
          <span className="block h-4 w-12 animate-pulse rounded-chip bg-surface-3" />
        ) : row.value === null ? (
          <span className="text-[12px] text-fg-subtle">수신 없음</span>
        ) : (
          <>
            <span
              className="num text-[18px] font-bold leading-none tracking-tight"
              style={{ color: MEASUREMENT_GRADE_HEX[row.grade] }}
            >
              {row.valueText}
            </span>
            {row.unit && <span className="text-[12px] text-fg-subtle">{row.unit}</span>}
          </>
        )}
      </dd>

      <dd className="col-span-2 sm:col-span-1">{!pending && <RangeTrack row={row} />}</dd>

      <dd className="col-span-2 flex items-center justify-end gap-2 sm:col-span-1">
        <span className="text-[12px]" style={{ color: MEASUREMENT_GRADE_HEX[row.grade] }}>
          {PROVISIONAL_MEASUREMENT_GRADE_LABELS[row.grade]}
        </span>
        {/* 기준이 걸리지 않는 항목에는 아무것도 적지 않는다 — 없는 기준을 예고하지 않는다 */}
        {verdict && <span className="text-[12px] text-fg-subtle">{verdict}</span>}
      </dd>
    </div>
  );
}

/**
 * 오늘 폭에서 지금 값의 자리.
 *
 * **눈금을 붙이지 않는다** — 축이 항목마다 다르고(pH는 무차원, EC는 μS/cm) 여덟 줄에 여덟
 * 축을 적으면 읽히지 않는다. 트랙이 답하는 것은 «오늘 안에서 높은 편인가»뿐이고, 실제 값은
 * 왼쪽에 이미 있다. 양 끝 숫자로 폭을 밝힌다.
 */
function RangeTrack({ row }: { row: PointReading }) {
  if (row.value === null || row.min === null || row.max === null) return null;

  const span = row.max - row.min;
  const at = span === 0 ? 50 : clamp(((row.value - row.min) / span) * 100, 0, 100);
  const avgAt =
    row.average === null || span === 0
      ? null
      : clamp(((row.average - row.min) / span) * 100, 0, 100);

  return (
    <div className="flex items-center gap-2">
      <span className="num hidden shrink-0 text-[12px] text-fg-subtle sm:inline">
        {formatValue(row.code, row.min)}
      </span>

      <div
        className="relative h-1.5 min-w-0 flex-1 rounded-full bg-surface-3"
        style={{ boxShadow: 'var(--track-inset)' }}
      >
        {/* 평균 자리 — «평소»의 눈금. 값이 아니라 기준이라 가늘다 */}
        {avgAt !== null && (
          <span
            aria-hidden
            className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-border-strong"
            style={{ left: `${avgAt}%` }}
          />
        )}
        <span
          aria-hidden
          className={cn('absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full')}
          style={{
            left: `${at}%`,
            backgroundColor: MEASUREMENT_GRADE_HEX[row.grade],
            boxShadow: '0 0 0 2px var(--surface)',
          }}
        />
      </div>

      <span className="num hidden shrink-0 text-[12px] text-fg-subtle sm:inline">
        {formatValue(row.code, row.max)}
      </span>
      <span className="sr-only">{`최근 ${WINDOW_HOURS}시간 범위`}</span>
    </div>
  );
}
