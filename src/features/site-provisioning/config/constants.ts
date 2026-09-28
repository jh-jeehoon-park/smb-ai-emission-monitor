import { STORAGE_KEYS } from '@/shared/config/storage';

/* 표기 낱말은 `shared`가 갖는다 — CSV 생성기(`entities`)도 같은 말을 써야 한다(FSD §8) */
export { ABSENT_ITEM_LABEL, ABSENT_ITEM_REASON } from '@/shared/config/absent-item';

export const SITE_PROVISIONING_STORAGE_KEY = STORAGE_KEYS.siteProvisioning;

/**
 * 계측 구성 폼이 제목 옆 툴팁에 다는 말.
 *
 * **항목을 감추지 않는다**(**A2**). 8종은 어느 사업장에서나 화면에 서고, 보유하지 않은 것은
 * 자리를 지킨 채 「미설치」라 적는다 — 카드가 사라지면 그 항목을 재지 않는다는 사실 자체가
 * 화면에서 없어진다.
 */
export const INSTRUMENT_FORM_NOTE =
  '사업장마다 설치한 계측기가 다릅니다. 여기서 끈 항목은 화면에서 사라지지 않고 「미설치」로 표시됩니다 — 값이 오지 않는 것과 구분하기 위해서입니다.';

/**
 * 설비 전력 계측 폼이 제목 옆 툴팁에 다는 말.
 *
 * **아직 정해진 것이 없다는 사실을 밝힌다.** 기본으로 아무것도 켜 두지 않는 이유이기도 하다 —
 * 켜 두면 이미 정해진 것처럼 보이고, 그것이 곧 설치 범위와 비용이 된다(**X2**).
 */
export const METERING_FORM_NOTE =
  '어느 설비의 전력을 잴지는 현장조사가 우리 몫으로 남겨 둔 결정입니다. 다섯 실증 사업장 모두 기존 전력량계로는 데이터를 읽을 수 없어, 여기서 고른 설비가 통신형 계기를 다는 대상이 됩니다. 설비 목록 자체는 현장이 정하므로 여기서 바꾸지 않습니다.';
