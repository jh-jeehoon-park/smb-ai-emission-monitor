import { FORECAST_SERIES_CODES } from '../config/constants';
import type { ForecastPoint, MeasuredSeries } from '../model/types';

/**
 * 계측 표본에서 **이 화면이 쓰는 다섯 칸만** 적은 구조적 타입.
 *
 * `entities/measurement`의 `MeasurementPoint`를 import하지 않기 위한 것이다 — entities끼리
 * 참조하지 않는 것이 규약이고(FSD §8), 그 규약이 막으려는 것은 **두 도메인이 서로의 모양에
 * 묶이는 것**이다. 필요한 칸만 여기서 선언하면 계측 쪽이 항목을 늘리거나 줄여도 이 slice는
 * 흔들리지 않고, `MeasurementPoint`가 이 모양을 만족하는지는 컴파일러가 부르는 쪽에서 본다.
 */
export interface SeriesSample {
  t: string;
  TOC: number | null;
  TN: number | null;
  TP: number | null;
  inflow: number | null;
  flow: number | null;
}

/**
 * 계측 계열을 오염도 추정이 쓰는 모양으로 옮긴다 `[사용자 요청 2026-09-08]`.
 *
 * **이 화면이 계측을 안 보고 있었다.** `getForecast`가 시드 난수로 다섯 계열을 지어냈고,
 * 그러면서 TOC·유량을 **`직접 계측`이라 적었다** — 셸 헤더가 `계측 서버 수신 중`이라 적는
 * 옆에서다(**E3**). 같은 사업장의 TOC를 시계열 화면은 서버 값으로, 이 화면은 생성값으로 말해
 * 두 화면이 6배 다른 숫자를 냈다(2026-09-07 실측 4.4 vs 기저 25.5).
 *
 * **창은 부르는 쪽이 자른다.** 계측 훅은 24시간을 들고 오고 이 화면은 최근 6시간만 그린다 —
 * 자르는 함수(`sliceRecentHours`)는 계측 slice의 것이라 여기서 부르지 않는다.
 *
 * **빈 계열은 빈 계열로 넘긴다.** 첫 응답 전(`pending`)에 내장값으로 메우면 답이 아닐 수 있는
 * 값이 답의 자리에 앉는다 — 그 상태는 화면이 먼저 가른다.
 */
export function toMeasuredSeries(window: readonly SeriesSample[]): MeasuredSeries {
  const empty = () => [] as ForecastPoint[];
  const series = Object.fromEntries(
    FORECAST_SERIES_CODES.map((code) => [code, empty()]),
  ) as MeasuredSeries;

  for (const sample of window) {
    for (const code of FORECAST_SERIES_CODES) {
      series[code].push({ t: sample.t, value: sample[code] });
    }
  }

  return series;
}
