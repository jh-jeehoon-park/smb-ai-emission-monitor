import { PROVISIONAL_STALE_SAMPLES } from '@/shared/config/provisional';
import type { Reading } from '../model/types';

/**
 * 지금 수신이 끊겨 있는가.
 *
 * **마지막 한 칸이 비었다고 두절이 아니다.** 격자의 가장 최근 칸은 그 시각의 표본이 아직
 * 도착하지 않은 순간이 늘 있다 — fixture는 모든 칸을 채우므로 드러나지 않았지만, 계측 서버를
 * 붙이자 정상 수신 중인 사업장 여덟 항목에 전부 `수신 없음`이 붙었다(값은 멀쩡히 8.31인데).
 *
 * 계측 API 명세 §4.5가 비활성 판정을 **수집 주기 × 3**으로 두므로 같은 기준을 쓴다.
 *
 * 전 구간이 결측인 사업장도, 꼬리에 걸친 두절도 그대로 참이 된다 — 좁힌 것은 **한 칸짜리
 * 깜빡임**뿐이다.
 */
export function isReceptionStalled(values: readonly Reading[]): boolean {
  const tail = values.slice(-PROVISIONAL_STALE_SAMPLES);
  return tail.length > 0 && tail.every((value) => value === null);
}
