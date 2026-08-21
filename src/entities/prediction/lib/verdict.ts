import { STATUS_VISUAL, statusInk } from '@/shared/config/status-visual';
import type { TrendEstimate } from '../model/types';

export interface TrendVerdict {
  text: string;
  /** 색이 없으면 `undefined` — 중립면에 둔다는 뜻이다 */
  ink: string | undefined;
  /** 어느 근거로 판정했는가. 화면이 이것을 함께 적어야 판정의 출처가 드러난다(E3) */
  basis: string;
}

/**
 * 카드가 무엇을 말할 수 있는가 — **축은 기준치 하나다** `[사용자 지적 2026-08-21]`.
 *
 * 1. 값이 없으면 **아무 판정도 하지 않는다**
 * 2. 그 사업장 기준치가 있으면 **기준보다 높음 / 낮음**
 * 3. 없으면 **무엇을 설정해야 하는지** 적는다
 *
 * **시간 축으로 대체하지 않는다.** 한때 기준치가 없을 때 `직전 3시간보다 높음`(계열 자기 분포
 * 대비)으로 떨어뜨렸는데, 요구는 *기준치보다* 높고 낮음이었다 — 시간 대비를 판정 자리에 놓으면
 * 화면이 묻지 않은 것을 답한다. 기준치는 지역·사업장마다 다르고 그 값 자체가 모니터링 대상이다
 * `[회의 2026-08-20]`.
 *
 * **값 없음을 가장 먼저 본다.** `isOverLimit`은 "값이 없다"와 "기준이 없다"를 같은 `null`로
 * 내므로, 기준 유무를 먼저 보면 통신이 두절된 사업장이 기준 판정을 주장한다.
 *
 * **`over`와 사유를 인자로 받는다.** 기준표는 사업장 설정(feature)에서 오므로 entity가 알 수
 * 없다 — `hasLimit(code, table)`이 표를 인자로 받아 순수하게 남은 것과 같은 구조다.
 *
 * entity에 두는 이유는 **세 화면이 같은 답을 내야** 하기 때문이다. 위젯마다 이 분기를 갖고
 * 있던 동안 통합 관제는 농도를 찍고 TOC를 `AI 추정`이라 적었다.
 */
export function trendVerdict(
  trend: TrendEstimate,
  over: boolean | null,
  /** 왜 아직 판정할 수 없는가. 사업장 분류 미설정과 항목값 미입력은 **할 일이 다르다** */
  unresolvedReason?: string | null,
): TrendVerdict {
  if (trend.value === null) {
    return { text: '수신 없음', ink: undefined, basis: '통신 두절로 산출 중단' };
  }

  if (over !== null) {
    return {
      text: `기준보다 ${over ? '높음' : '낮음'}`,
      ink: over ? statusInk(STATUS_VISUAL.critical) : undefined,
      basis: '사업장이 설정한 기준치로 판정',
    };
  }

  return {
    text: '기준 미설정',
    ink: undefined,
    /* 무엇을 해야 하는지가 근거 자리에 온다 — 빈 칸으로 두면 값이 없는 것으로 읽힌다 */
    basis: unresolvedReason ?? '이 항목의 기준치가 입력되지 않았습니다 [TBD-45]',
  };
}
