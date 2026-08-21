/** slice Public API — 바깥에서는 이 파일만 import 한다(FSD §6) */
export {
  ForecastChart,
  ForecastEmpty,
  ForecastHorizonNote,
  ForecastLegend,
  ForecastLimitNote,
} from './ui/forecast-chart';
export { COMPACT_HEIGHT, FULL_HEIGHT } from './config/constants';
