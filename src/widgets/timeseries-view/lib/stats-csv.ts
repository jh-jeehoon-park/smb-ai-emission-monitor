import {
  UNRESOLVED_LIMIT_TEXT,
  formatLimitRange,
  isOverLimit,
  type DischargeLimitTable,
} from '@/shared/config/discharge-limits';
import { MEASUREMENT_ITEMS } from '@/shared/config/measurement';
import { csvCell, toCsvText } from '@/shared/lib/csv';
import type { SeriesCode, SeriesStats } from '@/entities/measurement';

const HEADERS = [
  '항목',
  '기호',
  '단위',
  '배출허용기준',
  '최소',
  '평균',
  '최대',
  '최신',
  '결측표본',
  '전체표본',
  '기준판정',
] as const;

/**
 * 시계열 요약표를 CSV로.
 *
 * 회의가 요구한 것이다 — "수질·설비 시계열 데이터를 **리포트 형식**으로 확인할 수 있어야 함"
 * `[회의 2026-08-20]`.
 *
 * **화면의 표와 같은 값·같은 자릿수를 낸다.** 여기서 다시 계산하면 화면과 파일이 갈린다 —
 * 통계는 `summarizeSeries`가 이미 냈고 이 함수는 그것을 옮기기만 한다(E1).
 *
 * 기준표는 밖에서 받는다. 사용자가 설정한 값이 반영돼야 한다 `[회의 2026-08-20]`.
 */
export function statsToCsv(
  rows: readonly { code: SeriesCode; stats: SeriesStats }[],
  limits: DischargeLimitTable,
): string {
  return toCsvText(
    HEADERS,
    rows.map(({ code, stats }) => {
      const item = MEASUREMENT_ITEMS[code];
      const limit = limits[code];
      const over = isOverLimit(code, stats.latest, limits);

      return [
        item.label,
        item.symbol,
        item.unit || '—',
        /* 기준이 없으면 빈 칸이 아니라 이유다 — 빈 칸은 "기준 0"으로 읽힐 수 있다 */
        formatLimitRange(limit, item.decimals) ?? UNRESOLVED_LIMIT_TEXT,
        csvCell(stats.min, item.decimals),
        csvCell(stats.avg, item.decimals),
        csvCell(stats.max, item.decimals),
        csvCell(stats.latest, item.decimals),
        String(stats.missingCount),
        String(stats.totalCount),
        /* 기준이 없으면 `미판정`이다. `정상`으로 적으면 없는 판정을 만든다(E4) */
        over === null ? '미판정' : over ? '기준초과' : '기준이내',
      ];
    }),
  );
}
