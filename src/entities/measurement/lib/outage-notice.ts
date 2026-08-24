import { formatDateTime } from '@/shared/lib/format';

/**
 * 결측을 **어떻게 그렸는지** 알린다.
 *
 * 결측 구간 자체는 차트가 끊긴 선으로 이미 보인다(E4). 이 문구가 답하는 것은
 * "왜 비어 있는가"이며, 0으로 채우지 않았다는 사실을 밝히는 것이 목적이다.
 * 통합 관제와 시계열 두 화면이 같은 문구를 쓴다 — 각자 쓰면 같은 결측을 다르게 설명한다.
 */
export function outageNotice(
  online: boolean,
  outage: { fromIso: string; toIso: string } | null,
): string {
  if (!online) {
    return 'ECP 통신이 두절되어 수신값이 없습니다. 결측은 0으로 채우지 않고 비워 둡니다.';
  }
  if (outage) {
    return `${formatDateTime(outage.fromIso)}–${formatDateTime(outage.toIso)} 구간은 통신 두절로 수신값이 없습니다. 결측은 0으로 채우지 않고 끊어서 표시합니다.`;
  }
  return '조회 구간에 결측이 없습니다.';
}
