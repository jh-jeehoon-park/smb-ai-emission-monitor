import { TELEMETRY_PENDING_NOTE } from '@/entities/measurement';
import { COLLECTION_INTERVAL_MINUTES, HISTORY_WINDOW_HOURS } from '@/shared/config/measurement';
import { DISPLAY_TIMEZONE } from '@/shared/lib/format';
import { CHART_SURFACE } from '@/shared/ui/chart-figure';
import { Skeleton, SkeletonRegion } from '@/shared/ui/skeleton';
import { RibbonLegend } from './ribbon-legend';
import {
  RIBBON_GRID_ROWS,
  RIBBON_LABEL_WIDTH,
  RIBBON_ROW_GAP,
  RIBBON_SCORE_HEIGHT,
  RIBBON_STRIP_HEIGHT,
} from '../config/constants';

/** 실제 리본과 같은 세 줄 — 라벨은 계측이 아니라 이 위젯이 아는 것이라 그린다 */
const STRIP_LABELS = ['가동', '방류', '수신'] as const;

const SEPARATOR_ROW = 2;
const TICKS_ROW = SEPARATOR_ROW + STRIP_LABELS.length + 1;

/**
 * 일간 운전 리본이 **아직 답을 모르는 동안** 그 자리를 지킨다 `[사용자 지적 2026-09-07]`.
 *
 * **한때 이 자리에서 화면이 터졌다.** 첫 응답 전 계열을 비우면서(`pending`) `buildRibbon`이
 * 빈 배열을 받았고, `assertFullDay`가 *"리본 '가동' 표본 0개 — 1440개여야 한다"* 로 렌더 중에
 * 예외를 던졌다 — 그 단정은 네 행의 같은 x가 같은 시각을 가리키게 하는 장치라 무르면 안 되고,
 * 무를 필요도 없다. **모르는 동안은 리본을 짓지 않는 것**이 맞다.
 *
 * **같은 뼈대를 그린다.** 라벨 칸 폭·행 높이·행 간격을 실제와 같은 상수에서 읽어(`config/
 * constants`) 값이 도착할 때 자리가 움직이지 않는다.
 *
 * **캡션에 «방류 0시간»을 적지 않는다.** 실제 캡션은 방류 시간과 알람 건수를 세는데, 둘 다
 * 아직 모른다 — 그 자리에 0을 적으면 없는 사실을 주장한다(**E4**). 조회 조건(기간·주기·
 * 시간대)은 계측이 아니라 화면이 정한 값이라 그대로 적는다(**E5**).
 */
export function DailyRibbonSkeleton() {
  return (
    <SkeletonRegion label={TELEMETRY_PENDING_NOTE} className="space-y-2">
      <p className="text-[12px] text-fg-subtle">
        {HISTORY_WINDOW_HOURS}시간 · {COLLECTION_INTERVAL_MINUTES}분 주기 · {DISPLAY_TIMEZONE} —{' '}
        {TELEMETRY_PENDING_NOTE}
      </p>

      <div
        className={`grid gap-x-3 ${CHART_SURFACE}`}
        style={{
          gridTemplateColumns: `${RIBBON_LABEL_WIDTH}px minmax(0, 1fr)`,
          gridTemplateRows: RIBBON_GRID_ROWS,
          rowGap: RIBBON_ROW_GAP,
        }}
      >
        {/* 점수 행 — 라벨은 눈금까지 실제와 같다. 값이 놓일 면만 덮는다 */}
        <span
          className="flex flex-col items-end justify-between py-px text-[11px]"
          style={{ gridRow: 1, gridColumn: 1 }}
        >
          <span className="num text-[10px] leading-none text-fg-subtle">100</span>
          <span className="text-fg-muted">이상 점수</span>
          <span className="num text-[10px] leading-none text-fg-subtle">0</span>
        </span>
        <div style={{ gridRow: 1, gridColumn: 2 }}>
          <Skeleton style={{ height: RIBBON_SCORE_HEIGHT }} />
        </div>

        <span
          className="my-1.5 border-t border-border"
          style={{ gridRow: SEPARATOR_ROW, gridColumn: '1 / -1' }}
        />

        {STRIP_LABELS.map((label, i) => (
          <Row key={label} label={label} row={SEPARATOR_ROW + 1 + i} />
        ))}

        {/* 눈금 줄의 높이만 잡아 둔다 — 시각 라벨은 계열이 없어도 알지만, 값 없는 축에 시각을
            적으면 그 시각의 값이 있는 것처럼 보인다 */}
        <div className="h-6" style={{ gridRow: TICKS_ROW, gridColumn: 2 }} />
      </div>

      {/*
       * **범례는 그대로 그린다.** 상수에서 오므로 기다릴 이유가 없고, 빼면 값이 도착할 때
       * 카드가 이 줄만큼 늘어난다 — 실제와 **같은 부품**이라 어긋날 자리가 없다.
       */}
      <RibbonLegend />
    </SkeletonRegion>
  );
}

function Row({ label, row }: { label: string; row: number }) {
  return (
    <>
      <span
        className="flex items-center justify-end pr-0.5 text-[12px] text-fg-muted"
        style={{ gridRow: row, gridColumn: 1 }}
      >
        {label}
      </span>
      <div className="min-w-0" style={{ gridRow: row, gridColumn: 2 }}>
        <Skeleton className="rounded-chip" style={{ height: RIBBON_STRIP_HEIGHT }} />
      </div>
    </>
  );
}
