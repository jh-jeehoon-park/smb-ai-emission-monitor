import { describe, expect, it } from 'vitest';
import { MEASUREMENT_ITEMS, type MeasurementItemCode } from '@/shared/config/measurement';
import { SERIES_CODES } from '../config/constants';
import { isSeriesCode } from './series-code';

/**
 * **사전에는 계열 없는 항목이 섞여 있다.** 진동은 사양이 없고(`[TBD-49]`) 유입·유출은
 * 채널이 없다(`[TBD-52]`) — 둘 다 화면이 값 대신 상태를 적는다.
 *
 * 이 술어가 한때 **부정 목록**이었다(`code !== 'vibration' && …`). 그때는 계열 없는 항목을
 * 새로 등재하면 술어가 **참을 돌려주어** `MeasurementPoint`를 없는 키로 인덱싱했고
 * `undefined`가 조용히 흘렀다. 긍정 목록으로 바꾼 것을 여기서 못박는다 — 되돌리면 걸린다.
 */
describe('계열 유무 판정', () => {
  it('계열이 있는 항목은 전부 참이다', () => {
    SERIES_CODES.forEach((code) => {
      expect(isSeriesCode(code), code).toBe(true);
    });
  });

  /** 사전에 있으나 계열이 없는 것 — 하나라도 참이면 없는 키로 인덱싱한다 */
  it('계열이 없는 항목은 전부 거짓이다', () => {
    const codes = Object.keys(MEASUREMENT_ITEMS) as MeasurementItemCode[];
    const seriesless = codes.filter((code) => !(SERIES_CODES as MeasurementItemCode[]).includes(code));

    expect(seriesless).toEqual(['vibration', 'TN', 'TP']);
    seriesless.forEach((code) => {
      expect(isSeriesCode(code), code).toBe(false);
    });
  });

  /**
   * **새 항목은 기본적으로 제외돼야 한다.** 사전에만 있고 `SERIES_CODES`에 없는 코드를
   * 넣었을 때 참이 나오면 그 술어는 부정 목록으로 되돌아간 것이다.
   */
  it('사전에 없는 코드도 거짓이다 — 목록에 있는 것만 참이다', () => {
    expect(isSeriesCode('nonexistent' as MeasurementItemCode)).toBe(false);
  });
});
