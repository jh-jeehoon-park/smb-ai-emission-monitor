import { describe, expect, it } from 'vitest';
import type { SupervisionRow } from './supervision-rows';
import { overLimitCell } from './over-limit-cell';

/**
 * **숫자가 주 칸에서 사라지지 않는다**
 * `[사용자 지적 2026-09-28: 라벨이 중요한 것이 아님 · 회의에서 가능 유무를 판별한다]`.
 *
 * 이 화면은 **mock 데이터로 채워 회의에서 판별**한다. 표를 훑는 사람에게 주 칸의 숫자가
 * 곧 «봐야 할 사업장»이므로, 법정 근거가 없다는 이유로 그 자리를 `0건`으로 비우면
 * 값이 튄 사업장이 **깨끗한 사업장으로 읽힌다** — 지금 법정 근거가 있는 항목은 pH 하나뿐이라
 * 실제로 그렇게 됐다.
 */
const row = (overLimit: number | null, overProvisional: number | null) =>
  ({ overLimit, overProvisional }) as SupervisionRow;

describe('기준 초과 칸', () => {
  it('법정 초과가 있으면 그것이 주 숫자다', () => {
    expect(overLimitCell(row(2, 5))).toEqual({
      value: 2,
      note: '시연 임계 5건 별도',
      tone: 'critical',
    });
  });

  /** **이 줄이 이 파일의 이유다** — 한때 여기서 `0건`이 나왔다 */
  it('법정이 0이어도 시연 임계가 튀었으면 그 숫자를 적는다', () => {
    const cell = overLimitCell(row(0, 3));

    expect(cell.value).toBe(3);
    expect(cell.value).not.toBe(0);
    /* 법정 판정이 아니라는 사실은 색과 한 줄이 맡는다 */
    expect(cell.tone).toBe('caution');
    expect(cell.note).toContain('법정 판정 아님');
  });

  it('법정을 판정하지 못해도 시연 임계는 적는다', () => {
    expect(overLimitCell(row(null, 4)).value).toBe(4);
  });

  /** `0`은 «확인했더니 없었다», `null`은 «확인할 수 없었다» — 합치지 않는다(E4) */
  it('둘 다 없으면 0과 판정 불가를 가른다', () => {
    expect(overLimitCell(row(0, 0)).value).toBe(0);
    expect(overLimitCell(row(null, null)).value).toBeNull();
    expect(overLimitCell(row(0, 0)).note).toBeNull();
  });
});
