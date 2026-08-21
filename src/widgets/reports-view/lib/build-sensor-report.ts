import type { DischargeLimitTable } from '@/shared/config/discharge-limits';
import { isOverLimit } from '@/shared/config/discharge-limits';
import { MEASUREMENT_ITEMS } from '@/shared/config/measurement';
import { csvCell, toCsvText } from '@/shared/lib/csv';
import {
  EQUIPMENT_SERIES_CODES,
  WATER_SERIES_CODES,
  getMeasurementSeries,
  sliceRecentHours,
  summarizeSeries,
  type SeriesCode,
  type SeriesStats,
} from '@/entities/measurement';
import {
  getForecast,
  trendVerdict,
  type TrendEstimate,
  type TrendVerdict,
} from '@/entities/prediction';

/** 리포트에 싣는 계열 11종. 수질 8 + 설비 3 — 순서가 곧 표의 순서다 */
const REPORT_CODES: readonly SeriesCode[] = [...WATER_SERIES_CODES, ...EQUIPMENT_SERIES_CODES];

export interface SensorReportRow {
  code: SeriesCode;
  label: string;
  symbol: string;
  unit: string;
  decimals: number;
  stats: SeriesStats;
  /**
   * 기준 초과 판정. **`null`은 판정하지 않았다는 뜻이다** — 기준이 없거나 값이 결측이다(E4).
   * `false`를 돌려주면 "기준 안에 있다"는 사실 주장이 되어 없는 판정을 만든다.
   */
  over: boolean | null;
}

/**
 * 한 사업장의 **센서별 기간 통계**.
 *
 * 회의가 요구한 것이다 — "이상 점수에 대한 사항만이 아닌 센싱된 데이터들을 리포트할 수 있는
 * 것이 필요하며, 각각의 센서 데이터들과 pH 이러한 데이터 등의 기간에 대한 센서 값의 통계
 * 데이터가 필요하다" `[회의 2026-08-20]`.
 *
 * **통계 계산을 새로 만들지 않는다.** `summarizeSeries`가 이미 결측을 평균에서 빼고 건수로
 * 세는 규칙을 갖고 있다 — 여기서 다시 만들면 시계열 화면과 리포트가 같은 항목에 다른 평균을
 * 적는다(E1).
 *
 * 기준표는 **밖에서 받는다.** 사용자가 설정한 값이 반영돼야 하고(`[회의 2026-08-20]`),
 * 이 함수가 localStorage를 읽으면 순수하지 않아 서버에서 터진다.
 */
export function buildSensorReport(
  siteId: string,
  hours: number,
  limits: DischargeLimitTable,
): SensorReportRow[] {
  const points = sliceRecentHours(getMeasurementSeries(siteId), hours);

  return REPORT_CODES.map((code) => {
    const item = MEASUREMENT_ITEMS[code];
    const stats = summarizeSeries(points, code);

    return {
      code,
      label: item.label,
      symbol: item.symbol,
      unit: item.unit,
      decimals: item.decimals,
      stats,
      /* 판정은 **최신값**으로 한다. 평균으로 하면 한때의 초과가 평균에 묻힌다 */
      over: isOverLimit(code, stats.latest, limits),
    };
  });
}

export interface EstimateReportRow {
  code: TrendEstimate['code'];
  label: string;
  /** 계측인가 소프트 센싱 추정인가 */
  origin: TrendEstimate['origin'];
  /** 판정 문구·색·근거. **표가 다시 분기하지 않는다** — 세 화면이 같은 답을 내야 한다 */
  verdict: TrendVerdict;
  /** 경향(상승/유지/하락). 판정과 다른 축이다 */
  trend: TrendEstimate['trend'];
}

/**
 * TOC·TN·TP의 **기준 대비 높낮이**.
 *
 * 회의가 요구한 것이다 — "TOC, TN, TP의 기준의 높고 낮음에 대한 리포트도 필요함"
 * `[회의 2026-08-20]`.
 *
 * **농도를 싣지 않는다.** 소프트 센싱으로는 절대값의 정확도를 맞추기 어렵다는 판단이라
 * 오염도 추정 화면도 농도를 내리고 기준 대비만 낸다 — 리포트가 숫자를 다시 적으면 그 판단이
 * 화면 하나에서만 지켜진다.
 */
export function buildEstimateReport(
  siteId: string,
  limits: DischargeLimitTable,
  /** 기준치가 없는 이유. 사업장 분류 미설정과 항목값 미입력은 **할 일이 다르다** */
  unresolvedReason: string | null,
): EstimateReportRow[] {
  return getForecast(siteId).trends.map((trend) => ({
    code: trend.code,
    label: trend.label,
    origin: trend.origin,
    verdict: trendVerdict(trend, isOverLimit(trend.code, trend.value, limits), unresolvedReason),
    trend: trend.trend,
  }));
}

const SENSOR_CSV_HEADERS = [
  '항목',
  '기호',
  '단위',
  '최소',
  '평균',
  '최대',
  '최신',
  '결측표본',
  '전체표본',
  '기준판정',
] as const;

/** 기준이 없으면 `미판정`이다. `정상`으로 적으면 없는 판정을 만든다(E4) */
const verdict = (over: boolean | null) =>
  over === null ? '미판정' : over ? '기준초과' : '기준이내';

export function sensorReportToCsv(rows: SensorReportRow[]): string {
  return toCsvText(
    SENSOR_CSV_HEADERS,
    rows.map((row) => [
      row.label,
      row.symbol,
      row.unit || '—',
      csvCell(row.stats.min, row.decimals),
      csvCell(row.stats.avg, row.decimals),
      csvCell(row.stats.max, row.decimals),
      csvCell(row.stats.latest, row.decimals),
      String(row.stats.missingCount),
      String(row.stats.totalCount),
      verdict(row.over),
    ]),
  );
}

export { verdict as limitVerdictLabel };
