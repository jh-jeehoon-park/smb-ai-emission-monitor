/** slice Public API — 바깥에서는 이 파일만 import 한다(FSD §6) */
export { AnomalyView } from './ui/anomaly-view';
/* 관내 감독 화면이 같은 패널을 쓴다 — 판정 로직이 갈리지 않게 부품을 나눈다 */
export { IDLE_DISCHARGE_NOTE, IdleDischargePanel } from './ui/idle-discharge-panel';
