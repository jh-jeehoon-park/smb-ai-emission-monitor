import type { SupervisionRow } from './supervision-rows';

/**
 * 「기준 초과」 칸이 **무엇을 적을지** 고른다.
 *
 * **숫자를 주 칸에서 치우지 않는다** `[사용자 지적 2026-09-28: 라벨이 중요한 것이 아님 ·
 * 회의에서 가능 유무를 판별한다]`. 한때 법정 초과만 주 칸에 세고 시연 임계 초과는 보조줄로
 * 내렸는데, 지금 법정 근거가 있는 항목은 **pH 하나뿐**이라 시연 임계 3건인 사업장이
 * 주 칸에 **`0건`**을 적었다 — 표를 훑는 사람에게 그것은 «문제 없음»이다.
 *
 * 값이 튄 사실은 **숫자로** 적고, 그것이 법정 판정이 아니라는 사실은 **색과 한 줄**이 맡는다.
 */
export function overLimitCell(row: SupervisionRow): {
  value: number | null;
  note: string | null;
  tone: 'critical' | 'caution';
} {
  const legal = row.overLimit;
  const demo = row.overProvisional;

  /* 법정 초과가 실제로 있으면 그것이 주 숫자다 — 가장 무거운 사실이다 */
  if (legal !== null && legal > 0) {
    return { value: legal, note: demo ? `시연 임계 ${demo}건 별도` : null, tone: 'critical' };
  }
  /* 법정은 깨끗하지만 시연 임계가 튀었다 — 숫자를 보이되 법정 판정이 아님을 적는다 */
  if (demo !== null && demo > 0) {
    return { value: demo, note: '시연 임계 — 법정 판정 아님', tone: 'caution' };
  }
  /* 둘 다 0이면 «확인했더니 없었다», 둘 다 `null`이면 «확인할 수 없었다»(E4) */
  return { value: legal ?? demo, note: null, tone: 'critical' };
}
